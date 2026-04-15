"""
scorer.py
---------
Calculates two scores for each company:

1. Fundamental Score (0-100)
   Rates financial health based on:
   ROE, Profit Margin, P/E, P/B, Revenue Growth,
   Earnings Growth, Debt Ratio

2. Investment Score (0-100)
   Combines Fundamental Score + Fair Value Upside
   This is the FINAL ranking score used in Mizan.

HARAM companies always score 0.
"""

# ── Weights ───────────────────────────────────────────────────────────────────
WEIGHTS = {
    "roe":             20.0,   # Return on Equity
    "profit_margin":   20.0,   # Net Profit Margin
    "pe_ratio":        15.0,   # Price / Earnings
    "revenue_growth":  15.0,   # Revenue Growth
    "earnings_growth": 10.0,   # Earnings Growth
    "pb_ratio":        10.0,   # Price / Book
    "debt_ratio":      10.0,   # Debt / Market Cap
}

# Investment score weights
FUNDAMENTAL_WEIGHT = 0.60   # 60% fundamental
UPSIDE_WEIGHT      = 0.40   # 40% fair value upside

# QUESTIONABLE penalty
QUESTIONABLE_PENALTY = 0.85  # 15% penalty


# ── Individual scorers ────────────────────────────────────────────────────────

def _score_roe(roe: float) -> float:
    """ROE above 20% is excellent — max 20pts."""
    if roe <= 0:
        return 0.0
    return min(20.0, roe * 100)


def _score_margin(margin: float) -> float:
    """Profit margin above 20% is excellent — max 20pts."""
    if margin <= 0:
        return 0.0
    return min(20.0, margin * 100)


def _score_pe(pe: float) -> float:
    """
    P/E ratio scoring:
    ≤10 → 15pts (very cheap)
    ≤20 → 12pts (cheap)
    ≤30 → 8pts  (fair)
    ≤50 → 4pts  (expensive)
    >50 → 0pts  (very expensive)
    """
    if pe <= 0:
        return 0.0
    if pe <= 10: return 15.0
    if pe <= 20: return 12.0
    if pe <= 30: return 8.0
    if pe <= 50: return 4.0
    return 0.0


def _score_pb(pb: float) -> float:
    """
    P/B ratio scoring:
    ≤1 → 10pts (below book value)
    ≤2 → 8pts
    ≤3 → 5pts
    ≤5 → 2pts
    >5 → 0pts
    """
    if pb <= 0:
        return 0.0
    if pb <= 1: return 10.0
    if pb <= 2: return 8.0
    if pb <= 3: return 5.0
    if pb <= 5: return 2.0
    return 0.0


def _score_revenue_growth(growth: float) -> float:
    """Revenue growth above 15% is excellent — max 15pts."""
    if growth <= 0:
        return 0.0
    return min(15.0, growth * 100)


def _score_earnings_growth(growth: float) -> float:
    """Earnings growth above 10% is excellent — max 10pts."""
    if growth <= 0:
        return 0.0
    return min(10.0, growth * 100)


def _score_debt(debt_ratio: float) -> float:
    """
    Debt ratio scoring:
    ≤10% → 10pts (very low debt)
    ≤20% → 7pts
    ≤33% → 4pts
    ≤50% → 1pt
    >50% → 0pts
    """
    if debt_ratio <= 0.10: return 10.0
    if debt_ratio <= 0.20: return 7.0
    if debt_ratio <= 0.33: return 4.0
    if debt_ratio <= 0.50: return 1.0
    return 0.0


# ── Main scorers ──────────────────────────────────────────────────────────────

def calculate_fundamental_score(data: dict) -> float:
    """
    Calculates the Fundamental Score (0-100).

    Args:
        data: Company data dict from market_data.get_stock_data()

    Returns:
        Float between 0 and 100.
    """
    market_cap = data.get("market_cap") or 0
    debt       = data.get("debt")       or 0
    debt_ratio = debt / market_cap if market_cap else 0

    score = (
        _score_roe(data.get("roe") or 0)
        + _score_margin(data.get("profit_margin") or 0)
        + _score_pe(data.get("pe_ratio") or 0)
        + _score_pb(data.get("pb_ratio") or 0)
        + _score_revenue_growth(data.get("revenue_growth") or 0)
        + _score_earnings_growth(data.get("earnings_growth") or 0)
        + _score_debt(debt_ratio)
    )

    return round(max(0.0, min(100.0, score)), 2)


def calculate_investment_score(
    fundamental_score: float,
    upside_pct: float | None,
    status: str,
) -> float:
    """
    Calculates the Investment Score (0-100).
    Combines fundamental score + fair value upside.

    HARAM → always 0
    QUESTIONABLE → 15% penalty applied

    Args:
        fundamental_score: Score from calculate_fundamental_score()
        upside_pct:        Fair value upside % from fair_value.py
        status:            'HALAL' | 'QUESTIONABLE' | 'HARAM'

    Returns:
        Float between 0 and 100.
    """
    if status == "HARAM":
        return 0.0

    # Normalize upside to 0-100 scale
    # +50% upside → 100pts | 0% → 50pts | -50% → 0pts
    upside_score = 50.0  # default if no fair value data
    if upside_pct is not None:
        upside_score = max(0.0, min(100.0, upside_pct + 50))

    score = (
        fundamental_score * FUNDAMENTAL_WEIGHT
        + upside_score    * UPSIDE_WEIGHT
    )

    # Apply penalty for QUESTIONABLE
    if status == "QUESTIONABLE":
        score *= QUESTIONABLE_PENALTY

    return round(max(0.0, min(100.0, score)), 2)


def score_company(data: dict, status: str, upside_pct: float | None = None) -> dict:
    """
    Main function — scores a company completely.

    Args:
        data:       Company data dict from market_data.get_stock_data()
        status:     Halal status from screener.py
        upside_pct: Fair value upside % from fair_value.py (optional)

    Returns:
        Dict with keys:
          - fundamental_score:  float (0-100)
          - investment_score:   float (0-100)
          - grade:              str   (A+ to F)
    """
    fundamental = calculate_fundamental_score(data)
    investment  = calculate_investment_score(fundamental, upside_pct, status)

    # Letter grade
    if investment >= 80:   grade = "A+"
    elif investment >= 70: grade = "A"
    elif investment >= 60: grade = "B+"
    elif investment >= 50: grade = "B"
    elif investment >= 40: grade = "C"
    elif investment >= 30: grade = "D"
    else:                  grade = "F"

    return {
        "fundamental_score": fundamental,
        "investment_score":  investment,
        "grade":             grade,
    }