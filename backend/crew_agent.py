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

# --- 2. HELPER: SAFE KICKOFF ---
def safe_kickoff(crew_instance):
    max_retries = 5
    for attempt in range(max_retries):
        try:
            raw_output = crew_instance.kickoff().raw
            return clean_output(raw_output)
        except Exception as e:
            if "rate limit" in str(e).lower() or "429" in str(e):
                wait_time = 5 * (attempt + 1)
                print(f"⚠️ RATE LIMIT. Waiting {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"Agent Error: {e}")
                return "I apologize, but I lost my train of thought."
    return "System Error: The Council is overloaded."

# --- 3. HELPER: OUTPUT CLEANER ---
def clean_output(text: str):
    text = re.sub(r'(?m)^(Thought|Action|Observation):.*$', '', text)
    text = re.sub(r'(?m)^Title:.*$', '', text)
    return text.strip()

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
def run_fincil_crew(query: str, profile: dict, transactions: list, amount: float):
    
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

    stats = f"""
    ROLE: {user_role.upper()}
    SURPLUS: ₹{surplus}
    PRICE: ₹{amount}
    
    *** OFFICIAL MATH VERDICT ***
    {math_verdict}
    """

    # --- AGENTS ---
    miser = Agent(
        role='The Miser',
        goal='Risk Assessment',
        backstory=f"""Strict financial guard.
        INSTRUCTION: {miser_instr}
        RULE: Speak directly. Max 2 sentences.""",
        verbose=False,
        llm=llm_fast
    )

    visionary = Agent(
        role='The Visionary',
        goal='Growth Strategy',
        backstory=f"""Optimistic growth coach.
        INSTRUCTION: {vis_instr}
        RULE: Speak directly. Max 2 sentences.""",
        verbose=False,
        llm=llm_fast
    )

    referee = Agent(
        role='Referee',
        goal='Check agreement',
        backstory="""
        Analyze the debate.
        1. If Miser says "prudent", "safe", "affordable", "wise" or "I concede" -> WINNER: VISIONARY.
        2. If Visionary says "risky", "dangerous", "unwise" or "I concede" -> WINNER: MISER.
        3. Else -> CONTINUE.
        """,
        verbose=False,
        llm=llm_fast
    )

    twin = Agent(
        role='The Twin',
        goal='Final Verdict',
        backstory="Final Judge. PRIORITIZE MATH OVER OPINIONS.",
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
        
        # MISER
        task_miser = Task(
            description=f"Round {round_count}. Facts: {stats}. History: {debate_context}. Critique. Max 2 sentences.",
            agent=miser,
            expected_output="Argument"
        )
        msg_m = safe_kickoff(Crew(agents=[miser], tasks=[task_miser], verbose=False))
        debate_transcript.append({"agent": "miser", "content": msg_m})
        debate_context += f"\nMISER: {msg_m}"
        
        # VISIONARY
        task_vis = Task(
            description=f"Round {round_count}. Facts: {stats}. History: {debate_context}. Rebut. Max 2 sentences.",
            agent=visionary,
            expected_output="Argument"
        )
        msg_v = safe_kickoff(Crew(agents=[visionary], tasks=[task_vis], verbose=False))
        debate_transcript.append({"agent": "visionary", "content": msg_v})
        debate_context += f"\nVISIONARY: {msg_v}"

        # REFEREE CHECK
        if emi_safety == "DANGEROUS" or is_trivial:
            pass 
        elif round_count < 2: 
            continue 

        task_ref = Task(
            description=f"Read: {msg_m} | {msg_v}. Output WINNER: [AGENT] or CONTINUE.",
            agent=referee,
            expected_output="Status"
        )
        status = safe_kickoff(Crew(agents=[referee], tasks=[task_ref], verbose=False)).upper()
        
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
        # STRICT TWIN LOGIC
        task_twin = Task(
            description=f"""
            Argued 5 rounds. Break the tie.
            
            MATH VERDICT: {math_verdict}
            SAFETY STATUS: {emi_safety}
            
            RULES:
            1. IF Safety is "SAFE" or "CASH PURCHASE" -> YOU MUST APPROVE. (Unless it's a scam).
            2. IF Safety is "DEFERRED" -> APPROVE (Education is good).
            3. IF Safety is "DANGEROUS" -> REJECT.
            
            Verdict: APPROVED/REJECTED [Reason].
            """,
            agent=twin,
            expected_output="Verdict"
        )
        final_msg = safe_kickoff(Crew(agents=[twin], tasks=[task_twin], verbose=False))
        debate_transcript.append({"agent": "twin", "content": final_msg})

    return debate_transcript