# backend/parser_service.py
import pdfplumber
import pandas as pd
import io
import json
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Groq
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0, api_key=os.getenv("GROQ_API_KEY"))

async def extract_text_from_pdf(file_content: bytes):
    text = ""
    with pdfplumber.open(io.BytesIO(file_content)) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text[:4000]

# THIS IS THE FUNCTION YOUR MAIN.PY IS LOOKING FOR
async def parse_statement_with_ai(file_content: bytes, file_type: str):
    if file_type == "text/csv" or file_type == "application/vnd.ms-excel":
        df = pd.read_csv(io.BytesIO(file_content))
        transactions = []
        for _, row in df.iterrows():
            desc = row.get('Description') or row.get('Memo') or 'Unknown'
            amt = row.get('Amount') or row.get('Debit') or 0
            date = row.get('Date') or row.get('Posting Date')
            transactions.append({
                "date": str(date), 
                "description": str(desc), 
                "amount": float(amt),
                "category": "Uncategorized"
            })
        return transactions

    elif file_type == "application/pdf":
        raw_text = await extract_text_from_pdf(file_content)
        
        prompt = f"""
        You are a financial data extractor. 
        Analyze the bank statement text below.
        Extract transactions into a strictly valid JSON array.
        
        Rules:
        1. Format: {{"date": "YYYY-MM-DD", "description": "text", "amount": float, "category": "guess_one_word"}}
        2. Expenses must be NEGATIVE numbers (e.g., -15.00). Income POSITIVE.
        3. Ignore headers, balances, and page numbers.
        
        DATA:
        {raw_text}
        """

        response = llm.invoke([SystemMessage(content=prompt)])
        content = response.content.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return []
            
    else:
        raise ValueError("Unsupported file type")