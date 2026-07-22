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
    
    return proxy_host_with_schema + match;
  });



  return content;


}


  const originalBodyBase64Encoded = "__ORIGINAL_BODY_BASE64__";
  const bytes = new Uint8Array(originalBodyBase64Encoded.split(',').map(Number));
  parseAndInsertDoc(new TextDecoder().decode(bytes));
})();
