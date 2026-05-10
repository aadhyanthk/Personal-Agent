from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Boolean
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    google_access_token = Column(String)
    google_refresh_token = Column(String)
    token_expires_at = Column(Integer) # Unix timestamp

class Email(Base):
    __tablename__ = "emails"
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String, unique=True, index=True)
    sender = Column(String, index=True)
    subject = Column(String)
    body = Column(Text)
    received_at = Column(DateTime)
    classification = Column(String) # Urgent, Actionable, Ignore

class Action(Base):
    __tablename__ = "actions"
    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String) # DRAFT_REPLY, SCHEDULE_MEETING
    status = Column(String, default="PENDING_APPROVAL") # PENDING_APPROVAL, COMPLETED, REJECTED
    payload = Column(Text) # JSON string of action details
    created_at = Column(DateTime, server_default=func.now())

class LLMLog(Base):
    __tablename__ = "llm_logs"
    id = Column(Integer, primary_key=True, index=True)
    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    total_cost = Column(Float)
    latency_ms = Column(Float)
    model_name = Column(String)
    created_at = Column(DateTime, server_default=func.now())
