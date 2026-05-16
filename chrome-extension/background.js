chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "check_emails") {
    // 1. Get token
    chrome.identity.getAuthToken({ interactive: false }, function(token) {
      if (!token) {
        sendResponse({ status: "Error: Not authenticated." });
        return;
      }
      
      // 2. Fetch recent unread emails (Logic goes here)
      // fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread', ...)
      
      // 3. Send to FastAPI Brain
      // fetch('http://localhost:8000/api/brain/process-email', ...)
      
      sendResponse({ status: "Check complete. Backend logic ready to be connected." });
    });
    return true; // Keep message channel open for async response
  }
});
