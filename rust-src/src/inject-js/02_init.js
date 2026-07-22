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


