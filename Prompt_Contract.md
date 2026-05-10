# Prompt Contract: Personal Operations Agent

**GOAL**: 
Build a Personal Operations Agent using FastAPI that manages email and calendar with a human-in-the-loop web dashboard. It must classify emails, draft replies, suggest calendar slots, and log all decisions, latency, and token costs in SQLite. The agent must NEVER act autonomously on risky actions (like sending an email) without explicit human approval via the dashboard.

**CONSTRAINTS**:
- **Backend Framework**: Python (FastAPI).
- **Authentication**: Google OAuth2 (Google Sign-In) for accessing Gmail/Calendar APIs.
- **Database**: SQLite (for actions, token logs, latency) and a local Vector Store (ChromaDB or FAISS) for RAG context.
- **Agent Architecture**: Custom, lightweight Python loop. **Do not use heavy agent frameworks** (e.g., LangChain, AutoGen). Keep dependencies minimal to maintain explicit control over the state machine.
- **LLM**: Google Gemini models.

**FORMAT**:
- A robust FastAPI backend with clean routing (e.g., `/auth`, `/dashboard`, `/agent`, `/webhooks`).
- Database schema and ORM models for `Emails`, `Actions`, `Tokens`, and `Latency`.
- A simple web UI served by FastAPI (HTML/JS/CSS or Jinja2 templates) for the dashboard.
- A background worker or scheduling loop for checking emails periodically.

**FAILURE (any of these = not done)**:
- Agent sends an email or modifies a calendar event without dashboard approval.
- An LLM call is made but the token cost and latency are NOT logged in the SQLite database.
- Google OAuth is improperly configured or exposes credentials.
- The agent loop logic is abstracted away into a black-box framework instead of being transparently written in the codebase.
