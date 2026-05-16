import time
from google import genai
from db.database import SessionLocal
from db.models import LLMLog
import os
from dotenv import load_dotenv

load_dotenv()

# Pricing approximation (example: gemini-1.5-flash)
COST_PER_1K_PROMPT = 0.000075
COST_PER_1K_COMPLETION = 0.0003

def generate_content_with_logging(prompt: str, api_key: str, model_name: str = "gemini-1.5-flash") -> str:
    start_time = time.time()
    
    client = genai.Client(api_key=api_key)
    
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
    )
    
    latency_ms = (time.time() - start_time) * 1000
    
    # Calculate costs
    prompt_tokens = response.usage_metadata.prompt_token_count if response.usage_metadata else 0
    completion_tokens = response.usage_metadata.candidates_token_count if response.usage_metadata else 0
    
    total_cost = (prompt_tokens / 1000.0 * COST_PER_1K_PROMPT) + (completion_tokens / 1000.0 * COST_PER_1K_COMPLETION)
    
    # Log to DB
    db = SessionLocal()
    try:
        log_entry = LLMLog(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_cost=total_cost,
            latency_ms=latency_ms,
            model_name=model_name
        )
        db.add(log_entry)
        db.commit()
    finally:
        db.close()
        
    return response.text
