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
