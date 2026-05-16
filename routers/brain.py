from fastapi import APIRouter, Depends, HTTPException, Header
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

class ResolveActionPayload(BaseModel):
    status: str # COMPLETED or REJECTED

@router.post("/process-email")
def process_email(payload: EmailPayload, db: Session = Depends(get_db), x_gemini_api_key: str = Header(None)):
    if not x_gemini_api_key:
        raise HTTPException(status_code=400, detail="Missing X-Gemini-Api-Key header. Please provide your Gemini API Key in the Extension settings.")

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
        llm_response = generate_content_with_logging(prompt, api_key=x_gemini_api_key)
        # Clean JSON if wrapped in markdown
        if llm_response.startswith("```json"):
            llm_response = llm_response.replace("```json", "").replace("```", "").strip()
            
        result = json.loads(llm_response)
        classification = result.get("classification", "IGNORE").upper()
        
        # 2. Only create an action if it's URGENT or ACTIONABLE
        action_id = None
        if classification in ["URGENT", "ACTIONABLE"]:
            action_payload = {
                "email_id": payload.message_id,
                "sender": payload.sender,
                "subject": payload.subject,
                "draft": result.get("draft"),
                "classification": classification
            }
            action = Action(
                action_type="DRAFT_REPLY",
                status="PENDING_APPROVAL",
                payload=json.dumps(action_payload)
            )
            db.add(action)
            db.commit()
            db.refresh(action)
            action_id = action.id
        
        return {
            "action_id": action_id,
            "classification": classification,
            "draft": result.get("draft")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pending-actions")
def get_pending_actions(db: Session = Depends(get_db)):
    actions = db.query(Action).filter(Action.status == "PENDING_APPROVAL").all()
    result = []
    for action in actions:
        result.append({
            "id": action.id,
            "action_type": action.action_type,
            "payload": json.loads(action.payload),
            "created_at": action.created_at
        })
    return result

@router.post("/actions/{action_id}/resolve")
def resolve_action(action_id: int, payload: ResolveActionPayload, db: Session = Depends(get_db)):
    if payload.status not in ["COMPLETED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be COMPLETED or REJECTED")
        
    action = db.query(Action).filter(Action.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    action.status = payload.status
    db.commit()
    return {"message": f"Action {action_id} marked as {payload.status}"}
