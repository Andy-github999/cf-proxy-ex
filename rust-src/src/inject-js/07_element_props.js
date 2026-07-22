
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


