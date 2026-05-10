# Instructions for Building the Personal Operations Agent

Read this entire file before starting any task. This document serves as the ground truth for building the Personal Operations Agent.

## Project Vision
You are building an agent that manages my email, tasks, and calendar with **human-in-the-loop control**. 
The goal is not just to make it work, but to build a mature, production-ready system that highlights the hard lessons of AI engineering: **understanding when NOT to act autonomously, measuring costs, and tracking latency.**

### What it does:
1. Reads incoming emails (Gmail API).
2. Classifies them (Urgent, Actionable, Ignore).
3. Drafts replies.
4. Suggests calendar slots (Google Calendar API).
5. Logs everything to a task database.
6. **Crucial**: Asks for approval via a Web Dashboard before sending anything risky.

## Core Tech Stack
- **Backend**: Python (FastAPI).
- **Database**: SQLite (relational) / Postgres (if scaling later).
- **Vector Store**: ChromaDB or FAISS for semantic context.
- **LLM**: Google Gemini via Google Gen AI SDK.
- **Auth**: Google OAuth2 (Sign-In) to securely access user's Gmail/Calendar.
- **Agent Architecture**: Custom Python loop (NO LangChain, NO AutoGen).

## Architectural Mandates
1. **The Logging Mandate**: Every single call to the LLM must be wrapped in a function that records `prompt_tokens`, `completion_tokens`, `total_cost`, and `latency` in the SQLite database.
2. **The "Do Not Send" Mandate**: The agent can read and draft autonomously, but it can NEVER execute a state-mutating action (e.g., sending an email, booking an event) without explicit human approval. Action proposals must be saved to the database with a `status="PENDING_APPROVAL"`.
3. **The Transparency Mandate**: Use a raw Python loop/state-machine. Avoid abstraction layers so we can easily debug and measure the exact points of failure.
4. **The Failure Documentation Mandate**: The system must log failure cases (e.g., misclassified emails, wrong tone) so they can be analyzed later. Include a feedback mechanism in the UI.

## Skills & Documentation
To execute tasks for this project, heavily reference the custom guides located in the `skills/` directory:
- `skills/fastapi-google-oauth.md`: How to implement secure Google Sign-In and handle OAuth scopes for Gmail/Calendar.
- `skills/custom-agent-loop.md`: The pattern for building the transparent agent loop and the latency/token logging wrapper.

## Your Workflow
1. When asked to implement a feature, always consult the **Prompt Contract** (`Prompt_Contract.md`) to ensure you do not violate constraints.
2. Before modifying the agent loop, refer to `skills/custom-agent-loop.md`.
3. Always ask clarifying questions (Reverse Prompting) if a user requests a feature that might bypass the human-in-the-loop requirement.
4. Always commit your changes with standardized commit messages and push them to GitHub regularly.
