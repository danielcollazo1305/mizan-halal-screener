"""
recommendations.py
------------------
Monthly stock recommendations for Mizan Halal Screener.

Analyzes all stocks and returns the Top 3 halal picks
based on investment score and fair value upside.
"""

from app.market_data import get_stock_data
from app.halal_filter import classify_company
from app.fair_value import calculate_fair_value
from app.scorer import score_company

# Default tickers to analyze
TICKERS = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "META", "TSLA", "AMZN",
    "AVGO", "JNJ", "WMT", "V", "MA", "PG", "KO", "MCD",
    "NKE", "ADBE", "CRM", "AMD", "QCOM", "TXN", "COST",
]


def get_monthly_recommendations(top_n: int = 3) -> dict:
    """
    Analyzes stocks and returns the top halal picks for the month.

    Args:
        top_n: Number of recommendations to return (default: 3)

    Returns:
        Dict with top picks and analysis summary.
    """
    results = []

    for ticker in TICKERS:
        try:
            data = get_stock_data(ticker)
            if not data.get("available"):
                continue

            market_cap = data.get("market_cap") or 0
            debt       = data.get("debt") or 0
            debt_ratio = debt / market_cap if market_cap else 0

            halal = classify_company(
                sector        = data.get("sector", ""),
                debt_ratio    = debt_ratio,
                profit_margin = data.get("profit_margin") or 0,
                industry      = data.get("industry", ""),
            )

            # Only include HALAL stocks
            if halal["status"] != "HALAL":
                continue

            fair_value = calculate_fair_value(data)
            scores     = score_company(
                data       = data,
                status     = "HALAL",
                upside_pct = fair_value.get("upside_pct"),
            )

            results.append({
                "ticker":           ticker,
                "name":             data.get("name", ticker),
                "price":            data.get("price"),
                "grade":            scores["grade"],
                "investment_score": scores["investment_score"],
                "fundamental_score":scores["fundamental_score"],
                "fair_value":       fair_value.get("avg_fair_value"),
                "upside_pct":       fair_value.get("upside_pct"),
                "valuation":        fair_value.get("valuation"),
                "reason":           halal.get("reason"),
            })

        except Exception:
            continue

    # Sort by investment score
    results.sort(key=lambda x: x["investment_score"], reverse=True)
    top_picks = results[:top_n]

    return {
        "month":        _current_month(),
        "total_analyzed": len(results),
        "top_picks":    top_picks,
        "methodology":  (
            "Ranked by Investment Score (60% fundamentals + 40% fair value upside). "
            "Only HALAL stocks included."
        ),
    }


def _current_month() -> str:
    from datetime import datetime
    return datetime.utcnow().strftime("%B %Y")