
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


