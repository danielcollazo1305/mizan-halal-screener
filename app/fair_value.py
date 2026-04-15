"""
fair_value.py
-------------
Calculates the intrinsic (fair) value of a stock using two methods:

1. Benjamin Graham Formula: √(22.5 × EPS × Book Value)
   - Classic, conservative, great for stable companies

2. Simplified DCF (Discounted Cash Flow):
   - Projects Free Cash Flow over 10 years
   - Discounts by estimated WACC (10%)
   - Adds terminal value

Returns fair value, upside/downside %, and valuation label.
"""

import math

# ── DCF Constants ─────────────────────────────────────────────────────────────
DCF_GROWTH_RATE_DEFAULT = 0.08   # assumed growth if no data (8%)
DCF_TERMINAL_GROWTH     = 0.03   # perpetual growth rate (3%)
DCF_DISCOUNT_RATE       = 0.10   # estimated WACC (10%)
DCF_YEARS               = 10     # projection years
MARGIN_OF_SAFETY        = 0.20   # 20% margin of safety (Graham principle)


# ── Graham Formula ────────────────────────────────────────────────────────────

def graham_fair_value(eps: float, book_value: float) -> float | None:
    """
    Benjamin Graham intrinsic value formula:
      Fair Value = √(22.5 × EPS × Book Value per Share)

    Returns None if data is insufficient or invalid.
    """
    if not eps or not book_value:
        return None
    if eps <= 0 or book_value <= 0:
        return None

    value = 22.5 * eps * book_value
    return round(math.sqrt(value), 2)


# ── DCF Formula ───────────────────────────────────────────────────────────────

def dcf_fair_value(
    free_cash_flow: float,
    market_cap: float,
    revenue_growth: float = 0.0,
    earnings_growth: float = 0.0,
) -> float | None:
    """
    Simplified DCF based on projected Free Cash Flow per share.

    Returns None if data is insufficient or invalid.
    """
    if not free_cash_flow or not market_cap:
        return None
    if free_cash_flow <= 0 or market_cap <= 0:
        return None

    # Estimate growth — average of revenue and earnings growth
    growth = (revenue_growth + earnings_growth) / 2 if (
        revenue_growth and earnings_growth
    ) else DCF_GROWTH_RATE_DEFAULT

    # Cap growth between terminal rate and 25%
    growth = max(DCF_TERMINAL_GROWTH, min(0.25, growth))

    # Project FCF and discount each year
    total_pv = 0.0
    fcf = free_cash_flow
    for year in range(1, DCF_YEARS + 1):
        fcf *= (1 + growth)
        pv = fcf / ((1 + DCF_DISCOUNT_RATE) ** year)
        total_pv += pv

    # Terminal value (Gordon Growth Model)
    terminal_fcf   = fcf * (1 + DCF_TERMINAL_GROWTH)
    terminal_value = terminal_fcf / (DCF_DISCOUNT_RATE - DCF_TERMINAL_GROWTH)
    terminal_pv    = terminal_value / ((1 + DCF_DISCOUNT_RATE) ** DCF_YEARS)

    intrinsic_value = total_pv + terminal_pv

    # Convert to price per share using FCF/MarketCap ratio
    shares_ratio = free_cash_flow / market_cap
    if shares_ratio <= 0:
        return None

    return round(intrinsic_value * shares_ratio, 2)


# ── Valuation label ───────────────────────────────────────────────────────────

def _valuation_label(upside: float) -> str:
    """Returns a human-readable valuation label based on upside %."""
    if upside > 40:
        return "STRONGLY UNDERVALUED"
    if upside > 20:
        return "UNDERVALUED"
    if upside > 0:
        return "FAIRLY VALUED"
    if upside > -20:
        return "OVERVALUED"
    return "STRONGLY OVERVALUED"


# ── Main calculator ───────────────────────────────────────────────────────────

def calculate_fair_value(data: dict) -> dict:
    """
    Calculates fair value using Graham and DCF methods.

    Args:
        data: Company data dict from market_data.get_stock_data()

    Returns:
        Dict with keys:
          - graham_value:    float | None
          - dcf_value:       float | None
          - avg_fair_value:  float | None  (average of available methods)
          - safe_value:      float | None  (avg with 20% margin of safety)
          - upside_pct:      float | None  (% upside from current price)
          - valuation:       str           (label)
          - methods_used:    list[str]     (which methods had enough data)
    """
    price          = data.get("price")        or 0
    eps            = data.get("eps")          or 0
    book_value     = data.get("book_value")   or 0
    free_cash_flow = data.get("free_cash_flow") or 0
    market_cap     = data.get("market_cap")   or 0
    revenue_growth = data.get("revenue_growth") or 0
    earnings_growth= data.get("earnings_growth") or 0

    graham = graham_fair_value(eps, book_value)
    dcf    = dcf_fair_value(
        free_cash_flow, market_cap,
        revenue_growth, earnings_growth
    )

    # Average of available methods
    available     = [v for v in [graham, dcf] if v is not None]
    methods_used  = (["graham"] if graham else []) + (["dcf"] if dcf else [])
    avg_fair      = round(sum(available) / len(available), 2) if available else None
    safe_value    = round(avg_fair * (1 - MARGIN_OF_SAFETY), 2) if avg_fair else None

    # Upside = (fair value - current price) / current price × 100
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