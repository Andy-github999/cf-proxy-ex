
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


