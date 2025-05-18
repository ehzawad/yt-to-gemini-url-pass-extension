const GEMINI_URL = "https://gemini.google.com/app";

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.includes("youtube.com/watch")) {
    const youtubeUrl = tab.url;
    
    // Always open a new Gemini tab
    chrome.tabs.create({url: GEMINI_URL}, (newTab) => {
      // Listen for when the tab is fully loaded
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          // Remove the listener to avoid multiple executions
          chrome.tabs.onUpdated.removeListener(listener);
          
          // Give the page a moment to fully initialize before sending message
          setTimeout(() => {
            chrome.tabs.sendMessage(newTab.id, {action: "sendToGemini", youtubeUrl: youtubeUrl}, (response) => {
              // Handle response (optional)
              if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
              }
            });
          }, 1500);
        }
      });
    });
  } else {
    // Notify the user that they need to be on a YouTube video page
    chrome.tabs.create({url: "error.html"});
  }
});