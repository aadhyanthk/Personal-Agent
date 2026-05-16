chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "check_emails") {
    const token = request.token;
    if (!token) {
      sendResponse({ status: "Error: Not authenticated." });
      return;
    }

    (async () => {
      try {
        // 1. Fetch unread messages
        const timeframe = request.timeframe || "1d";
        const query = encodeURIComponent(`is:unread newer_than:${timeframe}`);
        let response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        let data = await response.json();
        
        if (!data.messages || data.messages.length === 0) {
          sendResponse({ status: "No unread emails found." });
          return;
        }

        // 2. Fetch details for each message
        for (let msg of data.messages) {
          let detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          let detailData = await detailRes.json();
          
          // Parse headers
          let headers = detailData.payload.headers;
          let subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || "No Subject";
          let senderHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || "Unknown Sender";
          
          // Very basic body extraction
          let body = "";
          if (detailData.payload.parts && detailData.payload.parts.length > 0) {
            let part = detailData.payload.parts.find(p => p.mimeType === 'text/plain');
            if (part && part.body && part.body.data) {
              body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
          } else if (detailData.payload.body && detailData.payload.body.data) {
             body = atob(detailData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }

          // 3. Send to FastAPI Brain
          await fetch('http://localhost:8000/api/brain/process-email', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Gemini-Api-Key': request.apiKey
            },
            body: JSON.stringify({
              message_id: msg.id,
              sender: senderHeader,
              subject: subject,
              body: body.substring(0, 500)
            })
          });
        }
        
        sendResponse({ status: `Processed ${data.messages.length} emails.` });
      } catch (error) {
        sendResponse({ status: "Error: " + error.message + " (Is backend running?)" });
      }
    })();
    return true; 
  }
});
