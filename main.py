from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from db.database import engine, Base
import db.models
from routers import brain
from dotenv import load_dotenv

load_dotenv()

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Operations Agent (Brain)")

# Allow requests from the Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow any origin for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(brain.router)

@app.get("/")
def read_root():
    return {"message": "Personal Operations Agent Brain API is running."}
