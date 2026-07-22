
//---***========================================***---注入location---***========================================***---
class ProxyLocation {
    constructor(originalLocation) {
        this.originalLocation = originalLocation;
    }

    // 方法：重新加载页面
    reload(forcedReload) {
        this.originalLocation.reload(forcedReload);
    }

    // 方法：替换当前页面
    replace(url) {
        this.originalLocation.replace(changeURL(url));
    }

    // 方法：分配一个新的 URL
    assign(url) {
        this.originalLocation.assign(changeURL(url));
    }

    // 属性：获取和设置 href
    get href() {
        return original_website_url_str;
    }

    set href(url) {
        this.originalLocation.href = changeURL(url);
    }

    // 属性：获取和设置 protocol
    get protocol() {
        return original_website_url.protocol;
    }

    set protocol(value) {
        original_website_url.protocol = value;
        this.originalLocation.href = proxy_host_with_schema + original_website_url.href;
    }

    // 属性：获取和设置 host
    get host() {
        return original_website_url.host;
    }

    set host(value) {
        original_website_url.host = value;
        this.originalLocation.href = proxy_host_with_schema + original_website_url.href;
    }

    // 属性：获取和设置 hostname
    get hostname() {
        return original_website_url.hostname;
    }

    set hostname(value) {
        original_website_url.hostname = value;
        this.originalLocation.href = proxy_host_with_schema + original_website_url.href;
    }

    // 属性：获取和设置 port
    get port() {
        return original_website_url.port;
    }

    set port(value) {
        original_website_url.port = value;
        this.originalLocation.href = proxy_host_with_schema + original_website_url.href;
    }

    // 属性：获取和设置 pathname
    get pathname() {
        return original_website_url.pathname;
    }

    set pathname(value) {
        original_website_url.pathname = value;
        this.originalLocation.href = proxy_host_with_schema + original_website_url.href;
    }

    // 属性：获取和设置 search
    get search() {
        return original_website_url.search;
    }

    set search(value) {
        original_website_url.search = value;
        this.originalLocation.href = proxy_host_with_schema + original_website_url.href;
    }

    // 属性：获取和设置 hash
    get hash() {
        return original_website_url.hash;
    }

    set hash(value) {
        original_website_url.hash = value;
        this.originalLocation.href = proxy_host_with_schema + original_website_url.href;
    }

    // 属性：获取 origin
    get origin() {
        return original_website_url.origin;
    }

    toString() {
        return this.originalLocation.href;
    }
}



function documentLocationInject() {
    Object.defineProperty(document, 'URL', {
        get: function () {
            return original_website_url_str;
        },
        set: function (url) {
            document.URL = changeURL(url);
        }
    });

    Object.defineProperty(document, '${replaceUrlObj}', {
        get: function () {
            return new ProxyLocation(window.location);
        },
        set: function (url) {
            window.location.href = changeURL(url);
        }
    });
    console.log("LOCATION INJECTED");
}



function windowLocationInject() {

    Object.defineProperty(window, '${replaceUrlObj}', {
        get: function () {
            return new ProxyLocation(window.location);
        },
        set: function (url) {
            window.location.href = changeURL(url);
        }
    });

    console.log("WINDOW LOCATION INJECTED");
}

function safeFallbackLocationInject() {

    Object.defineProperty(Object.prototype, '${replaceUrlObj}', {
        get: function () {
            console.log("*** GET SAFE FALLBACK CALLED ***");
            // window / document 有 own property，会优先命中各自 getter，不会走到这里
            return this == null ? undefined : this.location;
        },
        set: function (value) {
            console.log("*** SET SAFE FALLBACK CALLED ***");
            if (this != null) this.location = value;
        },
        configurable: true,
        enumerable: false   // 不能污染 for-in / Object.keys / JSON.stringify
    });
    console.log("OBJECT PROTOTYPE LOCATION FALLBACK INJECTED");

}


