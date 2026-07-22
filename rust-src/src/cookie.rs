
pub fn get_cookie_value(cookie: &str, name: &str) -> Option<String> {
    for part in cookie.split(';') {
        let p = part.trim();
        if let Some((k, v)) = p.split_once('=') {
            if k.trim() == name {
                return Some(v.trim().to_string());
            }
        }
    }
    None
}

pub fn check_pwd(cookie: &str, name: &str, pwd: &str) -> bool {
    let result = get_cookie_value(cookie, name).as_deref() == Some(pwd);
    println!("[check_pwd] result={}", result);
    result
}

pub fn strip_cookies(cookie: &str, names: &[&str]) -> Option<String> {
    let v: Vec<&str> = cookie.split(';')
        .map(|s| s.trim())
        .filter(|p| !names.iter().any(|n| p.starts_with(&format!("{}=", n))))
        .collect();
    if v.is_empty() { None } else { Some(v.join("; ")) }
}

/// Set-Cookie 重写 — 对齐 JS handleCookieHeader
/// JS: Path = "/" + new URL(originalPath, actualUrlStr).href
///     Domain = thisProxyServerUrl_hostOnly
///     （JS 不删除 Secure）
pub fn rewrite_cookie(cookie: &str, proxy_host: &str, target_url: &str) -> String {
    let mut parts: Vec<String> = cookie.split(';').map(|s| s.trim().to_string()).collect();

    // 1. 处理 Path — 对齐 JS
    //    JS: originalPath = pathIndex !== -1 ? parts[pathIndex].substring(5) : undefined
    //        absolutePath = "/" + new URL(originalPath, actualUrlStr).href
    //    当 originalPath 为 undefined 时，new URL(undefined, base) 解析为 base/undefined
    let path_index = parts.iter().position(|p| p.to_lowercase().starts_with("path="));
    let original_path = path_index.map(|idx| parts[idx]["path=".len()..].to_string());

    let resolved_path = if let Some(op) = &original_path {
        // 有 Path：对齐 JS new URL(originalPath, actualUrlStr).href
        if let Ok(base) = url::Url::parse(target_url) {
            if let Ok(resolved) = base.join(op) {
                format!("/{}", resolved.as_str())
            } else {
                format!("/{}", op)
            }
        } else {
            format!("/{}", op)
        }
    } else {
        // 无 Path：对齐 JS new URL(undefined, actualUrlStr).href
        // JS 中 undefined 被当作相对路径 "undefined" 解析
        if let Ok(base) = url::Url::parse(target_url) {
            if let Ok(resolved) = base.join("undefined") {
                format!("/{}", resolved.as_str())
            } else {
                format!("{}/undefined", target_url)
            }
        } else {
            format!("{}/undefined", target_url)
        }
    };

    if let Some(idx) = path_index {
        parts[idx] = format!("Path={}", resolved_path);
    } else {
        parts.push(format!("Path={}", resolved_path));
    }

    // 2. 处理 Domain — 对齐 JS：仅当存在时才改写
    //    JS: if (domainIndex !== -1) { parts[domainIndex] = "domain=" + thisProxyServerUrl_hostOnly; }
    let domain_index = parts.iter().position(|p| p.to_lowercase().starts_with("domain="));
    if let Some(idx) = domain_index {
        parts[idx] = format!("domain={}", proxy_host);
    }

    // 3. 删除 Secure — 对齐 JS：代理可能走 HTTP，Secure 会导致浏览器丢弃
    //    JS 在 handleCookieHeader 中明确删除 Secure 标记
    parts.retain(|p| {
        let lower = p.to_lowercase();
        lower != "secure"
    });

    parts.join("; ")
}
