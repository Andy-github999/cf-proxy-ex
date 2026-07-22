  // Convert path functions
  
function ${htmlCovPathInjectFuncName}(htmlString) {
  // First, modify the HTML string to update all URLs and remove integrity
  const parser = new DOMParser();
  const tempDoc = parser.parseFromString(htmlString, 'text/html');
  
  // Process all elements in the temporary document
  const allElements = tempDoc.querySelectorAll('*');

  allElements.forEach(element => {
    covToAbs(element);
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

  const originalBodyEncoded = "__ORIGINAL_BODY_BASE64__";
  const compressed = Uint8Array.from(atob(originalBodyEncoded), c => c.charCodeAt(0));
  const decoded = pako.inflate(compressed);
  parseAndInsertDoc(new TextDecoder().decode(decoded));
})();
