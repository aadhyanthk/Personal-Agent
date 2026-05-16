let currentApiKey = "";

chrome.storage.local.get(['geminiApiKey'], function(result) {
  if (result.geminiApiKey) {
    currentApiKey = result.geminiApiKey;
    document.getElementById('apiKeyInput').value = currentApiKey;
    checkAuthStatus();
  } else {
    document.getElementById('apiKeySection').style.display = 'block';
  }
});

document.getElementById('saveKeyBtn').addEventListener('click', () => {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) return alert("Please enter an API Key");
  
  chrome.storage.local.set({geminiApiKey: key}, function() {
    currentApiKey = key;
    document.getElementById('saveKeyBtn').innerText = "Saved!";
    setTimeout(() => document.getElementById('saveKeyBtn').innerText = "Save Key", 2000);
    checkAuthStatus();
  });
});

function checkAuthStatus() {
  if (!currentApiKey) {
    document.getElementById('apiKeySection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('loginBtn').style.display = 'none';
    return;
  }
  
  document.getElementById('apiKeySection').style.display = 'block'; 
  
  chrome.identity.getAuthToken({ interactive: false }, function(token) {
    if (token) {
      document.getElementById('loginBtn').style.display = 'none';
      document.getElementById('dashboardSection').style.display = 'block';
      document.getElementById('status').innerText = "Logged in successfully!";
      loadPendingActions();
    } else {
      document.getElementById('loginBtn').style.display = 'block';
      document.getElementById('dashboardSection').style.display = 'none';
    }
  });
}

document.getElementById('loginBtn').addEventListener('click', () => {
  if (!currentApiKey) return alert("Please enter your Gemini API Key first.");
  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError || !token) {
      alert("Login failed: " + chrome.runtime.lastError.message);
      return;
    }
    checkAuthStatus();
  });
});

document.getElementById('checkEmailBtn').addEventListener('click', () => {
  document.getElementById('status').innerText = "Checking emails...";
  const timeframe = document.getElementById('timeframeSelect').value;
  
  // Get the token and pass it to the background script
  chrome.identity.getAuthToken({ interactive: false }, function(token) {
    if (!token) {
      document.getElementById('status').innerText = "Error: Not authenticated. Please login again.";
      return;
    }
    
    chrome.runtime.sendMessage({ 
      action: "check_emails", 
      apiKey: currentApiKey,
      token: token,
      timeframe: timeframe
    }, response => {
      document.getElementById('status').innerText = response ? response.status : "Error";
      setTimeout(loadPendingActions, 2000); 
    });
  });
});

let currentActions = [];

async function loadPendingActions() {
  const container = document.getElementById('pendingActions');
  container.innerHTML = "Loading...";
  try {
    const res = await fetch('http://localhost:8000/api/brain/pending-actions');
    currentActions = await res.json();
    
    if (currentActions.length === 0) {
      container.innerHTML = "No pending actions.";
      return;
    }
    
    container.innerHTML = "";
    currentActions.forEach(action => {
      if (action.action_type === "DRAFT_REPLY") {
        const div = document.createElement('div');
        div.style.border = "1px solid #ccc";
        div.style.padding = "10px";
        div.style.marginBottom = "10px";
        div.style.backgroundColor = action.payload.classification === "URGENT" ? "#fff0f0" : "#f0f7ff";
        
        div.innerHTML = `
          <div style="font-size: 0.8em; color: #666; margin-bottom: 5px;">
            <strong>${action.payload.classification}</strong> from ${action.payload.sender}
          </div>
          <strong>Draft Reply:</strong>
          <p style="margin: 5px 0; white-space: pre-wrap;"><em>${action.payload.draft}</em></p>
          <div style="margin-top: 10px;">
            <button class="approve-btn" data-id="${action.id}">Approve & Send</button>
            <button class="reject-btn" data-id="${action.id}">Reject</button>
          </div>
        `;
        container.appendChild(div);
      }
    });
  } catch (e) {
    container.innerHTML = "Error connecting to Backend Brain. Is FastAPI running on localhost:8000?";
  }
}

window.approveAction = function(actionId, emailId, sender, subject, draft) {
  chrome.identity.getAuthToken({ interactive: false }, async function(token) {
    if (!token) return alert("Not authenticated!");
    
    // Extract exact email if formatted as "Name <email@domain.com>"
    let toEmail = sender;
    const emailMatch = sender.match(/<([^>]+)>/);
    if (emailMatch) {
        toEmail = emailMatch[1];
    }
    
    // Gmail requires Subject to match exactly (with Re:) for threads
    let replySubject = subject;
    if (!replySubject.toLowerCase().startsWith('re:')) {
        replySubject = 'Re: ' + replySubject;
    }
    
    const emailStr = `To: ${toEmail}\r\nSubject: ${replySubject}\r\n\r\n${draft}`;
    // Safe base64 encoding for UTF-8 strings
    const encodedEmail = btoa(unescape(encodeURIComponent(emailStr))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: encodedEmail, threadId: emailId })
      });
      if(res.ok) {
         await fetch(`http://localhost:8000/api/brain/actions/${actionId}/resolve`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ status: "COMPLETED" })
         });
         loadPendingActions();
      } else { 
        const errorText = await res.text();
        alert("Failed to send email:\n" + errorText); 
      }
    } catch (e) { alert("Error: " + e); }
  });
};

window.rejectAction = async function(actionId) {
  await fetch(`http://localhost:8000/api/brain/actions/${actionId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: "REJECTED" })
  });
  loadPendingActions();
};

// Event Delegation for dynamically created buttons
document.getElementById('pendingActions').addEventListener('click', (e) => {
  if (e.target.classList.contains('approve-btn')) {
    const actionId = parseInt(e.target.getAttribute('data-id'));
    const action = currentActions.find(a => a.id === actionId);
    if (action) {
      approveAction(actionId, action.payload.email_id, action.payload.sender, action.payload.subject, action.payload.draft);
    }
  } else if (e.target.classList.contains('reject-btn')) {
    const actionId = e.target.getAttribute('data-id');
    rejectAction(actionId);
  }
});

// Check if already logged in on load
chrome.identity.getAuthToken({ interactive: false }, function(token) {
  if (token) {
    document.getElementById('status').innerText = "Logged in successfully!";
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    loadPendingActions();
  }
});
