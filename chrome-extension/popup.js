document.getElementById('loginBtn').addEventListener('click', () => {
  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError || !token) {
      document.getElementById('status').innerText = "Login failed: " + chrome.runtime.lastError.message;
      return;
    }
    document.getElementById('status').innerText = "Logged in successfully!";
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('checkEmailBtn').style.display = 'block';
  });
});

document.getElementById('checkEmailBtn').addEventListener('click', () => {
  document.getElementById('status').innerText = "Checking emails...";
  chrome.runtime.sendMessage({ action: "check_emails" }, response => {
    document.getElementById('status').innerText = response.status;
  });
});
