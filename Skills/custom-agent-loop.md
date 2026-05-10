# Skill: Transparent Custom Agent Loop with Logging

## Overview
Instead of using black-box frameworks like LangChain or AutoGen, this project requires a custom, transparent Python loop. This ensures we have explicit hooks to measure latency, track token usage/costs, document failure cases, and enforce human-in-the-loop approvals before risky actions.

## Core Concepts
1. **State**: The agent operates on a defined state (e.g., an incoming email, current context).
2. **Decision Router**: An LLM call that decides the next action (e.g., `draft_reply`, `suggest_meeting`, `ignore`).
3. **Execution vs. Proposal**: The agent executes safe actions (e.g., classification) but only *proposes* risky actions (e.g., sending an email). Proposals are saved to the database for human approval.
4. **Mandatory Logging Wrapper**: Every LLM call is wrapped in a function that records latency and token usage.

## Implementation Pattern

### 1. The Logging Wrapper
```python
import time
from google.generativeai import GenerativeModel
import sqlite3 # Or your ORM (SQLAlchemy)

model = GenerativeModel("gemini-1.5-flash")

def call_llm_with_metrics(prompt: str, context: str) -> str:
    start_time = time.time()
    
    # Calculate prompt tokens (approximate or use Gemini's count_tokens)
    # response = model.generate_content(prompt)
    # tokens = response.usage_metadata
    
    response = model.generate_content(prompt)
    
    end_time = time.time()
    latency = end_time - start_time
    
    prompt_tokens = response.usage_metadata.prompt_token_count
    completion_tokens = response.usage_metadata.candidates_token_count
    
    # Log to SQLite
    conn = sqlite3.connect("metrics.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO llm_logs (prompt_tokens, completion_tokens, latency, timestamp) VALUES (?, ?, ?, ?)",
        (prompt_tokens, completion_tokens, latency, time.time())
    )
    conn.commit()
    
    return response.text
```

### 2. The Agent Loop
```python
def process_incoming_email(email_data):
    # Step 1: Classify
    classification_prompt = f"Classify this email (URGENT, ACTIONABLE, IGNORE):\n{email_data['body']}"
    classification = call_llm_with_metrics(classification_prompt, context="Classification step")
    
    if "IGNORE" in classification.upper():
        log_action(email_data['id'], "Ignored")
        return
        
    # Step 2: Draft Reply (if actionable)
    draft_prompt = f"Draft a polite, professional reply to this email:\n{email_data['body']}"
    draft = call_llm_with_metrics(draft_prompt, context="Drafting step")
    
    # Step 3: Propose Action (Human-in-the-loop)
    # DO NOT SEND. Save to DB for approval.
    propose_action_to_db(
        action_type="send_email",
        target=email_data['sender'],
        content=draft,
        status="PENDING_APPROVAL"
    )
```

## The Human-in-the-Loop Contract
The UI Dashboard will read from the `proposed_actions` table where `status == 'PENDING_APPROVAL'`. 
The user clicks "Approve", changing the status to `APPROVED`, which triggers a separate background worker to actually send the email via the Gmail API.
