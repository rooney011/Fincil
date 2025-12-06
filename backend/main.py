# backend/main.py
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
import google.generativeai as genai

# Import your custom modules
from parser_service import parse_statement_with_ai
from agent_graph import app as agent_app # Import the LangGraph brain

load_dotenv()

# --- 1. CONFIGURATION ---
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"), 
    os.getenv("SUPABASE_KEY")
)

app = FastAPI()

# --- 2. CORS (Security) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow your Next.js app to talk to Python
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. DATA MODELS ---
class DebateRequest(BaseModel):
    query: str
    user_id: str

# --- 4. ENDPOINT: FILE UPLOAD (The "Instant Context" Feature) ---
@app.post("/upload")
async def upload_transactions(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    print(f"Received file: {file.filename} for user: {user_id}")
    
    try:
        content = await file.read()
        transactions = await parse_statement_with_ai(content, file.content_type)
        print(f"Extracted {len(transactions)} transactions")
        
        data_to_insert = []
        for tx in transactions:
            # Generate Embedding for search using Gemini
            text_to_embed = f"{tx['description']} {tx['category']}"
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text_to_embed,
                task_type="retrieval_document"
            )
            
            data_to_insert.append({
                "user_id": user_id,
                "transaction_date": tx['date'],
                "description": tx['description'],
                "amount": tx['amount'],
                "category": tx['category'],
                "embedding": result['embedding']
            })
            
        if data_to_insert:
            supabase.table("transactions").insert(data_to_insert).execute()
            return {"status": "success", "inserted": len(data_to_insert)}
        
        return {"status": "no_data_found"}

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 5. ENDPOINT: THE DEBATE (The "Council" Feature) ---
@app.post("/api/debate")
async def run_debate(request: DebateRequest):
    print(f"Starting debate for: {request.query}")
    
    # Initialize the State for LangGraph
    inputs = {
        "query": request.query,
        "user_id": request.user_id,
        "profile": {},      # Will be filled by retrieve_data
        "transactions": [], # Will be filled by retrieve_data
        "miser_opinion": "",
        "visionary_opinion": "",
        "final_decision": ""
    }
    
    try:
        # Run the Agent Graph
        result = agent_app.invoke(inputs)
        
        # Return the final opinions to Frontend
        return {
            "miser": result["miser_opinion"],
            "visionary": result["visionary_opinion"],
            "twin": result["final_decision"]
        }
    except Exception as e:
        print(f"Debate Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))