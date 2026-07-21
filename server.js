// ============================================================================
// Node.js VPS 服务器入口 — 将 Cloudflare Worker 代理逻辑运行在 VPS 上
//
// 用法:
//   PROXY_DOMAIN=your.domain.com node server.js
//   # 或使用默认值运行
//   node server.js
//
// 环境变量:
//   PROXY_DOMAIN    — 你的代理域名 (默认: localhost)
//   PROXY_PROTOCOL  — http 或 https (默认: https)
//   PORT            — 监听端口 (默认: 8443)
// ============================================================================

import http from 'node:http';
import { Readable } from 'node:stream';
import { setProxyConfig, handleRequest } from './_worker.js';

// 强制 Node.js fetch 优先 IPv4（undici 的 DNS 不读 /etc/gai.conf）
// 等效于命令行 --dns-result-order=ipv4first
import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first');
// ============================================================================
// 防止未捕获的 Promise 拒绝导致进程退出（Node.js 15+ 默认会终止进程）
// ============================================================================
process.on('unhandledRejection', (err) => {
  console.error('[FATAL] Unhandled rejection:', err?.message || err);
});
// ============================================================================
// 配置
// ============================================================================
const PORT = parseInt(process.env.PORT || '8443', 10);
const PROXY_DOMAIN = process.env.PROXY_DOMAIN || 'localhost';
const PROXY_PROTOCOL = process.env.PROXY_PROTOCOL || 'https';

// PROXY_URL / PROXY_HOST 控制外部访问地址（注入客户端的代理前缀）
// 默认不带端口，适用于标准 80/443 或反向代理（Cloudflare/nginx）
// 直连 IP:端口 或非标准端口时，通过环境变量覆盖：
//   PROXY_URL=http://1.2.3.4:8443/  PROXY_HOST=1.2.3.4:8443
const PROXY_URL = process.env.PROXY_URL || `${PROXY_PROTOCOL}://${PROXY_DOMAIN}/`;
const PROXY_HOST = process.env.PROXY_HOST || PROXY_DOMAIN;

// 设置全局变量（部署到 VPS 后域名是固定的，只需设置一次）
setProxyConfig(PROXY_URL, PROXY_HOST);

console.log(`[config] Proxy URL:  ${PROXY_URL}`);
console.log(`[config] Proxy Host: ${PROXY_HOST}`);

// ============================================================================
// Polyfill: Headers.getAll('Set-Cookie')
//
// Cloudflare Workers 支持 headers.getAll('Set-Cookie') 返回数组，
// 但 Node.js 的 Headers 没有这个方法。_worker.js 内部有 try-catch 兜底，
// 但兜底方案无法正确处理多个 Set-Cookie 头（逗号合并导致日期被破坏）。
// 这里提供一个正确的 polyfill。
// ============================================================================
if (!Headers.prototype.getAll) {
  Headers.prototype.getAll = function getAll(name) {
    const values = [];
    // Headers 迭代器按照 Fetch 规范会逐个返回 Set-Cookie 的值（不会逗号合并）
    for (const [key, value] of this) {
      if (key.toLowerCase() === name.toLowerCase()) {
        values.push(value);
      }
    }
    return values;
  };
}

// ============================================================================
// HTTP 服务器
// ============================================================================
const server = http.createServer(async (nodeReq, nodeRes) => {
  const startTime = Date.now();

  try {
    // ---- 1. 读取请求体 ----
    const bodyChunks = [];
    for await (const chunk of nodeReq) {
      bodyChunks.push(chunk);
    }
    const rawBody = Buffer.concat(bodyChunks);

    // ---- 2. 构建 Web API Request 对象 ----
    // Cloudflare 在 Flexible 模式下会发 X-Forwarded-Proto: https
    // 我们需要用它来正确判断 scheme，否则 thisProxyServerUrlHttps 会被设为 http://
    const forwardedProto = nodeReq.headers['x-forwarded-proto'] || PROXY_PROTOCOL;
    const scheme = (forwardedProto === 'https' || PROXY_PROTOCOL === 'https') ? 'https' : 'http';
    const url = new URL(nodeReq.url, `${scheme}://${nodeReq.headers.host || PROXY_DOMAIN}`);

    const requestInit = {
      method: nodeReq.method,
      headers: nodeReq.headers,
    };

    // 只有支持请求体的方法才传入 body
    if (nodeReq.method !== 'GET' && nodeReq.method !== 'HEAD' && rawBody.length > 0) {
      // 传入 Buffer 会被视为二进制数据，New Request() 会将其转为 ReadableStream
      requestInit.body = rawBody;
    }

    const webRequest = new Request(url, requestInit);

    // ---- 3. 调用 worker 核心处理逻辑 ----
    const webResponse = await handleRequest(webRequest);

    // ---- 4. 将 Web API Response 转回 Node.js 响应 ----
    nodeRes.statusCode = webResponse.status;

    // 收集 Set-Cookie（迭代器会逐个返回值，不会逗号合并）
    const setCookies = [];
    for (const [key, value] of webResponse.headers) {
      if (key.toLowerCase() === 'set-cookie') {
        setCookies.push(value);
      } else {
        nodeRes.setHeader(key, value);
      }
    }
    if (setCookies.length > 0) {
      nodeRes.setHeader('Set-Cookie', setCookies);
    }

    // ---- 5. 流式传输响应体 ----
    if (webResponse.body) {
      const nodeStream = Readable.fromWeb(webResponse.body);
      nodeStream.on('error', (err) => {
        console.error(`[STREAM ERROR] ${nodeReq.method} ${nodeReq.url}:`, err.message);
        nodeRes.destroy(err);
      });
      nodeStream.pipe(nodeRes);
    } else {
      nodeRes.end();
    }
  } catch (err) {
    console.error(`[ERROR] ${nodeReq.method} ${nodeReq.url}:`, err.message);
    if (!nodeRes.headersSent) {
      nodeRes.statusCode = 500;
      nodeRes.setHeader('Content-Type', 'text/plain; charset=utf-8');
      nodeRes.end('Internal Server Error');
    }
  }

  // 请求日志
  const duration = Date.now() - startTime;
  console.log(
    `[${new Date().toISOString()}] ${nodeReq.method} ${nodeReq.url} → ${nodeRes.statusCode} (${duration}ms)`
  );
});

// ============================================================================
// 启动
// ============================================================================
server.listen(PORT, () => {
  console.log(`[server] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[server] Point your domain (${PROXY_DOMAIN}) via Cloudflare DNS to this server's IP.`);
  console.log(`[server] Use nohup, pm2, or systemd to keep it running in background.`);
});

// 优雅关闭
function shutdown(signal) {
  console.log(`\n[server] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('[server] All connections closed, exiting.');
    process.exit(0);
  });
  // 30 秒后强制退出
  setTimeout(() => {
    console.error('[server] Forced exit after timeout.');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
