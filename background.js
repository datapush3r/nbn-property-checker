// background.js

browser.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
      console.log("Intercepting request:", details.url);
      console.log("Original headers:", details.requestHeaders);
      
      // Remove any existing referer header.
      let modifiedHeaders = details.requestHeaders.filter(header => header.name.toLowerCase() !== "referer");
      // Add the required referer header.
      modifiedHeaders.push({ name: "Referer", value: "https://www.nbnco.com.au/" });
      
      console.log("Modified headers:", modifiedHeaders);
      return { requestHeaders: modifiedHeaders };
    },
    { urls: ["https://places.nbnco.net.au/*"] },
    ["blocking", "requestHeaders"]
  );