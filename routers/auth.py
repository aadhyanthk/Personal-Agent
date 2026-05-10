import os
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from db.database import get_db
from sqlalchemy.orm import Session
from db.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

config = Config('.env')
oauth = OAuth(config)

# Scope needed for Gmail and Calendar
SCOPES = 'openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar'

oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': SCOPES
    }
)

@router.get('/login')
async def login(request: Request):
    redirect_uri = request.url_for('auth_callback')
    # Use access_type='offline' and prompt='consent' to get a refresh token
    return await oauth.google.authorize_redirect(
        request, 
        str(redirect_uri),
        access_type='offline',
        prompt='consent'
    )

@router.get('/callback')
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        email = user_info.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")

        # Find or create user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email)
            db.add(user)
            
        # Update tokens
        user.google_access_token = token.get('access_token')
        if token.get('refresh_token'):
            user.google_refresh_token = token.get('refresh_token')
        user.token_expires_at = token.get('expires_at')
        
        db.commit()
        
        # Store user session securely
        request.session['user'] = {'email': email, 'id': user.id}
        
        # Redirect to the dashboard
        return RedirectResponse(url='/dashboard')
    except Exception as e:
        return {"error": str(e)}

@router.get('/logout')
async def logout(request: Request):
    request.session.pop('user', None)
    return RedirectResponse(url='/')
