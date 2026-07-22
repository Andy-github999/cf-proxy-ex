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
    let tpl = include_str!("inject_template.js");
    // 对齐 JS: new TextEncoder().encode(bd) → 逗号分隔的字节数组
    let bytes_str: String = body_bytes.iter().map(|b| b.to_string()).collect::<Vec<_>>().join(",");
    let mut s = tpl
        .replace("__ORIGINAL_BODY_BASE64__", &bytes_str)
        // 对齐 JS 模板变量: const replaceUrlObj = "__location__yproxy__"
        .replace("${replaceUrlObj}", "__location__yproxy__")
        // 对齐 JS 模板变量: const htmlCovPathInjectFuncName = "parseAndInsertDoc"
        .replace("${htmlCovPathInjectFuncName}", "parseAndInsertDoc");
    // 对齐 JS: hasProxyHintCook 时不注入提示横幅
    if has_hint_cookie {
        if let (Some(start), Some(end)) = (s.find("//__PROXY_HINT_BLOCK_START__"), s.find("//__PROXY_HINT_BLOCK_END__")) {
            let end_full = end + "//__PROXY_HINT_BLOCK_END__".len();
            s.replace_range(start..end_full, "");
            println!("[inject] removed proxy hint block (has __PROXY_HINT__ cookie)");
        }
    } else {
        s = s.replace("//__PROXY_HINT_BLOCK_START__\n", "").replace("//__PROXY_HINT_BLOCK_END__\n", "");
    }
    s
}
