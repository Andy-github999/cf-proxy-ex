
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


