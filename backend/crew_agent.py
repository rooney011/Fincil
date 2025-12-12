import os
import time
import re
from crewai import Agent, Task, Crew, Process, LLM
from dotenv import load_dotenv

load_dotenv()

# --- 1. SETUP BRAINS ---
llm_fast = LLM(
    model="groq/llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY")
)

llm_smart = LLM(
    model="groq/llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY")
)

# --- 1.5. FALLBACK RESPONSES (Prevents Turn Skipping) ---
FALLBACK_RESPONSES = {
    "miser": "I urge extreme caution here. Every rupee spent is a rupee that cannot be saved or invested for your future security.",
    "visionary": "Consider the potential return on this investment. Strategic spending today can unlock growth and opportunities tomorrow.",
    "referee": "CONTINUE",
    "twin": "Based on the financial data presented, I recommend careful consideration of the math before making a final decision."
}

def get_fallback_response(agent_type: str = "twin") -> str:
    """Returns a fallback response when an agent fails to produce output."""
    return FALLBACK_RESPONSES.get(agent_type.lower(), "I need more context to provide advice.")

# --- 2. HELPER: SAFE KICKOFF (With Response Validation) ---
def safe_kickoff(crew_instance, agent_type: str = "twin", min_words: int = 5):
    """
    Executes crew with retry logic for:
    - Rate limits (waits and retries)
    - Empty/short responses (retries up to max attempts)
    - Errors (returns fallback response)
    """
    max_retries = 5
    for attempt in range(max_retries):
        try:
            raw_output = crew_instance.kickoff().raw
            cleaned = clean_output(raw_output)
            
            # Validate response has substance (not empty or too short)
            if cleaned and len(cleaned.split()) >= min_words:
                return cleaned
            
            # Empty or too short - log and retry
            print(f"⚠️ Turn skip detected (empty/short response): '{cleaned}' - Retry {attempt + 1}/{max_retries}")
            time.sleep(1)
            continue
            
        except Exception as e:
            if "rate limit" in str(e).lower() or "429" in str(e):
                wait_time = 5 * (attempt + 1)
                print(f"⚠️ RATE LIMIT. Waiting {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"Agent Error: {e}")
                return get_fallback_response(agent_type)
    
    # All retries exhausted - use fallback
    print(f"⚠️ All retries exhausted for {agent_type}. Using fallback response.")
    return get_fallback_response(agent_type)

# --- 3. HELPER: OUTPUT CLEANER ---
def clean_output(text: str):
    """Cleans LLM output by removing internal reasoning markers."""
    if not text:
        return None
    text = re.sub(r'(?m)^(Thought|Action|Observation):.*$', '', text)
    text = re.sub(r'(?m)^Title:.*$', '', text)
    cleaned = text.strip()
    return cleaned if cleaned else None

# --- 4. DYNAMIC PERSONA GENERATOR ---
def get_role_context(role: str, emi_safety: str, is_education_loan: bool):
    role = role.lower()
    
    if is_education_loan:
        return (
            "User is a STUDENT (Education Loan). Critique the DEBT BURDEN only.",
            "User is a STUDENT. Future Career ROI > Current Debt. Fight for it."
        )

    if emi_safety == "DANGEROUS":
        return (
            "MATH ALERT: EMI > Surplus. IMPOSSIBLE. You MUST REJECT.",
            "MATH ALERT: EMI > Surplus. You MUST CONCEDE."
        )
        
    if "freelance" in role or "business" in role:
        miser_trigger = "User is a FREELANCER. Income varies. Check for backup funds."
        visionary_trigger = "User is a FREELANCER. Business Tool = Profit. Fight for it."
    elif "student" in role:
        miser_trigger = "User is a STUDENT. No income. Debt is highly risky."
        visionary_trigger = "User is a STUDENT. Skills are assets. Small EMI is okay."
    else:
        miser_trigger = "User is an EMPLOYEE. Prioritize savings."
        visionary_trigger = "User is an EMPLOYEE. Invest in productivity."

    return miser_trigger, visionary_trigger

# --- 5. MAIN LOGIC ---
def run_fincil_crew(query: str, profile: dict, transactions: list, amount: float, appeal_context: str = None, is_appeal: bool = False):
    
    monthly_income = profile.get('monthly_income', 0) or 0
    monthly_expenses = profile.get('monthly_expenses', 0) or 0
    surplus = monthly_income - monthly_expenses
    user_role = profile.get('role', 'General').lower()
    
    # --- FINANCE ENGINE ---
    # 1. Student Logic Normalizer
    if "student" in user_role:
        if surplus < 0: surplus = 0
        elif surplus == 0: surplus = 1000 

    # 2. Trivial Check
    is_trivial = amount < 1000 or (surplus > 0 and amount < (surplus * 0.05))
    
    # 3. Education Loan Check
    edu_keywords = ["course", "degree", "college", "tuition", "study", "university", "school", "mba", "masters"]
    is_education_purchase = any(word in query.lower() for word in edu_keywords)
    is_education_loan = "student" in user_role and is_education_purchase and amount > surplus

    # 4. Loan Calculations
    interest_rate = 0.15 
    tenure_months = 12
    total_interest = amount * interest_rate
    estimated_emi = (amount + total_interest) / tenure_months
    
    can_pay_cash = surplus >= amount
    
    math_verdict = ""
    emi_safety = ""
    
    if is_trivial:
        math_verdict = f"MICRO-TRANSACTION. Cost is negligible. Pay Cash."
        emi_safety = "SAFE"
    elif can_pay_cash:
        math_verdict = f"CASH PURCHASE. Affordable upfront. Surplus (₹{surplus}) > Price (₹{amount})."
        emi_safety = "SAFE"
    elif is_education_loan:
        math_verdict = "EDUCATION LOAN. Deferred Payment. Immediate Bankruptcy Check: BYPASSED."
        emi_safety = "DEFERRED" 
    else:
        emi_impact_percent = (estimated_emi / surplus * 100) if surplus > 0 else 999
        if emi_impact_percent > 100:
            emi_safety = "DANGEROUS"
            math_verdict = f"IMPOSSIBLE. EMI (₹{estimated_emi:.0f}) > Surplus (₹{surplus})."
        elif emi_impact_percent > 50:
            emi_safety = "RISKY"
            math_verdict = f"HIGH RISK. EMI is {emi_impact_percent:.1f}% of monthly surplus."
        else:
            emi_safety = "SAFE"
            math_verdict = f"AFFORDABLE. EMI is {emi_impact_percent:.1f}% of surplus."

    miser_instr, vis_instr = get_role_context(user_role, emi_safety, is_education_loan)

    # --- APPEAL CONTEXT INJECTION ---
    if is_appeal and appeal_context:
        miser_instr += f"\n\n{appeal_context}\n\nYou MUST reconsider your position based on this new evidence."
        vis_instr += f"\n\n{appeal_context}\n\nYou MUST reconsider your position based on this new evidence."

    stats = f"""
    ROLE: {user_role.upper()}
    SURPLUS: ₹{surplus}
    PRICE: ₹{amount}
    
    *** OFFICIAL MATH VERDICT ***
    {math_verdict}
    """

    # --- AGENTS (With Strict Response Rules) ---
    miser = Agent(
        role='The Miser',
        goal='Risk Assessment',
        backstory=f"""You are THE MISER - a strict financial guardian who protects wealth.
        
CONTEXT: {miser_instr}

MANDATORY RULES:
1. You MUST ALWAYS respond with a substantive argument (2-3 sentences)
2. NEVER skip your turn, stay silent, or say "pass"
3. If data is unclear, still provide cautious advice
4. Reference the surplus/price ratio when possible
5. Speak directly and with conviction

RESPONSE FORMAT: "[Financial concern]. [Evidence/Math]. [Your recommendation]."
""",
        verbose=False,
        llm=llm_fast
    )

    visionary = Agent(
        role='The Visionary',
        goal='Growth Strategy',
        backstory=f"""You are THE VISIONARY - an optimistic growth coach who sees opportunity.
        
CONTEXT: {vis_instr}

MANDATORY RULES:
1. You MUST ALWAYS respond with a substantive argument (2-3 sentences)
2. NEVER skip your turn, stay silent, or say "pass"
3. Counter the Miser's concerns with growth perspective
4. Focus on ROI, productivity, or life quality improvements
5. Speak directly and with optimism

RESPONSE FORMAT: "[Counter-argument]. [Potential benefit]. [Your recommendation]."
""",
        verbose=False,
        llm=llm_fast
    )

    referee = Agent(
        role='Referee',
        goal='Check agreement',
        backstory="""You analyze debate progress.

RULES:
1. If Miser uses words like "prudent", "safe", "affordable", "wise" or "I concede" -> Output: WINNER: VISIONARY
2. If Visionary uses words like "risky", "dangerous", "unwise" or "I concede" -> Output: WINNER: MISER
3. Otherwise -> Output: CONTINUE

You MUST output exactly one of: WINNER: VISIONARY, WINNER: MISER, or CONTINUE
""",
        verbose=False,
        llm=llm_fast
    )

    twin = Agent(
        role='The Twin',
        goal='Final Verdict',
        backstory="""You are THE TWIN - the final judge who delivers verdicts.

MANDATORY RULES:
1. You MUST ALWAYS deliver a clear verdict (APPROVED or REJECTED)
2. PRIORITIZE MATH OVER OPINIONS - if EMI > Surplus, REJECT
3. Provide 2-3 sentences explaining your decision
4. NEVER skip your turn or be indecisive

RESPONSE FORMAT: "[APPROVED/REJECTED]. [Mathematical justification]. [Final advice]."
""",
        verbose=False,
        llm=llm_smart
    )

    # --- DEBATE LOOP ---
    debate_transcript = []
    debate_context = ""
    max_rounds = 2 if is_trivial else 5
    round_count = 0
    consensus_reached = False
    
    print(f"\n--- DEBATE START ({user_role} | {emi_safety}) ---")

    while round_count < max_rounds:
        time.sleep(1)
        round_count += 1
        
        # MISER - Must respond with financial critique
        task_miser = Task(
            description=f"""Round {round_count}. 
FACTS: {stats}
DEBATE HISTORY: {debate_context}

Your task: Provide a 2-3 sentence financial critique. You MUST respond - do not skip your turn.""",
            agent=miser,
            expected_output="A 2-3 sentence financial critique with specific concerns"
        )
        msg_m = safe_kickoff(Crew(agents=[miser], tasks=[task_miser], verbose=False), agent_type="miser")
        debate_transcript.append({"agent": "miser", "content": msg_m})
        debate_context += f"\nMISER: {msg_m}"
        
        # VISIONARY - Must respond with growth perspective
        task_vis = Task(
            description=f"""Round {round_count}.
FACTS: {stats}
DEBATE HISTORY: {debate_context}

Your task: Counter the Miser's argument with a 2-3 sentence rebuttal. You MUST respond - do not skip your turn.""",
            agent=visionary,
            expected_output="A 2-3 sentence rebuttal focusing on growth/value"
        )
        msg_v = safe_kickoff(Crew(agents=[visionary], tasks=[task_vis], verbose=False), agent_type="visionary")
        debate_transcript.append({"agent": "visionary", "content": msg_v})
        debate_context += f"\nVISIONARY: {msg_v}"

        # REFEREE CHECK
        if emi_safety == "DANGEROUS" or is_trivial:
            pass 
        elif round_count < 2: 
            continue 

        task_ref = Task(
            description=f"""Analyze these arguments and determine if consensus is reached:
MISER: {msg_m}
VISIONARY: {msg_v}

Output exactly one of: WINNER: VISIONARY, WINNER: MISER, or CONTINUE""",
            agent=referee,
            expected_output="Exactly: WINNER: VISIONARY, WINNER: MISER, or CONTINUE"
        )
        status = safe_kickoff(Crew(agents=[referee], tasks=[task_ref], verbose=False), agent_type="referee", min_words=1).upper()
        
        if "WINNER" in status:
            consensus_reached = True
            final_text = ""
            if "MISER" in status:
                final_text = "REJECTED. The financial risk is too high."
            else:
                final_text = "APPROVED. The Council agrees this is a safe and wise purchase."
            debate_transcript.append({"agent": "twin", "content": final_text})
            break

    # TWIN INTERVENTION (The Safe-Guard)
    if not consensus_reached:
        # STRICT TWIN LOGIC - Must deliver final verdict
        task_twin = Task(
            description=f"""The agents debated for {round_count} rounds without reaching consensus. You must break the tie.

MATH VERDICT: {math_verdict}
SAFETY STATUS: {emi_safety}

DEBATE HISTORY:
{debate_context}

DECISION RULES:
1. IF Safety is SAFE or CASH PURCHASE -> YOU MUST APPROVE (unless it is a scam)
2. IF Safety is DEFERRED -> APPROVE (Education investment is valuable)
3. IF Safety is DANGEROUS -> REJECT (Math does not lie)

You MUST respond with: [APPROVED/REJECTED]. [Mathematical justification]. [Final advice].
Do NOT skip your turn or be indecisive.""",
            agent=twin,
            expected_output="A clear verdict (APPROVED or REJECTED) with 2-3 sentences of justification"
        )
        final_msg = safe_kickoff(Crew(agents=[twin], tasks=[task_twin], verbose=False), agent_type="twin")
        debate_transcript.append({"agent": "twin", "content": final_msg})

    return debate_transcript