"""
Expense Analysis Module
Provides analytics functions for user spending patterns
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict


def get_expense_summary(transactions: List[Dict], days: int = 30) -> Dict:
    """
    Calculate overall spending summary
    
    Args:
        transactions: List of transaction dicts from database
        days: Number of days to analyze
        
    Returns:
        Dict with total_spent, daily_average, transaction_count, top_category
    """
    if not transactions:
        return {
            "total_spent": 0,
            "daily_average": 0,
            "transaction_count": 0,
            "top_category": None,
            "date_range_days": days
        }
    
    # Calculate totals (amounts are negative for expenses)
    total_spent = sum(abs(tx['amount']) for tx in transactions)
    transaction_count = len(transactions)
    
    # Calculate daily average
    daily_average = total_spent / days if days > 0 else 0
    
    # Find top category
    category_totals = defaultdict(float)
    for tx in transactions:
        category_totals[tx['category']] += abs(tx['amount'])
    
    top_category = max(category_totals.items(), key=lambda x: x[1])[0] if category_totals else None
    
    return {
        "total_spent": round(total_spent, 2),
        "daily_average": round(daily_average, 2),
        "transaction_count": transaction_count,
        "top_category": top_category,
        "date_range_days": days
    }


def get_category_breakdown(transactions: List[Dict]) -> List[Dict]:
    """
    Group transactions by category with totals and percentages
    
    Args:
        transactions: List of transaction dicts from database
        
    Returns:
        List of dicts with category, total, percentage, count
    """
    if not transactions:
        return []
    
    category_data = defaultdict(lambda: {"total": 0, "count": 0, "transactions": []})
    total_spent = 0
    
    for tx in transactions:
        amount = abs(tx['amount'])
        category = tx['category']
        
        category_data[category]["total"] += amount
        category_data[category]["count"] += 1
        category_data[category]["transactions"].append(tx)
        total_spent += amount
    
    # Build result list with percentages
    result = []
    for category, data in category_data.items():
        percentage = (data["total"] / total_spent * 100) if total_spent > 0 else 0
        result.append({
            "category": category,
            "total": round(data["total"], 2),
            "percentage": round(percentage, 1),
            "count": data["count"]
        })
    
    # Sort by total descending
    result.sort(key=lambda x: x["total"], reverse=True)
    
    return result


def get_spending_trends(transactions: List[Dict], period: str = "daily") -> List[Dict]:
    """
    Calculate spending trends over time
    
    Args:
        transactions: List of transaction dicts from database
        period: 'daily', 'weekly', or 'monthly'
        
    Returns:
        List of dicts with date/period and amount
    """
    if not transactions:
        return []
    
    trends = defaultdict(float)
    
    for tx in transactions:
        tx_date = tx.get('transaction_date')
        if not tx_date:
            continue
        
        # Parse date if it's a string
        if isinstance(tx_date, str):
            tx_date = datetime.fromisoformat(tx_date.replace('Z', '+00:00'))
        
        amount = abs(tx['amount'])
        
        # Group by period
        if period == "daily":
            key = tx_date.strftime("%Y-%m-%d")
        elif period == "weekly":
            # Get week start (Monday)
            week_start = tx_date - timedelta(days=tx_date.weekday())
            key = week_start.strftime("%Y-%m-%d")
        else:  # monthly
            key = tx_date.strftime("%Y-%m")
        
        trends[key] += amount
    
    # Convert to sorted list
    result = [
        {"period": period_key, "amount": round(amount, 2)}
        for period_key, amount in sorted(trends.items())
    ]
    
    return result


def get_recent_transactions(
    transactions: List[Dict], 
    limit: int = 50,
    category_filter: Optional[str] = None,
    source_filter: Optional[str] = None
) -> List[Dict]:
    """
    Get recent transactions with optional filters
    
    Args:
        transactions: List of transaction dicts from database
        limit: Maximum number of transactions to return
        category_filter: Optional category to filter by
        source_filter: Optional source to filter by ('uploaded' or 'logged')
        
    Returns:
        List of transaction dicts
    """
    # Apply filters
    filtered = transactions
    
    if category_filter:
        filtered = [tx for tx in filtered if tx.get('category') == category_filter]
    
    if source_filter:
        filtered = [tx for tx in filtered if tx.get('source') == source_filter]
    
    # Sort by date descending
    filtered.sort(
        key=lambda x: x.get('transaction_date', ''), 
        reverse=True
    )
    
    # Limit results
    return filtered[:limit]


def format_transaction_for_display(tx: Dict) -> Dict:
    """
    Format a transaction for frontend display
    
    Args:
        tx: Raw transaction dict from database
        
    Returns:
        Formatted transaction dict
    """
    return {
        "id": tx.get('id'),
        "description": tx.get('description'),
        "amount": abs(tx.get('amount', 0)),
        "category": tx.get('category'),
        "date": tx.get('transaction_date'),
        "source": tx.get('source', 'uploaded')
    }
