
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


