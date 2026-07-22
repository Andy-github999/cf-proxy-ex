
//---***========================================***---注入历史---***========================================***---
function historyInject() {
    const originalPushState = History.prototype.pushState;
    const originalReplaceState = History.prototype.replaceState;
    const originalBack = History.prototype.back;
    const originalForward = History.prototype.forward;
    const originalGo = History.prototype.go;

    History.prototype.pushState = function (state, title, url) {
        if (!url) return; //x.com 会有一次undefined


        if (url.startsWith("/" + original_website_url.href)) url = url.substring(("/" + original_website_url.href).length); // https://example.com/
        if (url.startsWith("/" + original_website_url.href.substring(0, original_website_url.href.length - 1))) url = url.substring(("/" + original_website_url.href).length - 1); // https://example.com (没有/在最后)


        var u = changeURL(url);
        return originalPushState.apply(this, [state, title, u]);
    };

    History.prototype.replaceState = function (state, title, url) {
        console.log("History url started: " + url);
        if (!url) return; //x.com 会有一次undefined

        // console.log(Object.prototype.toString.call(url)); // [object URL] or string


        let url_str = url.toString(); // 如果是 string，那么不会报错，如果是 [object URL] 会解决报错


        //这是给duckduckgo专门的补丁，可能是window.location字样做了加密，导致服务器无法替换。
        //正常链接它要设置的history是/，改为proxy之后变为/https://duckduckgo.com。
        //但是这种解决方案并没有从“根源”上解决问题

        if (url_str.startsWith("/" + original_website_url.href)) url_str = url_str.substring(("/" + original_website_url.href).length); // https://example.com/
        if (url_str.startsWith("/" + original_website_url.href.substring(0, original_website_url.href.length - 1))) url_str = url_str.substring(("/" + original_website_url.href).length - 1); // https://example.com (没有/在最后)


        //给ipinfo.io的补丁：历史会设置一个https:/ipinfo.io，可能是他们获取了href，然后想设置根目录
        // *** 这里不需要 replaceAll，因为只是第一个需要替换 ***
        if (url_str.startsWith("/" + original_website_url.href.replace("://", ":/"))) url_str = url_str.substring(("/" + original_website_url.href.replace("://", ":/")).length); // https://example.com/
        if (url_str.startsWith("/" + original_website_url.href.substring(0, original_website_url.href.length - 1).replace("://", ":/"))) url_str = url_str.substring(("/" + original_website_url.href).replace("://", ":/").length - 1); // https://example.com (没有/在最后)



        var u = changeURL(url_str);

        console.log("History url changed: " + u);

        return originalReplaceState.apply(this, [state, title, u]);
    };

    History.prototype.back = function () {
        return originalBack.apply(this);
    };

    History.prototype.forward = function () {
        return originalForward.apply(this);
    };

    History.prototype.go = function (delta) {
        return originalGo.apply(this, [delta]);
    };

    console.log("HISTORY INJECTED");
}


