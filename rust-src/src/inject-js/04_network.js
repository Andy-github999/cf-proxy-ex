
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


