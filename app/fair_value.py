"""
fair_value.py
-------------
Calculates the intrinsic (fair) value of a stock using two methods:

1. Benjamin Graham Formula: √(22.5 × EPS × Book Value)
2. Simplified DCF (Discounted Cash Flow) per share
"""

import math

DCF_TERMINAL_GROWTH  = 0.03
DCF_DISCOUNT_RATE    = 0.10
DCF_YEARS            = 10
MARGIN_OF_SAFETY     = 0.20


def graham_fair_value(eps: float, book_value: float) -> float | None:
    if not eps or not book_value or eps <= 0 or book_value <= 0:
        return None
    return round(math.sqrt(22.5 * eps * book_value), 2)


def dcf_fair_value(
    free_cash_flow: float,
    shares_outstanding: float,
    revenue_growth: float = 0.0,
    earnings_growth: float = 0.0,
) -> float | None:
    """
    DCF per share — uses FCF per share instead of total FCF.
    This avoids the inflated values caused by dividing total FCF by market cap.
    """
    if not free_cash_flow or not shares_outstanding:
        return None
    if free_cash_flow <= 0 or shares_outstanding <= 0:
        return None

    # FCF per share
    fcf_per_share = free_cash_flow / shares_outstanding

    # Growth rate
    growth = (revenue_growth + earnings_growth) / 2 if (
        revenue_growth and earnings_growth
    ) else 0.08
    growth = max(DCF_TERMINAL_GROWTH, min(0.25, growth))

    # Project FCF per share and discount
    total_pv = 0.0
    fcf = fcf_per_share
    for year in range(1, DCF_YEARS + 1):
        fcf *= (1 + growth)
        total_pv += fcf / ((1 + DCF_DISCOUNT_RATE) ** year)

    # Terminal value
    terminal_value = (fcf * (1 + DCF_TERMINAL_GROWTH)) / (DCF_DISCOUNT_RATE - DCF_TERMINAL_GROWTH)
    terminal_pv    = terminal_value / ((1 + DCF_DISCOUNT_RATE) ** DCF_YEARS)

    return round(total_pv + terminal_pv, 2)


def _valuation_label(upside: float) -> str:
    if upside > 40:  return "STRONGLY UNDERVALUED"
    if upside > 20:  return "UNDERVALUED"
    if upside > 0:   return "FAIRLY VALUED"
    if upside > -20: return "OVERVALUED"
    return "STRONGLY OVERVALUED"


def calculate_fair_value(data: dict) -> dict:
    price              = data.get("price") or 0
    eps                = data.get("eps") or 0
    book_value         = data.get("book_value") or 0
    free_cash_flow     = data.get("free_cash_flow") or 0
    shares_outstanding = data.get("shares_outstanding") or 0
    revenue_growth     = data.get("revenue_growth") or 0
    earnings_growth    = data.get("earnings_growth") or 0

    graham = graham_fair_value(eps, book_value)
    dcf    = dcf_fair_value(
        free_cash_flow, shares_outstanding,
        revenue_growth, earnings_growth
    )

    available    = [v for v in [graham, dcf] if v is not None]
    methods_used = (["graham"] if graham else []) + (["dcf"] if dcf else [])
    avg_fair     = round(sum(available) / len(available), 2) if available else None
    safe_value   = round(avg_fair * (1 - MARGIN_OF_SAFETY), 2) if avg_fair else None

    upside = None
    if avg_fair and price > 0:
        upside = round((avg_fair - price) / price * 100, 1)

    return {
        "graham_value":   graham,
        "dcf_value":      dcf,
        "avg_fair_value": avg_fair,
        "safe_value":     safe_value,
        "upside_pct":     upside,
        "valuation":      _valuation_label(upside) if upside is not None else "N/A",
        "methods_used":   methods_used,
    }