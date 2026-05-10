# Skill: Deployment & Hosting (FastAPI + Google OAuth)

## Overview
This project involves a FastAPI backend, an SQLite database, and Google OAuth2. Hosting requires a platform that supports persistent storage (for SQLite) and custom environment variables (for OAuth).

## 1. Pushing to GitHub
Because this folder contains sensitive data (once you run it), ensure you have a `.gitignore`:

### `.gitignore`
```
__pycache__/
*.py[cod]
.env
metrics.db
```

### Git Commands
```bash
git init
git add .
git commit -m "Initial commit with agent framework"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## 2. Hosting the Backend (Render)
Render is an excellent platform for FastAPI because it natively supports Docker and Python, and offers a "Disk" feature for SQLite persistence.

### Setup Steps
1. Create a `requirements.txt`.
2. Create a `render.yaml` (Infrastructure as Code) or set it up via the Render Dashboard.
3. Select "Web Service" connected to your GitHub repo.
4. **Environment Variables**: Add your `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SESSION_SECRET_KEY` in the Render dashboard. Do NOT commit the `.env` file.
5. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### SQLite Persistence on Render
To avoid losing your token/latency logs on every deploy:
1. In the Render dashboard, go to your Web Service -> Disks.
2. Add a disk mounted at `/data`.
3. Update your FastAPI app to create the SQLite DB at `/data/metrics.db` instead of the root directory.

## 3. Updating Google OAuth Authorized URIs
When deploying, your domain will change from `localhost` to something like `https://my-personal-agent.onrender.com`.
1. Go to the **Google Cloud Console**.
2. Navigate to APIs & Services -> Credentials.
3. Edit your OAuth 2.0 Client ID.
4. Add your new production URL to **Authorized JavaScript origins**.
5. Add your new callback URL (e.g., `https://my-personal-agent.onrender.com/auth/callback`) to **Authorized redirect URIs**.
