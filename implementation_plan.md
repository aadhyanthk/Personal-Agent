# Personal Operations Agent Implementation Plan

This plan breaks down the development of the Personal Operations Agent into manageable phases, adhering strictly to the constraints and mandates outlined in `GEMINI.md` and `Prompt_Contract.md`.

## Phase 1: Foundation & Observability
**Goal:** Set up the project structure and implement the "Logging Mandate".
*   Initialize FastAPI application structure (routers, models, core, services).
*   Set up SQLite database using an ORM (e.g., SQLAlchemy or SQLModel).
*   Create Database Schemas:
    *   `Emails`: To store fetched emails.
    *   `Actions`: To store proposed actions (`status="PENDING_APPROVAL"`).
    *   `LLMLogs`: To log `prompt_tokens`, `completion_tokens`, `total_cost`, and `latency` for every LLM call.
*   Implement the LLM wrapper function to automatically log metrics to `LLMLogs`.

## Phase 2: Authentication
**Goal:** Implement secure access to Google APIs.
*   Set up Google Cloud Console project and configure OAuth consent screen.
*   Implement Google OAuth2 (Sign-In) in FastAPI (`/auth/login`, `/auth/callback`).
*   Securely store OAuth tokens (access/refresh) for Gmail and Calendar API access.

## Phase 3: Core API Services (Read-Only)
**Goal:** Connect to external services to pull data.
*   Implement Gmail API service to fetch recent emails.
*   Implement Google Calendar API service to read user availability.
*   Set up the local Vector Store (ChromaDB or FAISS) for semantic context/RAG (e.g., storing past decisions or user preferences).

## Phase 4: The Custom Agent Loop
**Goal:** Build the transparent, framework-free agent state machine.
*   Develop the core Python `while` loop or state machine.
*   Integrate Google Gemini via the Gen AI SDK (using the wrapper from Phase 1).
*   Implement standard prompts and logic for:
    *   **Classification:** Tagging emails as Urgent, Actionable, or Ignore.
    *   **Drafting:** Generating reply drafts based on context.
    *   **Scheduling:** Suggesting optimal calendar slots.
*   **Enforce the "Do Not Send" Mandate:** Ensure the loop saves all drafted replies and schedule proposals to the `Actions` table with `status="PENDING_APPROVAL"`. It must *never* execute them autonomously.

## Phase 5: The Human-in-the-Loop Web Dashboard
**Goal:** Build the UI for human approval and transparency.
*   Create a simple, aesthetic web UI served by FastAPI (HTML/JS/CSS or Jinja2).
*   Build the **Dashboard View**: Display a queue of all `PENDING_APPROVAL` actions.
*   Build the **Approval UI**: Buttons to Approve, Reject, or Edit proposed actions.
*   **Enforce the "Failure Documentation Mandate":** Add a feedback mechanism in the UI where the user can correct misclassifications or tone, logging this feedback back into the database.

## Phase 6: Action Execution
**Goal:** Execute the actions safely after approval.
*   Implement the execution routes (e.g., `/actions/{id}/approve`).
*   Wire the approval endpoints to the Gmail API (to actually send the drafted email) and Calendar API (to actually create the event).
*   Update the action status in the database to `COMPLETED` or `REJECTED` accordingly.

## Phase 7: Polish & Background Processing
**Goal:** Automate the reading loop.
*   Implement a background scheduler (e.g., APScheduler or FastAPI background tasks) to periodically check for new emails and run them through the Agent Loop.
*   Refine error handling, logging, and UI polish.
