
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


