"""
alerts.py
---------
Price alert system for Mizan Halal Screener.

Checks if stocks in the user's watchlist have reached
their target price and returns triggered alerts.
"""

from app.market_data import get_stock_data
from app.database import SessionLocal, Watchlist


def check_alerts(user_id: int) -> list[dict]:
    """
    Checks all watchlist items for a user and returns
    triggered alerts (stocks that reached target price).

    Args:
        user_id: The user's ID.

    Returns:
        List of dicts with triggered alerts.
    """
    db = SessionLocal()
    alerts = []

    try:
        items = db.query(Watchlist).filter(
            Watchlist.user_id == user_id,
            Watchlist.target_price != None
        ).all()

        for item in items:
            data = get_stock_data(item.ticker)
            if not data.get("available"):
                continue

            current_price = data.get("price") or 0
            target_price  = item.target_price

            if current_price <= target_price:
                alerts.append({
                    "ticker":        item.ticker,
                    "name":          item.name,
                    "current_price": current_price,
                    "target_price":  target_price,
                    "difference_pct": round(
                        (target_price - current_price) / target_price * 100, 1
                    ),
                    "halal_status":  item.halal_status,
                    "message": (
                        f"{item.ticker} has reached your target price! "
                        f"Current: ${current_price:.2f} "
                        f"Target: ${target_price:.2f}"
                    ),
                })

    finally:
        db.close()

    return alerts