use encoding_rs::{Encoding, UTF_8};
use regex::Regex;
use std::sync::LazyLock;

// ============================================================================
// 预编译正则（避免每次请求重复编译）
// ============================================================================
static RE_CHARSET: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)charset=[^\s;]+").unwrap());
static RE_LOC_DECL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\b(var|let|const|function)\s+(location)\s*=").unwrap());
static RE_LOC_EQUALS: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"location\s*=").unwrap());
static RE_EQ_LOCATION: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"=\s*location").unwrap());
static RE_URLS: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"https?://[^\s'"]+"#).unwrap());
static RE_META_CHARSET: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)charset\s*=\s*["']?\s*([^\s"';>]+)"#).unwrap());

// ============================================================================
// 重定向 Location 重写 — 对齐 JS
// ============================================================================
pub fn rewrite_redirect_location(location: &str, target_url: &str) -> String {
    println!("[rewrite_redirect] location={:?} target_url={:?}", location, target_url);

    // 已经是 /https://... 或 /http://... 格式，直接返回
    if location.starts_with("/http://") || location.starts_with("/https://") {
        return location.to_string();
    }

    // 对齐 JS: new URL(location, actualUrlStr).href
    if let Ok(base) = url::Url::parse(target_url) {
        if let Ok(resolved) = base.join(location) {
            let absolute = resolved.as_str().to_string();
            println!("[rewrite_redirect] resolved -> absolute: {}", absolute);
            return format!("/{}", absolute);
        }
    }

    eprintln!("[rewrite_redirect] WARNING: failed to resolve, using raw");
    format!("/{}", location)
}

// ============================================================================
// Content-Type charset 修复 — 对齐 JS
// JS: if (includes("charset")) replace(/charset=([^\s;]+)/i, "charset=utf-8")  [仅第一个]
//     else if (includes("text/") || includes("application/javascript")) += "; charset=utf-8"
// ============================================================================
pub fn fix_content_type_charset(content_type: &str) -> String {
    let ct_lower = content_type.to_lowercase();
    if ct_lower.contains("charset") {
        // 对齐 JS: replace（仅第一个匹配），不是 replace_all
        let re = &RE_CHARSET;
        re.replace(content_type, "charset=utf-8").to_string()
    } else if ct_lower.contains("text/") || ct_lower.contains("application/javascript") {
        format!("{}; charset=utf-8", content_type)
    } else {
        content_type.to_string()
    }
}

// ============================================================================
// 文本替换 — location 相关 — 对齐 JS
// ============================================================================
pub fn rewrite_text(text: &str, replace_url: &str, ct_has_html: bool) -> String {
    let mut s = text.to_string();

    // 第一组（contentType 含 html 或 javascript）— 对齐 JS
    for &(from, to) in &[
        ("window.location", format!("window.{}", replace_url).as_str()),
        ("document.location", format!("document.{}", replace_url).as_str()),
        ("location.href", format!("{}.href", replace_url).as_str()),
        ("location.replace(", format!("{}.replace(", replace_url).as_str()),
        ("location.assign(", format!("{}.assign(", replace_url).as_str()),
    ] {
        if s.contains(from) {
            let n = s.matches(from).count();
            s = s.replace(from, to);
            println!("[rewrite] replaced {} ({} occ)", from, n);
        }
    }

    // 第二组（contentType 含 html）— 对齐 JS
    // 注意：JS 用 contentType.includes("html")，不是 isHTML
    if ct_has_html {
        for &(from, to) in &[
            ("top.location", format!("window.{}", replace_url).as_str()),
            ("self.location", format!("window.{}", replace_url).as_str()),
            ("parent.location", format!("window.{}", replace_url).as_str()),
        ] {
            if s.contains(from) {
                let n = s.matches(from).count();
                s = s.replace(from, to);
                println!("[rewrite] html replaced {} ({} occ)", from, n);
            }
        }

        // 对齐 JS: 保护 var/let/const/function location = 声明
        let loc_decl_re = &RE_LOC_DECL;
        let mut protected_locs: Vec<String> = Vec::new();
        let mut idx = 0;
        s = loc_decl_re.replace_all(&s, |caps: &regex::Captures| {
            let matched = caps.get(0).unwrap().as_str().to_string();
            protected_locs.push(matched);
            let placeholder = format!("___PROTECTED_LOC_DECL_{}___", idx);
            idx += 1;
            placeholder
        }).to_string();
        if idx > 0 {
            println!("[rewrite] protected {} location declarations", idx);
        }

        // 对齐 JS: /(?<![.\w])location\s*=(?!=)/g → window.{replaceUrl} =
        let n = replace_bare_location_inplace(&mut s, replace_url);
        if n > 0 {
            println!("[rewrite] replaced bare location= x{}", n);
        }

        // 对齐 JS: /(=\s*)location(?!\s*\(|[.\w])/g → $1window.{replaceUrl}
        let n = replace_eq_location_inplace(&mut s, replace_url);
        if n > 0 {
            println!("[rewrite] replaced = location x{}", n);
        }

        // 恢复受保护的声明
        for (i, decl) in protected_locs.iter().enumerate() {
            let placeholder = format!("___PROTECTED_LOC_DECL_{}___", i);
            s = s.replace(&placeholder, decl);
        }
    }

    s
}

/// 替换裸 `location =` — 对齐 JS /(?<![.\w])location\s*=(?!=)/g
/// 前面不能是 . 或 word char，后面不能是 =
pub fn replace_bare_location_inplace(text: &mut String, replace_url: &str) -> usize {
    let re = &RE_LOC_EQUALS;
    let replacement = format!("window.{} =", replace_url);

    let mut results: Vec<(usize, usize)> = Vec::new();
    for m in re.find_iter(text) {
        let start = m.start();
        let end = m.end();
        // 对齐 JS (?<![.\w])：前面不能是 . 或 word char
        if start > 0 {
            let prev = text.as_bytes()[start - 1];
            if prev.is_ascii_alphanumeric() || prev == b'.' || prev == b'_' {
                continue;
            }
        }
        // 对齐 JS (?!=)：后面不能是 =
        let rest = &text[end..];
        if rest.starts_with('=') {
            continue;
        }
        results.push((start, end));
    }

    let count = results.len();
    for (s_pos, e_pos) in results.into_iter().rev() {
        text.replace_range(s_pos..e_pos, &replacement);
    }
    count
}

/// 替换 `= location` — 对齐 JS /(=\s*)location(?!\s*\(|[.\w])/g
/// 后面不能是 ( 或 . 或 word char
pub fn replace_eq_location_inplace(text: &mut String, replace_url: &str) -> usize {
    let re = &RE_EQ_LOCATION;
    let replacement = format!("= window.{}", replace_url);

    let mut results: Vec<(usize, usize)> = Vec::new();
    for m in re.find_iter(text) {
        let start = m.start();
        let end = m.end();
        let rest = &text[end..];

        // 对齐 JS (?!\s*\()：后面不能是 ( 可选空白后
        let trimmed_rest = rest.trim_start();
        if trimmed_rest.starts_with('(') {
            continue;
        }
        // 对齐 JS (?![.\w])：后面不能是 . 或 word char（检查未 trim 的第一个字符）
        if !rest.is_empty() {
            let next = rest.as_bytes()[0];
            if next == b'.' || next.is_ascii_alphanumeric() || next == b'_' {
                continue;
            }
        }
        results.push((start, end));
    }

    let count = results.len();
    for (s_pos, e_pos) in results.into_iter().rev() {
        text.replace_range(s_pos..e_pos, &replacement);
    }
    count
}

/// 非 HTML 文本的 URL 正则替换 — 对齐 JS
/// JS: new RegExp(`(https?:\/\/[^\s'"]+)`, 'g')
/// 注意：JS 正则不排除 <>，Rust 之前错误地排除了 <>
pub fn rewrite_text_urls(text: &str, proxy_prefix: &str) -> String {
    let re = &RE_URLS;

    re.replace_all(text, |caps: &regex::Captures| {
        let matched = caps.get(0).unwrap().as_str();
        // 对齐 JS: 跳过 w3.org
        if matched.starts_with("http://www.w3.org/") || matched.starts_with("https://www.w3.org/") {
            return matched.to_string();
        }
        // 对齐 JS: thisProxyServerUrlHttps + match
        format!("{}{}", proxy_prefix, matched)
    }).to_string()
}

/// 检测文本编码 — 对齐 JS
/// JS: 1. 从 content-type header 的 charset= 提取
///     2. 如果是 text/html，从前 2KB 的 meta 标签提取
pub fn detect_charset(content_type: &str, body_bytes: &[u8]) -> &'static Encoding {
    // 1. 从 content-type header 提取 — 对齐 JS /charset=([^\s;]+)/i
    if let Some(m) = content_type.to_lowercase().find("charset=") {
        let rest = &content_type[m + 8..];
        let charset = rest.split(|c: char| c == ';' || c == ' ' || c == '"').next().unwrap_or("").trim();
        if !charset.is_empty() {
            if let Some(enc) = Encoding::for_label(charset.as_bytes()) {
                println!("[charset] detected from header: {} -> {:?}", charset, enc.name());
                return enc;
            }
        }
    }

    // 2. 从 HTML meta 标签检测 — 对齐 JS: 仅当 contentType.includes("text/html")
    //    JS: preview = decode(rawBytes.slice(0, 2048))
    //        metaMatch = preview.match(/charset\s*=\s*["']?\s*([^\s"';>]+)/i)
    if content_type.to_lowercase().contains("text/html") {
        let preview = String::from_utf8_lossy(&body_bytes[..body_bytes.len().min(2048)]);
        // 对齐 JS regex: /charset\s*=\s*["']?\s*([^\s"';>]+)/i
        let re = &RE_META_CHARSET;
        if let Some(caps) = re.captures(&preview) {
            let charset = caps.get(1).unwrap().as_str();
            if !charset.is_empty() {
                if let Some(enc) = Encoding::for_label(charset.as_bytes()) {
                    println!("[charset] detected from meta: {} -> {:?}", charset, enc.name());
                    return enc;
                }
            }
        }
    }

    println!("[charset] no charset detected, default UTF-8");
    UTF_8
}

// ============================================================================
// lol_html 元素级 URL 重写 — 对齐 JS parseAndInsertDoc → covToAbs
// 遍历 HTML 中所有 src/href/action 属性，添加代理前缀
// ============================================================================
pub fn rewrite_html_links(html: &str, proxy_url: &str, original_website: &str) -> String {
    use lol_html::{element, HtmlRewriter, Settings};

    let mut output = Vec::new();
    let mut rewriter = HtmlRewriter::new(
        Settings {
            element_content_handlers: vec![
                element!("*[href]", |el| {
                    if let Some(attr) = el.get_attribute("href") {
                        if let Some(rewritten) = rewrite_url_for_proxy(&attr, proxy_url, original_website) {
                            el.set_attribute("href", &rewritten).ok();
                        }
                    }
                    Ok(())
                }),
                element!("*[src]", |el| {
                    if let Some(attr) = el.get_attribute("src") {
                        if let Some(rewritten) = rewrite_url_for_proxy(&attr, proxy_url, original_website) {
                            el.set_attribute("src", &rewritten).ok();
                        }
                    }
                    Ok(())
                }),
                element!("form[action]", |el| {
                    if let Some(attr) = el.get_attribute("action") {
                        if let Some(rewritten) = rewrite_url_for_proxy(&attr, proxy_url, original_website) {
                            el.set_attribute("action", &rewritten).ok();
                        }
                    }
                    Ok(())
                }),
                element!("source[srcset]", |el| {
                    if let Some(attr) = el.get_attribute("srcset") {
                        if let Some(rewritten) = rewrite_url_for_proxy(&attr, proxy_url, original_website) {
                            el.set_attribute("srcset", &rewritten).ok();
                        }
                    }
                    Ok(())
                }),
            ],
            ..Settings::default()
        },
        |c: &[u8]| output.extend_from_slice(c),
    );

    rewriter.write(html.as_bytes()).ok();
    rewriter.end().ok();

    String::from_utf8(output).unwrap_or_else(|_| html.to_string())
}

/// 辅助：判断 URL 是否需要加代理前缀，返回重写后的 URL
pub fn rewrite_url_for_proxy(url: &str, proxy_url: &str, original_website: &str) -> Option<String> {
    // 跳过不需要代理的协议
    if url.starts_with("data:") || url.starts_with("mailto:") || url.starts_with("javascript:")
        || url.starts_with("chrome") || url.starts_with("edge") || url.starts_with("blob:")
    {
        return None;
    }

    // 已经包含代理前缀的跳过
    if url.starts_with(proxy_url) {
        return None;
    }

    // 只处理相对路径或绝对 http(s) URL
    if !url.starts_with('/') && !url.starts_with("http://") && !url.starts_with("https://") {
        return None;
    }

    // 拼接完整 URL（对齐 JS: new URL(relativePath, original_website_url_str).href）
    if let Ok(base) = url::Url::parse(original_website) {
        if let Ok(full) = base.join(url) {
            Some(format!("{}{}", proxy_url, full.as_str()))
        } else {
            Some(format!("{}{}", proxy_url, url))
        }
    } else {
        Some(format!("{}{}", proxy_url, url))
    }
}
