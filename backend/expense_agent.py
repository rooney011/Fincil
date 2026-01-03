"""
Expense Analysis AI Agent
Handles natural language questions about user spending
"""

import os
from crewai import Agent, Task, Crew, LLM
from dotenv import load_dotenv
from typing import Dict, List
import json

load_dotenv()

# Setup LLM
llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY")
)

def run_expense_qa(question: str, transactions: List[Dict], profile: Dict) -> str:
    """
    Answer natural language questions about user expenses
    
    Args:
        question: User's question about their spending
        transactions: List of user's transactions
        profile: User's profile data
        
    Returns:
        Natural language answer with insights
    """
    
    # Prepare transaction summary for context
    total_spent = sum(abs(tx.get('amount', 0)) for tx in transactions)
    transaction_count = len(transactions)
    
    # Category breakdown
    from collections import defaultdict
    categories = defaultdict(float)
    for tx in transactions:
        categories[tx.get('category', 'Uncategorized')] += abs(tx.get('amount', 0))
    
    category_summary = "\n".join([
        f"  - {cat}: ₹{amt:.2f}" 
        for cat, amt in sorted(categories.items(), key=lambda x: x[1], reverse=True)
    ])
    
    # Recent transactions (last 10)
    recent_tx = sorted(
        transactions, 
        key=lambda x: x.get('transaction_date', ''), 
        reverse=True
    )[:10]
    
    recent_summary = "\n".join([
        f"  - {tx.get('description', 'N/A')}: ₹{abs(tx.get('amount', 0)):.2f} ({tx.get('category', 'N/A')})"
        for tx in recent_tx
    ])
    
    # Build context
    context = f"""
USER FINANCIAL PROFILE:
- Monthly Income: ₹{profile.get('monthly_income', 0):.2f}
- Monthly Expenses: ₹{profile.get('monthly_expenses', 0):.2f}
- Surplus: ₹{profile.get('monthly_income', 0) - profile.get('monthly_expenses', 0):.2f}
- Financial Goal: {profile.get('financial_goal', 'N/A')}
- Risk Tolerance: {profile.get('risk_tolerance', 'N/A')}

TRANSACTION DATA (Last 30 Days):
- Total Spent: ₹{total_spent:.2f}
- Transaction Count: {transaction_count}

SPENDING BY CATEGORY:
{category_summary}

RECENT TRANSACTIONS:
{recent_summary}
"""
    
    # Create analyst agent
    analyst = Agent(
        role='Financial Data Analyst',
        goal='Answer user questions about their spending with accurate data',
        backstory=f"""You are a financial data analyst who helps users understand their spending patterns.
        
You have access to the user's transaction history and profile data.
Your job is to answer their questions clearly, accurately, and helpfully.

RULES:
1. Base answers ONLY on the provided transaction data
2. If data is insufficient, say so clearly
3. Provide specific numbers and percentages
4. Offer actionable insights when relevant
5. Keep responses concise (2-4 sentences)
6. Use ₹ symbol for currency
7. Be conversational and supportive

CONTEXT:
{context}
""",
        verbose=False,
        llm=llm
    )
    
    # Create task
    task = Task(
        description=f"""Answer this question about the user's spending:

QUESTION: "{question}"

Analyze the transaction data and provide a clear, specific answer.
Include relevant numbers, categories, or trends.
If you notice any insights, share them briefly.
""",
        agent=analyst,
        expected_output="A clear, concise answer (2-4 sentences) with specific data points"
    )
    
    # Run crew
    try:
        crew = Crew(agents=[analyst], tasks=[task], verbose=False)
        result = crew.kickoff()
        answer = result.raw.strip()
        
        # Clean up any unwanted formatting
        answer = answer.replace("**", "").replace("Title:", "").strip()
        
        return answer if answer else "I couldn't analyze that data. Please try rephrasing your question."
        
    except Exception as e:
        print(f"Expense QA Error: {e}")
        return "I encountered an error analyzing your expenses. Please try again."


def get_suggested_questions(transactions: List[Dict]) -> List[str]:
    """
    Generate suggested questions based on available data
    
    Args:
        transactions: User's transaction list
        
    Returns:
        List of suggested question strings
    """
    if not transactions:
        return [
            "What are my recent expenses?",
            "How can I start tracking my spending?"
        ]
    
    # Get unique categories
    categories = set(tx.get('category', 'Uncategorized') for tx in transactions)
    top_category = None
    
    if categories:
        from collections import defaultdict
        cat_totals = defaultdict(float)
        for tx in transactions:
            cat_totals[tx.get('category', 'Uncategorized')] += abs(tx.get('amount', 0))
        top_category = max(cat_totals.items(), key=lambda x: x[1])[0]
    
    suggestions = [
        "What's my biggest expense category?",
        "How much did I spend in total?",
        "What are my recent transactions?"
    ]
    
    if top_category:
        suggestions.append(f"How much did I spend on {top_category}?")
    
    if len(transactions) >= 7:
        suggestions.append("Am I spending more this week than last week?")
    
    return suggestions
