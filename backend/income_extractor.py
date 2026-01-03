import re
from typing import Optional, Dict

def extract_income_from_text(text: str) -> Dict[str, any]:
    """
    Extract income amounts from appeal text using regex and keyword matching.
    
    Returns:
        dict: {
            'amount': float or None,
            'confidence': str ('high', 'medium', 'low'),
            'matched_text': str or None
        }
    """
    if not text:
        return {'amount': None, 'confidence': 'none', 'matched_text': None}
    
    text_lower = text.lower()
    
    # Keywords indicating income/money received
    income_keywords = [
        'won', 'earned', 'received', 'got', 'prize', 'salary', 
        'bonus', 'award', 'winning', 'income', 'freelance', 'gift',
        'paid', 'payment', 'cash'
    ]
    
    # Check if text contains income-related keywords
    has_income_keyword = any(keyword in text_lower for keyword in income_keywords)
    
    if not has_income_keyword:
        return {'amount': None, 'confidence': 'none', 'matched_text': None}
    
    # Regex patterns to match currency amounts
    patterns = [
        # Matches: ₹100000, ₹1,00,000, ₹ 100000
        r'₹\s*([0-9,]+(?:\.[0-9]{1,2})?)',
        # Matches: Rs 100000, Rs. 100000, Rs.100000
        r'[Rr]s\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)',
        # Matches: 100000 rupees, 1,00,000 rupees
        r'([0-9,]+(?:\.[0-9]{1,2})?)\s*rupees?',
        # Matches: INR 100000
        r'INR\s*([0-9,]+(?:\.[0-9]{1,2})?)',
        # Matches standalone numbers near income keywords (e.g., "won 100000")
        r'(?:won|earned|received|got|prize)\s+([0-9,]+(?:\.[0-9]{1,2})?)',
    ]
    
    amounts = []
    matched_texts = []
    
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            try:
                # Extract the number and remove commas
                amount_str = match.group(1).replace(',', '')
                amount = float(amount_str)
                
                # Sanity check: reasonable income range (₹100 to ₹100 million)
                if 100 <= amount <= 100000000:
                    amounts.append(amount)
                    matched_texts.append(match.group(0))
            except (ValueError, IndexError):
                continue
    
    if not amounts:
        return {'amount': None, 'confidence': 'low', 'matched_text': None}
    
    # Sum all extracted amounts (in case multiple income sources mentioned)
    total_amount = sum(amounts)
    
    # Determine confidence based on context
    confidence = 'high'
    
    # Lower confidence if:
    # - Amount seems unrealistic (> 10 million)
    if total_amount > 10000000:
        confidence = 'medium'
    
    # - Multiple different amounts found (might be confusion)
    if len(set(amounts)) > 3:
        confidence = 'medium'
    
    return {
        'amount': total_amount,
        'confidence': confidence,
        'matched_text': ', '.join(matched_texts)
    }


def format_income_message(extraction_result: Dict) -> str:
    """
    Format a user-friendly message about extracted income.
    
    Args:
        extraction_result: Result from extract_income_from_text()
    
    Returns:
        str: Formatted message or empty string if no income found
    """
    if not extraction_result.get('amount'):
        return ""
    
    amount = extraction_result['amount']
    confidence = extraction_result.get('confidence', 'medium')
    
    if confidence == 'high':
        return f"✅ Added ₹{amount:,.2f} to your available funds based on your appeal."
    elif confidence == 'medium':
        return f"⚠️ Added ₹{amount:,.2f} to your funds (please verify this amount is correct)."
    else:
        return f"ℹ️ Detected possible income of ₹{amount:,.2f} - please confirm."
