"""
halal_filter.py
---------------
Classifies companies as HALAL, QUESTIONABLE, or HARAM
based on AAOIFI Islamic finance standards.
"""

# ── Thresholds ────────────────────────────────────────────────────────────────
# AAOIFI standard: debt must be below 33% of market cap
DEBT_HARAM_THRESHOLD         = 0.50   # above 50%  → HARAM
DEBT_QUESTIONABLE_THRESHOLD  = 0.33   # above 33%  → QUESTIONABLE

# Companies with persistently negative margins are financially unstable
MARGIN_QUESTIONABLE_THRESHOLD = -0.05  # below -5% → QUESTIONABLE

# ── Sector lists ──────────────────────────────────────────────────────────────
HARAM_SECTORS: list[str] = [
    # Interest-based finance (riba)
    "financial services",
    "banks",
    "banking",
    "insurance",
    "credit services",
    "capital markets",
    "mortgage finance",
    "consumer finance",
    # Alcohol
    "alcohol",
    "beverages - wineries & distilleries",
    # Other prohibited
    "gambling",
    "casino",
    "tobacco",
    "adult entertainment",
]

QUESTIONABLE_SECTORS: list[str] = [
    # May involve minor haram revenue streams
    "communication services",
    "internet content & information",
    "consumer cyclical",
    "entertainment",
    "broadcasting",
    "travel services",
    "lodging",
    "restaurants",          # may serve alcohol
    "specialty retail",
    "internet retail",
    "packaged foods",       # may contain non-halal ingredients
    "beverages - non-alcoholic",
    "electronic gaming & multimedia",
    "media",
    "advertising agencies",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalize(value: str | None) -> str:
    """Safely strips and lowercases a string."""
    return str(value).strip().lower() if value else ""


def _matches(text: str, keywords: list[str]) -> bool:
    """Returns True if any keyword is found inside the text."""
    return any(keyword in text for keyword in keywords)


# ── Main classifier ───────────────────────────────────────────────────────────

def classify_company(
    sector: str,
    debt_ratio: float,
    profit_margin: float,
    industry: str | None = None,
) -> str:
    """
    Classifies a company as 'HALAL', 'QUESTIONABLE', or 'HARAM'.

    Priority order:
      1. HARAM sector/industry         → HARAM
      2. Excessive debt                → HARAM
      3. Questionable sector/industry  → QUESTIONABLE
      4. Moderate debt                 → QUESTIONABLE
      5. Persistently negative margin  → QUESTIONABLE
      6. Everything else               → HALAL

    Args:
        sector:        Company sector from yfinance.
        debt_ratio:    Total Debt / Market Cap.
        profit_margin: Net profit margin (e.g. 0.25 = 25%).
        industry:      Optional industry for finer classification.

    Returns:
        'HALAL', 'QUESTIONABLE', or 'HARAM'.
    """
    sector_n   = _normalize(sector)
    industry_n = _normalize(industry)

    # 1. Prohibited sector or industry → HARAM
    if _matches(sector_n, HARAM_SECTORS) or _matches(industry_n, HARAM_SECTORS):
        return "HARAM"

    # 2. Excessive debt → HARAM
    if debt_ratio > DEBT_HARAM_THRESHOLD:
        return "HARAM"

    # 3. Borderline sector or industry → QUESTIONABLE
    if _matches(sector_n, QUESTIONABLE_SECTORS) or _matches(industry_n, QUESTIONABLE_SECTORS):
        return "QUESTIONABLE"

    # 4. Moderate debt → QUESTIONABLE
    if debt_ratio > DEBT_QUESTIONABLE_THRESHOLD:
        return "QUESTIONABLE"

    # 5. Persistently negative margin → QUESTIONABLE
    if profit_margin < MARGIN_QUESTIONABLE_THRESHOLD:
        return "QUESTIONABLE"

    return "HALAL"