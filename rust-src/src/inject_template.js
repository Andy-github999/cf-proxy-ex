<!DOCTYPE html>
<script>
//__PROXY_HINT_BLOCK_START__
(function () {
  // proxy hint
  

function toEntities(str) {
return str.split("").map(ch => `&#${ch.charCodeAt(0)};`).join("");
}


//---***========================================***---提示使用代理---***========================================***---

setTimeout(() => {
var hint = `
Warning: You are currently using a web proxy, so do not log in to any website. Click to close this hint. For further details, please visit the link below.
警告：您当前正在使用网络代理，请勿登录任何网站。单击关闭此提示。详情请见以下链接。
`;

if (document.readyState === 'complete' || document.readyState === 'interactive') {
document.body.insertAdjacentHTML(
  'afterbegin', 
  `<div style="position:fixed;left:0px;top:0px;width:100%;margin:0px;padding:0px;display:block;z-index:99999999999999999999999;user-select:none;cursor:pointer;" id="__PROXY_HINT_DIV__" onclick="document.getElementById('__PROXY_HINT_DIV__').remove();">
    <span style="position:relative;display:block;width:calc(100% - 20px);min-height:30px;font-size:14px;color:yellow;background:rgb(180,0,0);text-align:center;border-radius:5px;padding-left:10px;padding-right:10px;padding-top:1px;padding-bottom:1px;">
      ${toEntities(hint)}
      <br>
      <a href="https://github.com/1234567Yang/cf-proxy-ex/" style="color:rgb(250,250,180);">https://github.com/1234567Yang/cf-proxy-ex/</a>
    </span>
  </div>
  `
);
}else{
alert(hint + "https://github.com/1234567Yang/cf-proxy-ex");
}
}, 5000);
})();


//__PROXY_HINT_BLOCK_END__
(function () {
  // hooks stuff - Must before convert path functions
  // it defines all necessary variables
  

//---***========================================***---information---***========================================***---
var nowURL = new URL(window.location.href);
var proxy_host = nowURL.host; //代理的host - proxy.com
var proxy_protocol = nowURL.protocol; //代理的protocol
var proxy_host_with_schema = proxy_protocol + "//" + proxy_host + "/"; //代理前缀 https://proxy.com/




// 每次都要动态计算。比如某个网站把 #1 -> #2 然后 JS 调用。如果静态计算的话就还是会是 # 1

// var original_website_url_str = window.location.href.substring(proxy_host_with_schema.length); //被代理的【完整】地址 如：https://example.com/1?q#1
// var original_website_url = new URL(original_website_url_str);

// var original_website_host = original_website_url_str.substring(original_website_url_str.indexOf("://") + "://".length);
// original_website_host = original_website_host.split('/')[0]; //被代理的Host proxied_website.com

// var original_website_host_with_schema = original_website_url_str.substring(0, original_website_url_str.indexOf("://")) + "://" + original_website_host + "/"; //加上https的被代理的host， https://proxied_website.com/


//被代理的【完整】地址 如：https://example.com/1?q#1
Object.defineProperty(window, 'original_website_url_str', {
    get: function() {
        return window.location.href.substring(proxy_host_with_schema.length);
    }
});

Object.defineProperty(window, 'original_website_url', {
    get: function() {
        return new URL(original_website_url_str);
    }
});

//被代理的Host proxied_website.com
Object.defineProperty(window, 'original_website_host', {
    get: function() {
        var h = original_website_url_str.substring(original_website_url_str.indexOf("://") + "://".length);
        return h.split('/')[0];
    }
});

//加上https的被代理的host， https://proxied_website.com/
Object.defineProperty(window, 'original_website_host_with_schema', {
    get: function() {
        return original_website_url_str.substring(0, original_website_url_str.indexOf("://")) + "://" + original_website_host + "/";
    }
});



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




//---***========================================***---注入网络---***========================================***---
function networkInject() {
    //inject network request
    var originalOpen = XMLHttpRequest.prototype.open;
    var originalFetch = window.fetch;
    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {

        console.log("Original: " + url);

        url = changeURL(url);

        console.log("R:" + url);
        return originalOpen.apply(this, arguments);
    };

    window.fetch = function (input, init) {
        var url;
        if (typeof input === 'string') {
            url = input;
        } else if (input instanceof Request) {
            url = input.url;
        } else {
            url = input;
        }



        url = changeURL(url);



        console.log("R:" + url);
        if (typeof input === 'string') {
            return originalFetch(url, init);
        } else {
            const newRequest = new Request(url, input);
            return originalFetch(newRequest, init);
        }
    };

    console.log("NETWORK REQUEST METHOD INJECTED");
}


//---***========================================***---注入window.open---***========================================***---
function windowOpenInject() {
    const originalOpen = window.open;

    // Override window.open function
    window.open = function (url, name, specs) {
        let modifiedUrl = changeURL(url);
        return originalOpen.call(window, modifiedUrl, name, specs);
    };

    console.log("WINDOW OPEN INJECTED");
}


//---***========================================***---注入append元素---***========================================***---
function appendChildInject() {
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function (child) {
        try {
            if (child.src) {
                child.src = changeURL(child.src);
            }
            if (child.href) {
                child.href = changeURL(child.href);
            }
        } catch {
            //ignore
        }
        return originalAppendChild.call(this, child);
    };
    console.log("APPEND CHILD INJECTED");
}




//---***========================================***---注入元素的src和href---***========================================***---
function elementPropertyInject() {
    const originalSetAttribute = HTMLElement.prototype.setAttribute;
    HTMLElement.prototype.setAttribute = function (name, value) {
        if (name == "integrity") {
            return; // 丢弃 integrity，避免 SRI 校验（脚本内容已被代理修改）
        }
        if (name == "src" || name == "href" || name == "action") {
            value = changeURL(value);
        }
        originalSetAttribute.call(this, name, value);
    };


    const originalGetAttribute = HTMLElement.prototype.getAttribute;
    HTMLElement.prototype.getAttribute = function (name) {
        const val = originalGetAttribute.call(this, name);
        if (name == "src" || name == "href" || name == "action") {
            return getOriginalUrl(val);
        }
        return val;
    };



    console.log("ELEMENT PROPERTY (get/set attribute) INJECTED");



    // -------------------------------------


    //ChatGPT + personal modify
    const setList = [
        [HTMLAnchorElement, "href"],
        [HTMLScriptElement, "src"],
        [HTMLImageElement, "src"],
        // [HTMLImageElement, "srcset"], // 注意 srcset 是特殊格式，可以先只处理 src
        [HTMLLinkElement, "href"],
        [HTMLIFrameElement, "src"],
        [HTMLVideoElement, "src"],
        [HTMLAudioElement, "src"],
        [HTMLSourceElement, "src"],
        // [HTMLSourceElement, "srcset"],
        [HTMLObjectElement, "data"],
        [HTMLFormElement, "action"],
    ];

    for (const [whichElement, whichProperty] of setList) {
        if (!whichElement || !whichElement.prototype) continue;
        const descriptor = Object.getOwnPropertyDescriptor(whichElement.prototype, whichProperty);
        if (!descriptor) continue;

        Object.defineProperty(whichElement.prototype, whichProperty, {
            get: function () {
                const real = descriptor.get.call(this);
                return getOriginalUrl(real);
            },
            set: function (val) {
                descriptor.set.call(this, changeURL(val));
            },
            configurable: true,
        });

        console.log("Hooked " + whichElement.name + " " + whichProperty);
    }



    console.log("ELEMENT PROPERTY (src / href) INJECTED");
}




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










//---***========================================***---注入表单提交---***========================================***---
function formSubmitInject() {
    // 拦截表单提交，确保 URL 经过代理重写
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.tagName !== 'FORM') return;
        // POST 表单不拦截（action 已由服务端重写，POST body 必须保留）
        if (form.method && form.method.toUpperCase() === 'POST') return;
        const action = form.getAttribute('action');
        if (!action || action === '#' || action.startsWith('javascript:')) return;
        e.preventDefault();
        var finalUrl = changeURL(action || window.location.href);
        // GET 表单需要把表单数据拼到 URL 里
        var formData = new FormData(form);
        var params = new URLSearchParams();
        for (var pair of formData.entries()) {
            params.append(pair[0], pair[1]);
        }
        var qs = params.toString();
        if (qs) {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
        }
        window.location.href = finalUrl;
    }, true);

    // 也拦截程序化调用 form.submit()
    var originalSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
        // POST 表单不拦截（action 已由服务端重写，POST body 必须保留）
        if (this.method && this.method.toUpperCase() === 'POST') {
            originalSubmit.call(this);
            return;
        }
        var action = this.getAttribute('action');
        if (!action || action === '#' || action.startsWith('javascript:')) {
            originalSubmit.call(this);
            return;
        }
        var finalUrl = changeURL(action);
        // GET 表单需要把表单数据拼到 URL 里
        var formData = new FormData(this);
        var params = new URLSearchParams();
        for (var pair of formData.entries()) {
            params.append(pair[0], pair[1]);
        }
        var qs = params.toString();
        if (qs) {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
        }
        window.location.href = finalUrl;
    };
}


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






//---***========================================***---Hook观察界面---***========================================***---
function obsPage() {
    var yProxyObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            traverseAndConvert(mutation);
        });
    });
    var config = { attributes: true, childList: true, subtree: true };
    yProxyObserver.observe(document.body, config);

    console.log("OBSERVING THE WEBPAGE...");
}

function traverseAndConvert(node) {
    if (node instanceof HTMLElement) {
        removeIntegrityAttributesFromElement(node);
        covToAbs(node);
        node.querySelectorAll('*').forEach(function (child) {
            removeIntegrityAttributesFromElement(child);
            covToAbs(child);
        });
    }
}


// ************************************************************************
// ************************************************************************
// Problem: img can also have srcset
// https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images
// and link secret
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLLinkElement/imageSrcset
// ************************************************************************
// ************************************************************************

function covToAbs(element) {
    if (!(element instanceof HTMLElement)) return;


    if (element.hasAttribute("href")) {
        relativePath = element.getAttribute("href");
        try {
            var absolutePath = changeURL(relativePath);
            element.setAttribute("href", absolutePath);
        } catch (e) {
            console.log("Exception occured: " + e.message + original_website_url_str + "   " + relativePath);
            console.log(element);
        }
    }


    if (element.hasAttribute("src")) {
        relativePath = element.getAttribute("src");
        try {
            var absolutePath = changeURL(relativePath);
            element.setAttribute("src", absolutePath);
        } catch (e) {
            console.log("Exception occured: " + e.message + original_website_url_str + "   " + relativePath);
            console.log(element);
        }
    }


    if (element.tagName === "FORM" && element.hasAttribute("action")) {
        relativePath = element.getAttribute("action");
        try {
            var absolutePath = changeURL(relativePath);
            element.setAttribute("action", absolutePath);
        } catch (e) {
            console.log("Exception occured: " + e.message + original_website_url_str + "   " + relativePath);
            console.log(element);
        }
    }


    if (element.tagName === "SOURCE" && element.hasAttribute("srcset")) {
        relativePath = element.getAttribute("srcset");
        try {
            var absolutePath = changeURL(relativePath);
            element.setAttribute("srcset", absolutePath);
        } catch (e) {
            console.log("Exception occured: " + e.message + original_website_url_str + "   " + relativePath);
            console.log(element);
        }
    }


    // 视频的封面图
    if ((element.tagName === "VIDEO" || element.tagName === "AUDIO") && element.hasAttribute("poster")) {
        relativePath = element.getAttribute("poster");
        try {
            var absolutePath = changeURL(relativePath);
            element.setAttribute("poster", absolutePath);
        } catch (e) {
            console.log("Exception occured: " + e.message);
        }
    }



    if (element.tagName === "OBJECT" && element.hasAttribute("data")) {
        relativePath = element.getAttribute("data");
        try {
            var absolutePath = changeURL(relativePath);
            element.setAttribute("data", absolutePath);
        } catch (e) {
            console.log("Exception occured: " + e.message);
        }
    }





}


function removeIntegrityAttributesFromElement(element) {
    if (element.hasAttribute('integrity')) {
        element.removeAttribute('integrity');
    }
}
//---***========================================***---Hook观察界面里面要用到的func---***========================================***---
function loopAndConvertToAbs() {
    for (var ele of document.querySelectorAll('*')) {
        removeIntegrityAttributesFromElement(ele);
        covToAbs(ele);
    }
    console.log("LOOPED EVERY ELEMENT");
}

function covScript() { //由于observer经过测试不会hook添加的script标签，也可能是我测试有问题？
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        covToAbs(scripts[i]);
    }
    setTimeout(covScript, 3000);
}




























//---***========================================***---操作---***========================================***---
networkInject();
windowOpenInject();
elementPropertyInject();
appendChildInject();
documentLocationInject();
windowLocationInject();
safeFallbackLocationInject();
formSubmitInject();
historyInject();




//---***========================================***---在window.load之后的操作---***========================================***---
window.addEventListener('load', () => {
    loopAndConvertToAbs();
    console.log("CONVERTING SCRIPT PATH");
    obsPage();
    covScript();
});
console.log("WINDOW ONLOAD EVENT ADDED");





//---***========================================***---在window.error的时候---***========================================***---

window.addEventListener('error', event => {
    var element = event.target || event.srcElement;
    if (element.tagName === 'SCRIPT') {
        console.log("Found problematic script:", element);
        if (element.alreadyChanged) {
            console.log("this script has already been injected, ignoring this problematic script...");
            return;
        }
        // 调用 covToAbs 函数
        removeIntegrityAttributesFromElement(element);
        covToAbs(element);

        // 创建新的 script 元素
        var newScript = document.createElement("script");
        newScript.src = element.src;
        newScript.async = element.async; // 保留原有的 async 属性
        newScript.defer = element.defer; // 保留原有的 defer 属性
        newScript.alreadyChanged = true;

        // 添加新的 script 元素到 document
        document.head.appendChild(newScript);

        console.log("New script added:", newScript);
    }
}, true);
console.log("WINDOW CORS ERROR EVENT ADDED");




  // Convert path functions
  
function ${htmlCovPathInjectFuncName}(htmlString) {
  // First, modify the HTML string to update all URLs and remove integrity
  const parser = new DOMParser();
  const tempDoc = parser.parseFromString(htmlString, 'text/html');
  
  // Process all elements in the temporary document
  const allElements = tempDoc.querySelectorAll('*');

  allElements.forEach(element => {
    covToAbs(element);
    removeIntegrityAttributesFromElement(element);



    if (element.tagName === 'SCRIPT') {
      if (element.textContent && !element.src) {
          element.textContent = replaceContentPaths(element.textContent);
      }
    }
  
    if (element.tagName === 'STYLE') {
      if (element.textContent) {
          element.textContent = replaceContentPaths(element.textContent);
      }
    }
  });

  
  // Get the modified HTML string
  let modifiedHtml = tempDoc.documentElement.outerHTML;


  let charset = modifiedHtml.match(/content="text\/html;\s*charset=[^"]*"/);
  console.log(charset);
  if(charset != null && charset.length !== 0){
    modifiedHtml = modifiedHtml.replace(charset[0], "content='text/html;charset=utf-8'");
    // only replace the first here
  }

  
  // Now use document.open/write/close to replace the entire document
  // This preserves the natural script execution order
  document.open();
  document.write('<!DOCTYPE html>' + modifiedHtml);
  document.close();

  // Re-register hooks after document.close() (仅在顶层窗口执行，不污染 iframe)
  if (window === window.top) {
    formSubmitInject();
    networkInject();
    loopAndConvertToAbs();
    obsPage();
    covScript();
  }
}




function replaceContentPaths(content){
  let regex = new RegExp(`(https?:\\/\\/[^\s'"]+)`, 'g');
  // 这里写四个 \ 是因为 Server side 的文本也会把它当成转义符
  content = content.replaceAll(regex, (match) => {
    if (match.startsWith("http://www.w3.org/") || match.startsWith("https://www.w3.org/")) return match; // w3范式
    
    if (match.startsWith("http")) {
      return proxy_host_with_schema + match;
    } else {
      return proxy_host + "/" + match;
    }
  });



  return content;


}


  const originalBodyBase64Encoded = "__ORIGINAL_BODY_BASE64__";
  const bytes = new Uint8Array(originalBodyBase64Encoded.split(',').map(Number));
  parseAndInsertDoc(new TextDecoder().decode(bytes));
})();
</script>