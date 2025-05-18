// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendToGemini" && message.youtubeUrl) {
    // Give the page time to fully load with async handling
    setTimeout(async () => {
      try {
        await insertUrlAndSubmit(message.youtubeUrl);
        sendResponse({success: true}); // Actually send a response
      } catch (error) {
        // Alert if something goes wrong
        alert(`Error: ${error.message}\nPlease make sure you're logged in to Gemini.`);
        console.error("YouTube to Gemini error:", error);
        sendResponse({success: false, error: error.message}); // Send error response
      }
    }, 1000);
    return true; // This is correct, we need to keep the message channel open
  }
});

async function insertUrlAndSubmit(youtubeUrl) {
  // Check if we're on the login page
  if (document.querySelector('form[action*="signin"]') || 
      document.location.href.includes("signin")) {
    alert("Please log in to Gemini first, then try again.");
    return;
  }
  
  // Find the textarea input field - wait for it to appear if needed
  let inputField = null;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!inputField && attempts < maxAttempts) {
    const textareas = document.querySelectorAll('textarea');
    inputField = Array.from(textareas).find(el => 
      (el.placeholder && el.placeholder.toLowerCase().includes('ask gemini')) || 
      (el.getAttribute('aria-label') && el.getAttribute('aria-label').toLowerCase().includes('ask gemini'))
    );
    if (!inputField) {
      const editableField = document.querySelector('[role="textbox"][contenteditable="true"]');
      if (editableField) {
        inputField = editableField;
      }
    }
    
    if (!inputField) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
  }
  
  if (!inputField) {
    throw new Error("Could not find Gemini input field after multiple attempts");
  }
  
  inputField.focus();
  if (inputField.tagName.toLowerCase() === 'textarea') {
    inputField.value = youtubeUrl;
  } else {
    inputField.innerText = youtubeUrl;
  }
  // Dispatch input event to ensure Gemini recognizes the input
  inputField.dispatchEvent(new Event('input', { bubbles: true }));

  // Give Gemini UI a moment to update the send button state
  await new Promise(resolve => setTimeout(resolve, 300));

  let sendButton = null;
  // Known selectors for Gemini's send controls
  const knownSelector = [
    'button[aria-label*="Send message"]',
    'button[aria-label*="Send"]',
    '[role="button"][aria-label*="Send message"]',
    '[role="button"][aria-label*="Send"]',
    '[data-testid*="send"]',
    'button[type="submit"]'
  ].join(',');
  // Fallback: any clickable button or icon with "Send" in text or aria-label
  const textButtons = 'button, [role="button"], [data-testid*="send-icon"]';
  let clickAttempts = 0;
  const maxClickAttempts = 10;
  while (clickAttempts < maxClickAttempts) {
    sendButton = document.querySelector(knownSelector);
    if (!sendButton) {
      sendButton = Array.from(document.querySelectorAll(textButtons)).find(el =>
        ((el.textContent && /send( message)?/i.test(el.textContent)) ||
         (el.getAttribute('aria-label') && /send( message)?/i.test(el.getAttribute('aria-label')))) &&
        !el.disabled
      );
    }
    if (sendButton) break;
    await new Promise(resolve => setTimeout(resolve, 300));
    clickAttempts++;
  }

  if (sendButton) {
    sendButton.click();
  } else {
    const keyboardEventInit = {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    };
    ['keydown', 'keypress', 'keyup'].forEach(type =>
      inputField.dispatchEvent(new KeyboardEvent(type, keyboardEventInit))
    );
  }
}