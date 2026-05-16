document.getElementById('loginBtn').addEventListener('click', () => {
  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError || !token) {
      document.getElementById('status').innerText = "Login failed: " + chrome.runtime.lastError.message;
      return;
    }
    document.getElementById('status').innerText = "Logged in successfully!";
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('checkEmailBtn').style.display = 'block';
    loadPendingActions();
  });
});

document.getElementById('checkEmailBtn').addEventListener('click', () => {
  document.getElementById('status').innerText = "Checking emails...";
  chrome.runtime.sendMessage({ action: "check_emails" }, response => {
    document.getElementById('status').innerText = response.status;
    setTimeout(loadPendingActions, 2000); // Reload actions after processing
  });
});

async function loadPendingActions() {
  const container = document.getElementById('pendingActions');
  container.innerHTML = "Loading...";
  try {
    const res = await fetch('http://localhost:8000/api/brain/pending-actions');
    const actions = await res.json();
    
    if (actions.length === 0) {
      container.innerHTML = "No pending actions.";
      return;
    }
    
    container.innerHTML = "";
    actions.forEach(action => {
      if (action.action_type === "DRAFT_REPLY") {
        const div = document.createElement('div');
        div.style.border = "1px solid #ccc";
        div.style.padding = "10px";
        div.style.marginBottom = "10px";
        
        div.innerHTML = `
          <strong>Draft Reply to Email ID:</strong> ${action.payload.email_id}<br>
          <p><em>${action.payload.draft}</em></p>
          <button onclick="approveAction(${action.id}, '${action.payload.email_id}', \`${action.payload.draft.replace(/`/g, "'")}\`)">Approve & Send</button>
          <button onclick="rejectAction(${action.id})">Reject</button>
        `;
        container.appendChild(div);
      }
    });
  } catch (e) {
    container.innerHTML = "Error loading actions.";
  }
}

window.approveAction = function(actionId, emailId, draft) {
  // 1. Send email using Gmail API
  chrome.identity.getAuthToken({ interactive: false }, async function(token) {
    if (!token) return alert("Not authenticated!");
    
    // Construct Raw Email (Simplified for demo purposes)
    const emailStr = `To: placeholder@example.com\r\nSubject: Re: Your Email\r\n\r\n${draft}`;
    const encodedEmail = btoa(emailStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedEmail, threadId: emailId })
      });
      
      if(res.ok) {
         // 2. Mark as completed in backend
         await fetch(`http://localhost:8000/api/brain/actions/${actionId}/resolve`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ status: "COMPLETED" })
         });
         loadPendingActions();
      } else {
         alert("Failed to send email");
      }
    } catch (e) {
      alert("Error: " + e);
    }
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

// Check if already logged in on load
chrome.identity.getAuthToken({ interactive: false }, function(token) {
  if (token) {
    document.getElementById('status').innerText = "Logged in successfully!";
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('checkEmailBtn').style.display = 'block';
    loadPendingActions();
  }
});
