import os
import json
from typing import TypedDict, List, Annotated
from dotenv import load_dotenv
from supabase import create_client, Client
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, END
import google.generativeai as genai

# 1. Setup Environment
load_dotenv()

# Database Connection
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# AI Setup (Groq for Logic, Gemini for Embeddings)
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.6)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# 2. Define The Role-Based Personalities
# This is where we tailor the advice based on who the user is.
ROLE_PROMPTS = {
    "student": {
        "miser": "The user is a STUDENT. They likely have loans and limited income. Be extremely strict. Remind them that debt is a trap.",
        "visionary": "The user is a STUDENT. Advocate for spending ONLY if it helps their education, networking, or future career growth."
    },
    "developer": {
        "miser": "The user is a SOFTWARE DEVELOPER. They likely have high income but suffer from 'lifestyle creep'. Warn them about tech layoffs and burning cash on gadgets.",
        "visionary": "The user is a DEVELOPER. Advocate for spending on tools that save time or improve health (ergonomics, hardware). Time is their most valuable asset."
    },
    "freelancer": {
        "miser": "The user is a FREELANCER. Income is unstable. Scream about the 'Feast and Famine' cycle. They need a massive emergency fund.",
        "visionary": "The user is a FREELANCER. Advocate for spending that acts as a business expense or tax write-off. If it brings in more clients, buy it."
    },
    "teacher": {
        "miser": "The user is a TEACHER. Income is fixed and modest. Every rupee counts. Warn strictly against luxury or status signaling.",
        "visionary": "The user is a TEACHER. They work hard and risk burnout. Advocate for sustainable treats that improve mental health and patience."
    },
    "general": {
        "miser": "You are a conservative financial advisor. You hate risk.",
        "visionary": "You are an ambitious financial advisor. You love growth."
    }
}

# 3. Define the State (The "Clipboard" passed between agents)
class AgentState(TypedDict):
    query: str
    user_id: str
    profile: dict
    transactions: List[dict]
    miser_opinion: str
    visionary_opinion: str
    final_decision: str

# 4. Define the Nodes (The Logic Steps)

def retrieve_data(state: AgentState):
    """
    Step 1: Get User Profile & Search Past Transactions
    """
    print(f"--- RETRIEVING DATA FOR {state['user_id']} ---")
    
    # A. Fetch Profile (Income, Role, Goals)
    profile_response = supabase.table("user_profiles").select("*").eq("id", state["user_id"]).execute()
    profile = profile_response.data[0] if profile_response.data else {}
    
    # B. Vector Search for Context (Using Gemini Embeddings)
    # We need to turn the query (e.g., "Starbucks") into numbers to find similar past purchases
    embedding_result = genai.embed_content(
        model="models/text-embedding-004",
        content=state["query"],
        task_type="retrieval_query"
    )
    query_vector = embedding_result['embedding']

    # Call the SQL function 'match_transactions' we created in Supabase
    rpc_response = supabase.rpc("match_transactions", {
        "query_embedding": query_vector,
        "match_threshold": 0.5, # Lower threshold finds more loose matches
        "match_count": 5,
        "filter_user_id": state["user_id"]
    }).execute()
    
    return {"profile": profile, "transactions": rpc_response.data}

def miser_agent(state: AgentState):
    """
    Step 2: The Miser Critiques
    """
    print("--- MISER THINKING ---")
    
    # Get the specific role instruction (e.g., Student vs Dev)
    user_role = state['profile'].get('role', 'general')
    role_instruction = ROLE_PROMPTS.get(user_role, ROLE_PROMPTS['general'])['miser']
    
    prompt = f"""
    SYSTEM: {role_instruction}
    You are The Miser. You are risk-averse, cheap, and protective.
    
    USER CONTEXT:
    - Goal: {state['profile'].get('financial_goal')}
    - Monthly Income: ₹{state['profile'].get('monthly_income')}
    - Risk Tolerance: {state['profile'].get('risk_tolerance')}
    
    PAST TRANSACTIONS (Evidence):
    {json.dumps(state['transactions'], indent=2)}
    
    THE SITUATION:
    User wants to do this: "{state['query']}"
    
    TASK:
    Critique this decision brutally. Use their past transactions as evidence if applicable. 
    Keep it under 3 sentences.
    """
    
    response = llm.invoke([SystemMessage(content=prompt)])
    return {"miser_opinion": response.content}

def visionary_agent(state: AgentState):
    """
    Step 3: The Visionary Rebuts
    """
    print("--- VISIONARY THINKING ---")
    
    user_role = state['profile'].get('role', 'general')
    role_instruction = ROLE_PROMPTS.get(user_role, ROLE_PROMPTS['general'])['visionary']
    
    prompt = f"""
    SYSTEM: {role_instruction}
    You are The Visionary. You focus on ROI, happiness, and growth.
    
    THE ARGUMENT SO FAR:
    The Miser just said: "{state['miser_opinion']}"
    
    THE SITUATION:
    User wants to do this: "{state['query']}"
    
    TASK:
    Disagree with the Miser. Explain why this purchase might actually be a GOOD idea.
    Focus on the user's goal: {state['profile'].get('financial_goal')}.
    Keep it under 3 sentences.
    """
    
    response = llm.invoke([SystemMessage(content=prompt)])
    return {"visionary_opinion": response.content}

def twin_agent(state: AgentState):
    """
    Step 4: The Judge Decides
    """
    print("--- TWIN DECIDING ---")
    
    prompt = f"""
    You are The Twin (The Financial Council's Judge).
    You are balanced, fair, and logical.
    
    ARGUMENT A (The Miser): {state['miser_opinion']}
    ARGUMENT B (The Visionary): {state['visionary_opinion']}
    
    USER PROFILE:
    Income: ₹{state['profile'].get('monthly_income')}
    Expenses: ₹{state['profile'].get('monthly_expenses')}
    Role: {state['profile'].get('role')}
    
    TASK:
    Synthesize these arguments and give a final recommendation. 
    Be decisive. Yes, No, or "Yes, but...".
    """
    
    response = llm.invoke([SystemMessage(content=prompt)])
    return {"final_decision": response.content}

# 5. Build the Graph (The Workflow)
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("retrieve", retrieve_data)
workflow.add_node("miser", miser_agent)
workflow.add_node("visionary", visionary_agent)
workflow.add_node("twin", twin_agent)

# Set the Relay Race Order
workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "miser")
workflow.add_edge("miser", "visionary")
workflow.add_edge("visionary", "twin")
workflow.add_edge("twin", END)

# Compile the graph
app = workflow.compile()