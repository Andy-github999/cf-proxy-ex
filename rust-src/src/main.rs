use axum::{routing::any, Router};
use clap::Parser;
use std::net::SocketAddr;
use std::sync::Arc;
mod cookie;
mod rewrite;
mod inject;
mod proxy;
use proxy::handle_request;

// ============================================================================
// CLI 配置（支持环境变量覆盖）
// ============================================================================
#[derive(Parser, Debug, Clone)]
#[command(name = "cf-proxy-ex", version = "0.1.0")]
struct Args {
    /// 监听地址
    #[arg(long, default_value = "::")]
    bind: String,

    /// 监听端口（默认 2096，CF 回源常用端口）
    #[arg(long, default_value = "2096", env = "PROXY_PORT")]
    port: u16,

    /// 访问密码（也支持 PROXY_PASSWORD 环境变量）
    #[arg(long, default_value = "", env = "PROXY_PASSWORD")]
    password: String,

    /// 代理域名（外部访问域名， 如 site2.example.com）
    #[arg(long, default_value = "", env = "PROXY_DOMAIN")]
    proxy_domain: String,

    /// 代理协议（http 或 https，默认 https）
    #[arg(long, default_value = "", env = "PROXY_PROTOCOL")]
    proxy_protocol: String,

    /// 完整代理 URL（覆盖自动构造，如 https://site2.example.com/）
    #[arg(long, default_value = "", env = "PROXY_URL")]
    proxy_url: String,

    /// 代理 Host（覆盖自动构造，如 site2.example.com）
    #[arg(long, default_value = "", env = "PROXY_HOST")]
    proxy_host: String,

    /// TLS 证书文件路径（PEM 格式，如 Cloudflare Origin 证书）
    #[arg(long, default_value = "origin.crt", env = "ORIGIN_CERT")]
    origin_cert: String,

    /// TLS 私钥文件路径（PEM 格式）
    #[arg(long, default_value = "origin.key", env = "ORIGIN_KEY")]
    origin_key: String,
}

// ============================================================================
// 状态
// ============================================================================
struct AppState {
    args: Args,
    client: reqwest::Client,
    password_cookie: String,
    hint_cookie: String,
    visit_cookie: String,
    replace_url: String,
    /// 固定代理前缀（来自配置或自动构造），如 "https://site2.example.com/"
    proxy_url: String,
    /// 固定代理 host（来自配置），如 "site2.example.com"
    proxy_host: String,
}

// ============================================================================
// 主函数
// ============================================================================
fn main() {
    // 手动指定 rustls crypto provider（交叉编译 + musl 下自动检测可能失败）
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("failed to install rustls crypto provider");

    tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(async {
            run().await;
        });
}

async fn run() {
    let args = Args::parse();
    let client = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(std::time::Duration::from_secs(30))
        .connect_timeout(std::time::Duration::from_secs(10))
        // 连接池：最多保持 50 个空闲连接，每个 host 最多 10 个，空闲 90 秒后关闭
        .pool_max_idle_per_host(10)
        .pool_idle_timeout(std::time::Duration::from_secs(90))
        .build()
        .expect("Failed to build HTTP client");
    // 计算固定代理前缀（对齐 Node.js server.js 逻辑）
    let proxy_url = if !args.proxy_url.is_empty() {
        args.proxy_url.clone()
    } else if !args.proxy_domain.is_empty() {
        let proto = if !args.proxy_protocol.is_empty() { &args.proxy_protocol } else { "https" };
        format!("{}://{}/", proto, args.proxy_domain)
    } else {
        String::new()  // 空则从请求头动态计算
    };

    let proxy_host = if !args.proxy_host.is_empty() {
        args.proxy_host.clone()
    } else if !args.proxy_domain.is_empty() {
        args.proxy_domain.clone()
    } else {
        String::new()
    };

    if !proxy_url.is_empty() {
        println!("[config] Proxy URL:  {}", proxy_url);
        println!("[config] Proxy Host: {}", proxy_host);
    }

    let state = Arc::new(AppState {
        args: args.clone(),
        client,
        password_cookie: "__PROXY_PWD__".into(),
        hint_cookie: "__PROXY_HINT__".into(),
        visit_cookie: "__PROXY_VISITEDSITE__".into(),
        replace_url: "__location__yproxy__".into(),
        proxy_url: proxy_url.clone(),
        proxy_host: proxy_host.clone(),
    });

    let app = Router::new()
        .route("/*path", any(handle_request))
        .with_state(state);

    let bind_ip: std::net::IpAddr = args.bind.parse().expect("Invalid bind address");
    let addr = SocketAddr::new(bind_ip, args.port);

    let use_tls = std::path::Path::new(&args.origin_cert).exists()
        && std::path::Path::new(&args.origin_key).exists();

    if use_tls {
        use axum_server::tls_rustls::RustlsConfig;
        let tls_config = RustlsConfig::from_pem_file(&args.origin_cert, &args.origin_key)
            .await
            .expect("Failed to load TLS cert/key");
        println!("[server] TLS enabled (cert={}, key={})", args.origin_cert, args.origin_key);
        println!("[server] Listening on https://{}", addr);
        axum_server::bind_rustls(addr, tls_config)
            .serve(app.into_make_service())
            .await
            .unwrap();
    } else {
        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => l,
            Err(e) => {
                eprintln!("[FATAL] bind {} failed: {}", addr, e);
                std::process::exit(1);
            }
        };
        println!("[server] Listening on http://{}", addr);
        axum::serve(listener, app).await.unwrap();
    }
}

