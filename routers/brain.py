from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Action
from core.llm_wrapper import generate_content_with_logging
import json

router = APIRouter(prefix="/api/brain", tags=["brain"])

class EmailPayload(BaseModel):
    message_id: str
    sender: str
    subject: str
    body: str

@router.post("/process-email")
def process_email(payload: EmailPayload, db: Session = Depends(get_db)):
    # 1. Use LLM to classify and draft reply
    prompt = f"""
    Analyze the following email:
    From: {payload.sender}
    Subject: {payload.subject}
    Body: {payload.body}
    
    1. Classify as URGENT, ACTIONABLE, or IGNORE.
    2. If not IGNORE, draft a polite and concise reply.
    
    Respond strictly in valid JSON format: {{"classification": "...", "draft": "..."}}
    """
    
    try:
        # LLM Logging Wrapper is used here
        llm_response = generate_content_with_logging(prompt)
        # Clean JSON if wrapped in markdown
        if llm_response.startswith("```json"):
            llm_response = llm_response.replace("```json", "").replace("```", "").strip()
            
        result = json.loads(llm_response)
        
        # 2. Save proposed action to DB
        action_payload = {
            "email_id": payload.message_id,
            "draft": result.get("draft")
        }
        action = Action(
            action_type="DRAFT_REPLY",
            status="PENDING_APPROVAL",
            payload=json.dumps(action_payload)
        )
        db.add(action)
        db.commit()
        db.refresh(action)
        
        return {
            "action_id": action.id,
            "classification": result.get("classification"),
            "draft": result.get("draft")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
