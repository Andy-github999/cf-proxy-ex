
//---***========================================***---通用func---***========================================***---
function changeURL(relativePath) {
    if (relativePath == null) return null;

    let relativePath_str = "";
    if (relativePath instanceof URL) {
        relativePath_str = relativePath.href;
    } else {
        relativePath_str = relativePath.toString();
    }


    try {
        if (relativePath_str.startsWith("data:") || relativePath_str.startsWith("mailto:") || relativePath_str.startsWith("javascript:") || relativePath_str.startsWith("chrome") || relativePath_str.startsWith("edge")) return relativePath_str;
    } catch {
        console.log("Change URL Error **************************************:");
        console.log(relativePath_str);
        console.log(typeof relativePath_str);

        return relativePath_str;
    }


    // for example, blob:https://example.com/, we need to remove blob and add it back later
    var pathAfterAdd = "";

    if (relativePath_str.startsWith("blob:")) {
        pathAfterAdd = "blob:";
        relativePath_str = relativePath_str.substring("blob:".length);
    }


    try {
        // 把relativePath去除掉当前代理的地址 https://proxy.com/ ， relative path成为 被代理的（相对）地址，target_website.com/path
        let startWithLs = [proxy_host_with_schema, proxy_host + "/", proxy_host]

        startWithLs.forEach(x => {
            if (relativePath_str.startsWith(x)) relativePath_str = relativePath_str.substring(x.length);
        });
        // 如果是 /https://proxy.com/ 也去掉
        startWithLs.forEach(x => {
            x = "/" + x;
            if (relativePath_str.startsWith(x)) relativePath_str = relativePath_str.substring(x.length);
        });


        // 修复： Original: /https://www.google.com/recaptcha/enterprise/reload?k=6LfwuyUTAAAAAOAmoS0fdqijC2PbbdH4kjq62Y1b
        let enhancedStartRm = [original_website_host_with_schema.substring(0, original_website_host_with_schema.length - 1), original_website_host]
        // substring 去除掉末尾的 /
        // 原因：relativePath_str 在去掉 /https://www.google.com/ 后变成了 recaptcha/enterprise/reload?k=...（没有前导 /）。
        enhancedStartRm.forEach(x => {
            x = "/" + x;
            if (relativePath_str.startsWith(x)) relativePath_str = relativePath_str.substring(x.length);
            // console.log("Replacing: " + x + "   The replaced: " + relativePath_str);
        });
    } catch {
        //ignore
    }
    try {
        // console.log("relativePath_str: " + relativePath_str + "; original_website_url_str: " + original_website_url_str);
        var absolutePath = new URL(relativePath_str, original_website_url_str).href; //获取绝对路径
        absolutePath = absolutePath.replaceAll(window.location.href, original_website_url_str); //可能是参数里面带了当前的链接，需要还原原来的链接防止403
        absolutePath = absolutePath.replaceAll(encodeURI(window.location.href), encodeURI(original_website_url_str));
        absolutePath = absolutePath.replaceAll(encodeURIComponent(window.location.href), encodeURIComponent(original_website_url_str));

        absolutePath = absolutePath.replaceAll(proxy_host, original_website_host);
        absolutePath = absolutePath.replaceAll(encodeURI(proxy_host), encodeURI(original_website_host));
        absolutePath = absolutePath.replaceAll(encodeURIComponent(proxy_host), encodeURIComponent(original_website_host));

        absolutePath = proxy_host_with_schema + absolutePath;



        absolutePath = pathAfterAdd + absolutePath;



        return absolutePath;
    } catch (e) {
        console.log("Exception occured: " + e.message + original_website_url_str + "   " + relativePath_str);
        return relativePath_str;
    }
}


// change from https://proxy.com/https://target_website.com/a to https://target_website.com/a
function getOriginalUrl(url) {
    if (url == null) return null;
    if (url.startsWith(proxy_host_with_schema)) return url.substring(proxy_host_with_schema.length);
    return url;
}


