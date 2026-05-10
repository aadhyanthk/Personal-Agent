from fastapi import FastAPI
from db.database import engine, Base
import db.models

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Operations Agent")

@app.get("/")
def read_root():
    return {"message": "Personal Operations Agent API is running."}
