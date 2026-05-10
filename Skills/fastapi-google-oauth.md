# Skill: FastAPI Google OAuth2 Sign-In

## Overview
Implement Google Sign-In in FastAPI using the `Authlib` library and `SessionMiddleware` to securely authenticate users and access their Gmail/Calendar APIs.

## Dependencies
```bash
pip install fastapi uvicorn authlib itsdangerous httpx python-dotenv
```

## Setup & Configuration
1. **Google Cloud Console**:
   - Create a project.
   - Enable Gmail API and Google Calendar API.
   - Configure the OAuth Consent Screen.
   - Create OAuth 2.0 Client IDs (Web application).
   - Add Authorized Redirect URIs: `http://localhost:8000/auth/callback` (and your production URL).
   - Download the credentials to get `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

2. **Environment Variables** (`.env`):
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
SESSION_SECRET_KEY=a_strong_random_string
```

## Implementation

```python
import os
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config

app = FastAPI()

# Crucial for Authlib OAuth state handling
app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SESSION_SECRET_KEY", "fallback_secret"))

config = Config('.env')
oauth = OAuth(config)

oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar'
    }
)

@app.get('/login')
async def login(request: Request):
    redirect_uri = request.url_for('auth_callback')
    return await oauth.google.authorize_redirect(request, str(redirect_uri))

@app.get('/auth/callback')
async def auth_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        # Store user info and access/refresh tokens securely in your DB
        request.session['user'] = dict(user_info)
        return RedirectResponse(url='/dashboard')
    except Exception as e:
        return {"error": str(e)}

@app.get('/dashboard')
async def dashboard(request: Request):
    user = request.session.get('user')
    if not user:
        return RedirectResponse(url='/login')
    return {"message": f"Welcome {user['email']}"}
```

## Critical Rules
- **Never hardcode secrets**.
- Ensure `SessionMiddleware` is added; otherwise, Authlib will throw state mismatch errors.
- Request the precise scopes needed for Gmail and Calendar. If you need offline access (to process emails in the background while the user isn't actively on the site), you must add `prompt='consent'` and `access_type='offline'` to the authorize request.
