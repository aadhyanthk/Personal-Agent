from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from starlette.middleware.sessions import SessionMiddleware
import os
from db.database import engine, Base
import db.models
from routers import auth
from dotenv import load_dotenv

load_dotenv()

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Operations Agent")

# Crucial for Authlib OAuth state handling
app.add_middleware(
    SessionMiddleware, 
    secret_key=os.environ.get("SESSION_SECRET_KEY", "fallback_secret_please_change")
)

app.include_router(auth.router)

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    user = request.session.get('user')
    if user:
        return f"<h1>Welcome to the Personal Operations Agent, {user['email']}!</h1><a href='/dashboard'>Go to Dashboard</a> | <a href='/auth/logout'>Logout</a>"
    return "<h1>Personal Operations Agent</h1><a href='/auth/login'>Login with Google</a>"

@app.get("/dashboard")
def dashboard(request: Request):
    user = request.session.get('user')
    if not user:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url='/')
    return {"message": "Welcome to your dashboard!", "user": user}
