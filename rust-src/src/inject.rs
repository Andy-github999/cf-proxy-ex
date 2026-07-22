use axum::http::HeaderMap;

use crate::AppState;

/// 脚本注入 — 对齐 JS
pub fn inject_scripts(html: &str, _state: &AppState, req_headers: &HeaderMap) -> String {
    // 对齐 JS hasProxyHintCook
    let has_hint_cookie = req_headers.get("cookie")
        .and_then(|v| v.to_str().ok())
        .map(|c| c.contains("__PROXY_HINT__="))
        .unwrap_or(false);
    let script = injection_script(html.as_bytes(), has_hint_cookie);
    script
}

fn injection_script(body_bytes: &[u8], has_hint_cookie: bool) -> String {
    use base64::Engine;
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::io::Write;

    // gzip 压缩 + base64 编码（客户端用 pako 解压）
    let mut encoder = GzEncoder::new(Vec::new(), Compression::best());
    encoder.write_all(body_bytes).expect("gzip write");
    let compressed = encoder.finish().expect("gzip finish");
    let encoded = base64::engine::general_purpose::STANDARD.encode(&compressed);

    // 拼接 JS 模块文件（按顺序，在 inject-js/ 目录下）
    let mut s = String::new();
    s.push_str(include_str!("inject-js/00_header.js"));
    if !has_hint_cookie {
        s.push_str(include_str!("inject-js/01_proxy_hint.js"));
    }
    s.push_str(include_str!("inject-js/02_init.js"));
    s.push_str(include_str!("inject-js/03_utils.js"));
    s.push_str(include_str!("inject-js/04_network.js"));
    s.push_str(include_str!("inject-js/05_window_open.js"));
    s.push_str(include_str!("inject-js/06_append_child.js"));
    s.push_str(include_str!("inject-js/07_element_props.js"));
    s.push_str(include_str!("inject-js/08_location.js"));
    s.push_str(include_str!("inject-js/09_form_submit.js"));
    s.push_str(include_str!("inject-js/10_history.js"));
    s.push_str(include_str!("inject-js/11_observer.js"));
    s.push_str(include_str!("inject-js/12_bootstrap.js"));
    s.push_str(include_str!("inject-js/13_pako.js"));
    s.push_str(include_str!("inject-js/13_parse_insert.js"));
    s.push_str(include_str!("inject-js/14_footer.js"));

    // 模板变量替换
    s = s
        .replace("__ORIGINAL_BODY_BASE64__", &encoded)
        .replace("${replaceUrlObj}", "__location__yproxy__")
        .replace("${htmlCovPathInjectFuncName}", "parseAndInsertDoc");

    s
}
