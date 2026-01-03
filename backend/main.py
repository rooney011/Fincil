import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv
import google.generativeai as genai

# --- IMPORTS ---
from parser_service import parse_statement_with_ai
# We import the new CrewAI engine here
from crew_agent import run_fincil_crew 
import config  # Import the new config
# Expense analysis imports
from expense_analysis import (
    get_expense_summary, 
    get_category_breakdown, 
    get_spending_trends,
    get_recent_transactions,
    format_transaction_for_display
)
from expense_agent import run_expense_qa, get_suggested_questions
# Income extraction for appeals
from income_extractor import extract_income_from_text, format_income_message

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
    allow_origins=config.ALLOWED_ORIGINS, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. DATA MODELS ---
class DebateRequest(BaseModel):
    query: str
    user_id: str
    amount: float = 0.0 

class TransactionRequest(BaseModel):
    user_id: str
    description: str
    amount: float
    category: str = "Uncategorized"

class AppealRequest(BaseModel):
    user_id: str
    conversation_id: Optional[str] = None
    original_query: str
    amount: float
    appeal_text: str
    previous_debate: list = []
    appeal_round: int = 1

class ExpenseRequest(BaseModel):
    user_id: str
    days: int = 30

class ExpenseQARequest(BaseModel):
    user_id: str
    question: str

# --- 4. ENDPOINT: FILE UPLOAD ---
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
            # Generate Embedding
            text_to_embed = f"{tx['description']} {tx['category']}"
            result = genai.embed_content(
                model=config.EMBEDDING_MODEL,
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

# --- 5. ENDPOINT: THE DEBATE (CrewAI Loop) ---
@app.post("/api/debate")
def run_debate(request: DebateRequest):
    print(f"Starting Debate Loop: {request.query}")
    
    try:
        # 1. Fetch Profile
        profile_response = supabase.table("user_profiles").select("*").eq("id", request.user_id).execute()
        profile = profile_response.data[0] if profile_response.data else {}

        # 2. Vector Search Context
        emb_result = genai.embed_content(
            model=config.EMBEDDING_MODEL, content=request.query, task_type="retrieval_query"
        )
        rpc_response = supabase.rpc("match_transactions", {
            "query_embedding": emb_result['embedding'], "match_threshold": config.MATCH_THRESHOLD, "match_count": config.MATCH_COUNT, "filter_user_id": request.user_id
        }).execute()
        
        # 3. Run the Looping Crew (Returns List of turns)
        transcript = run_fincil_crew(request.query, profile, rpc_response.data, request.amount)
        
        return {"transcript": transcript}

    except Exception as e:
        print(f"Debate Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# ... inside backend/main.py

@app.post("/api/execute-decision")
def execute_decision(request: TransactionRequest):
    print(f"Executing decision for {request.user_id}: {request.description}")
    
    try:
        # 1. Fetch Profile
        profile_res = supabase.table("user_profiles").select("*").eq("id", request.user_id).execute()
        if not profile_res.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        profile = profile_res.data[0]
        current_expenses = profile.get('monthly_expenses', 0) or 0
        monthly_income = profile.get('monthly_income', 0) or 0
        user_role = profile.get('role', 'general').lower()
        
        # Calculate current surplus BEFORE this transaction
        current_surplus = monthly_income - current_expenses
        
        # 2. SMART PAYMENT LOGIC
        
        deducted_amount = 0
        final_description = request.description
        is_deferred = False
        
        # Keywords
        is_education = any(kw in request.description.lower() for kw in config.EDU_KEYWORDS)
        
        # LOGIC TREE
        if request.amount <= current_surplus:
            # CASE A: CASH (Affordable)
            # The price fits in the surplus. Deduct full amount.
            deducted_amount = request.amount
            final_description = f"{request.description} (Cash)"
            print(f"Mode: CASH. Deducting {deducted_amount}")
            
        elif "student" in user_role and is_education:
            # CASE B: STUDENT DEFERRED LOAN
            # Deduct NOTHING now.
            deducted_amount = 0 
            is_deferred = True
            final_description = f"{request.description} (DEFERRED LOAN: ₹{request.amount})"
            print("Mode: DEFERRED. Deducting 0")
            
        else:
            # CASE C: STANDARD EMI (Laptop, Car, etc.)
            # If price > surplus, we MUST switch to EMI.
            total_cost = request.amount * (1 + config.INTEREST_RATE)
            emi = total_cost / 12
            
            # CRITICAL GUARDRAIL:
            # Even if it's EMI, we must check if the EMI itself sends them negative.
            # If EMI > Surplus, we strictly CAP the deduction to the surplus (or reject, but here we just cap to avoid negative DB).
            # Ideally, the Debate should have rejected this, but as a fail-safe:
            
            if emi > current_surplus:
                # If we are here, the user forced a buy that bankrupts them. 
                # We will log it, but we won't let the DB go negative math-wise if you want to avoid negative surplus.
                # However, for realism, if they forced it, they ARE negative.
                # BUT you asked to avoid negative. So let's cap it? 
                # No, let's trust the calculated EMI is the "deduction".
                deducted_amount = emi
                print(f"Mode: EMI. Calculated EMI: {emi}")
            else:
                deducted_amount = emi
                print(f"Mode: EMI. Calculated EMI: {emi}")

            final_description = f"{request.description} (EMI: ₹{emi:.0f}/mo)"

        # 3. Embedding
        text_to_embed = f"{final_description} {request.category}"
        embedding_result = genai.embed_content(
            model=config.EMBEDDING_MODEL, content=text_to_embed, task_type="retrieval_document"
        )
        
        # 4. Insert Transaction
        # "amount" in transaction table usually represents cash flow out.
        # If deferred, it's 0. If EMI, it's the EMI amount.
        ledger_amount = -abs(deducted_amount)
        
        transaction_data = {
            "user_id": request.user_id,
            "amount": ledger_amount,
            "description": final_description,
            "category": request.category if not is_deferred else "Liabilities",
            "transaction_date": "now()",
            "embedding": embedding_result['embedding'],
            "source": "logged"  # Mark as logged from AI Council decision
        }
        
        supabase.table("transactions").insert(transaction_data).execute()
        
        # 5. Update User Profile
        # This is where the bug likely was. We add ONLY the deducted_amount to expenses.
        
        new_expenses = current_expenses + deducted_amount
        
        # FINAL SAFETY CHECK: Prevent negative surplus
        # Calculate what the new surplus would be
        new_surplus = monthly_income - new_expenses
        
        if new_surplus < 0:
            # Transaction would create negative balance - REJECT IT
            available_surplus = monthly_income - current_expenses
            shortfall = abs(new_surplus)
            
            error_msg = (
                f"Insufficient funds to complete this transaction. "
                f"Available surplus: ₹{available_surplus:,.2f}, "
                f"Required amount: ₹{deducted_amount:,.2f}, "
                f"Shortfall: ₹{shortfall:,.2f}. "
                f"Please adjust the purchase amount or add more income."
            )
            
            print(f"TRANSACTION BLOCKED: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        supabase.table("user_profiles").update({
            "monthly_expenses": new_expenses
        }).eq("id", request.user_id).execute()
        
        return {
            "status": "success", 
            "message": f"Transaction logged: {final_description}",
            "deducted_amount": deducted_amount # Send this back to UI
        }

    except Exception as e:
        print(f"Error executing decision: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 6. HELPER FUNCTIONS FOR APPEALS ---
def format_debate_history(messages: list) -> str:
    """Format debate history into readable text for LLM context"""
    formatted = ""
    for msg in messages:
        agent = msg.get('agent', 'unknown').upper()
        content = msg.get('content', '')
        formatted += f"{agent}: {content}\n"
    return formatted

def extract_verdict(transcript: list) -> str:
    """Extract final verdict from transcript"""
    if not transcript:
        return "UNKNOWN"
    
    last_msg = transcript[-1] if transcript else {}
    content = last_msg.get('content', '').upper()
    
    if 'REJECT' in content or 'BLOCKED' in content or 'DENIED' in content:
        return 'REJECTED'
    elif 'APPROV' in content or 'SAFE' in content or 'WISE' in content:
        return 'APPROVED'
    else:
        return 'UNKNOWN'

# --- 7. ENDPOINT: SUBMIT APPEAL (Rebuttal Loop) ---
@app.post("/api/submit-appeal")
def submit_appeal(request: AppealRequest):
    print(f"Appeal #{request.appeal_round} submitted: {request.appeal_text[:50]}...")
    
    try:
        # 1. Fetch Profile
        profile_response = supabase.table("user_profiles").select("*").eq("id", request.user_id).execute()
        profile = profile_response.data[0] if profile_response.data else {}
        
        # 1.5. EXTRACT INCOME FROM APPEAL TEXT
        income_extraction = extract_income_from_text(request.appeal_text)
        extracted_income = income_extraction.get('amount', 0) or 0
        income_confidence = income_extraction.get('confidence', 'none')
        income_message = format_income_message(income_extraction)
        
        # If income detected, update user profile BEFORE crew evaluation
        profile_updated = False
        if extracted_income > 0:
            print(f"Extracted income: ₹{extracted_income} (confidence: {income_confidence})")
            
            # Get current monthly income
            current_income = profile.get('monthly_income', 0) or 0
            
            # Add extracted income to monthly income
            # Note: This treats all income as recurring. For one-time income,
            # you could add a separate field or create a temporary "windfall" adjustment.
            new_monthly_income = current_income + extracted_income
            
            # Update profile in database
            supabase.table("user_profiles").update({
                "monthly_income": new_monthly_income
            }).eq("id", request.user_id).execute()
            
            # Update local profile object for crew evaluation
            profile['monthly_income'] = new_monthly_income
            profile_updated = True
            
            print(f"Updated monthly_income: ₹{current_income} → ₹{new_monthly_income}")

        # 2. Vector Search Context (same as original debate)
        emb_result = genai.embed_content(
            model="models/text-embedding-004", 
            content=request.original_query, 
            task_type="retrieval_query"
        )
        rpc_response = supabase.rpc("match_transactions", {
            "query_embedding": emb_result['embedding'], 
            "match_threshold": 0.5, 
            "match_count": 5, 
            "filter_user_id": request.user_id
        }).execute()
        
        # 3. Build Extended Context with Appeal
        # Include income info if detected
        income_context = f"\n\n*** IMPORTANT: USER HAS ADDITIONAL FUNDS ***\nThe user mentioned receiving ₹{extracted_income:,.2f} in new income.\nThis has been added to their monthly income for re-evaluation.\n" if extracted_income > 0 else ""
        
        appeal_context = f"""
*** PREVIOUS DEBATE ***
{format_debate_history(request.previous_debate)}

*** USER'S COUNTER-ARGUMENT (Appeal #{request.appeal_round}) ***
"{request.appeal_text}"{income_context}

*** NEW INSTRUCTIONS ***
Re-evaluate your stance considering this new information.
The user has provided additional context that may change the financial calculus.
Be open to changing your position if the new evidence is compelling.
"""
        
        # 4. Run Crew with Appeal Context (using updated profile)
        transcript = run_fincil_crew(
            query=request.original_query,
            profile=profile,  # This now has updated income if applicable
            transactions=rpc_response.data,
            amount=request.amount,
            appeal_context=appeal_context,
            is_appeal=True
        )
        
        # 5. Extract Verdict
        final_verdict = extract_verdict(transcript)
        
        # 6. Store Appeal in Database
        appeal_data = {
            "conversation_id": request.conversation_id,
            "user_id": request.user_id,
            "original_query": request.original_query,
            "original_amount": request.amount,
            "appeal_text": request.appeal_text,
            "appeal_round": request.appeal_round,
            "previous_debate_history": request.previous_debate,
            "new_debate_history": transcript,
            "final_verdict": final_verdict
        }
        supabase.table("appeal_rounds").insert(appeal_data).execute()
        
        return {
            "transcript": transcript,
            "verdict": final_verdict,
            "appeal_round": request.appeal_round,
            "extracted_income": extracted_income if extracted_income > 0 else None,
            "income_message": income_message if income_message else None,
            "profile_updated": profile_updated
        }
    
    except Exception as e:
        print(f"Appeal Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 8. EXPENSE ANALYSIS ENDPOINTS ---

@app.post("/api/expense/summary")
def get_summary(request: ExpenseRequest):
    """Get overall expense summary for a user"""
    try:
        from datetime import datetime, timedelta
        
        # Calculate date range
        cutoff_date = datetime.now() - timedelta(days=request.days)
        
        # Fetch transactions
        response = supabase.table("transactions").select("*").eq(
            "user_id", request.user_id
        ).gte("transaction_date", cutoff_date.isoformat()).execute()
        
        transactions = response.data or []
        summary = get_expense_summary(transactions, request.days)
        
        return summary
        
    except Exception as e:
        print(f"Summary Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/expense/categories")
def get_categories(request: ExpenseRequest):
    """Get spending breakdown by category"""
    try:
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=request.days)
        
        response = supabase.table("transactions").select("*").eq(
            "user_id", request.user_id
        ).gte("transaction_date", cutoff_date.isoformat()).execute()
        
        transactions = response.data or []
        breakdown = get_category_breakdown(transactions)
        
        return {"categories": breakdown}
        
    except Exception as e:
        print(f"Categories Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/expense/trends")
def get_trends(request: ExpenseRequest):
    """Get spending trends over time"""
    try:
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=request.days)
        
        response = supabase.table("transactions").select("*").eq(
            "user_id", request.user_id
        ).gte("transaction_date", cutoff_date.isoformat()).execute()
        
        transactions = response.data or []
        
        # Determine period based on days
        period = "daily" if request.days <= 7 else "weekly" if request.days <= 60 else "monthly"
        trends = get_spending_trends(transactions, period)
        
        return {"trends": trends, "period": period}
        
    except Exception as e:
        print(f"Trends Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/expense/transactions")
def get_transactions(request: ExpenseRequest):
    """Get transaction history"""
    try:
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=request.days)
        
        response = supabase.table("transactions").select("*").eq(
            "user_id", request.user_id
        ).gte("transaction_date", cutoff_date.isoformat()).order(
            "transaction_date", desc=True
        ).execute()
        
        transactions = response.data or []
        formatted = [format_transaction_for_display(tx) for tx in transactions]
        
        return {"transactions": formatted, "count": len(formatted)}
        
    except Exception as e:
        print(f"Transactions Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/expense/ask")
def ask_expense_question(request: ExpenseQARequest):
    """AI-powered Q&A about expenses"""
    try:
        from datetime import datetime, timedelta
        
        # Fetch transactions (last 30 days for context)
        cutoff_date = datetime.now() - timedelta(days=30)
        
        tx_response = supabase.table("transactions").select("*").eq(
            "user_id", request.user_id
        ).gte("transaction_date", cutoff_date.isoformat()).execute()
        
        # Fetch profile
        profile_response = supabase.table("user_profiles").select("*").eq(
            "id", request.user_id
        ).execute()
        
        transactions = tx_response.data or []
        profile = profile_response.data[0] if profile_response.data else {}
        
        # Run AI agent
        answer = run_expense_qa(request.question, transactions, profile)
        suggestions = get_suggested_questions(transactions)
        
        return {
            "answer": answer,
            "suggested_questions": suggestions
        }
        
    except Exception as e:
        print(f"Expense QA Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
