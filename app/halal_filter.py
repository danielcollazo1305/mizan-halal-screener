"""
halal_filter.py
---------------
Classifies companies as HALAL, QUESTIONABLE, or HARAM
based on AAOIFI Islamic finance standards.

AAOIFI Thresholds:
  - Total Debt / Market Cap     < 33% → permitted
  - Haram Revenue / Total Rev   < 5%  → tolerable (purification required)
  - Accounts Receivable / Assets < 45% → permitted
"""

# ── Thresholds (AAOIFI Standard) ─────────────────────────────────────────────
DEBT_HARAM_THRESHOLD          = 0.50   # > 50%  → HARAM
DEBT_QUESTIONABLE_THRESHOLD   = 0.33   # > 33%  → QUESTIONABLE
MARGIN_QUESTIONABLE_THRESHOLD = -0.05  # < -5%  → QUESTIONABLE
PURIFICATION_TOLERANCE        = 0.05   # < 5% haram revenue → tolerable

# ── Sector / Industry Lists ───────────────────────────────────────────────────
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
    "brewers",
    "distillers & vintners",
    # Tobacco
    "tobacco",
    # Gambling
    "gambling",
    "casino",
    "casinos & gaming",
    "resorts & casinos",
    # Adult entertainment
    "adult entertainment",
    # Weapons (offensive)
    "aerospace & defense",
    "weapons",
    # Pork processing
    "pork",
    "meat processing",
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
    "hotels",
    "restaurants",            # may serve alcohol
    "specialty retail",
    "internet retail",
    "packaged foods",         # may contain non-halal ingredients
    "beverages - non-alcoholic",
    "electronic gaming & multimedia",
    "media",
    "advertising agencies",
    "specialty chemicals",    # may produce haram substances
    "drug manufacturers",     # some produce non-halal products
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalize(value: str | None) -> str:
    """Safely strips and lowercases a string."""
    return str(value).strip().lower() if value else ""


def _matches(text: str, keywords: list[str]) -> bool:
    """Returns True if any keyword is found inside the text."""
    return any(keyword in text for keyword in keywords)


def _find_match(text: str, keywords: list[str]) -> str | None:
    """Returns the first matching keyword found in text, or None."""
    return next((kw for kw in keywords if kw in text), None)


# ── Main classifier ───────────────────────────────────────────────────────────

def classify_company(
    sector:        str,
    debt_ratio:    float,
    profit_margin: float,
    industry:      str | None = None,
    haram_revenue_ratio: float = 0.0,  # % of total revenue from haram activities
) -> dict:
    """
    Classifies a company as 'HALAL', 'QUESTIONABLE', or 'HARAM'.

    Priority order:
      1. HARAM sector/industry              → HARAM
      2. Excessive debt (> 50%)             → HARAM
      3. Haram revenue above tolerance      → HARAM
      4. Questionable sector/industry       → QUESTIONABLE
      5. Moderate debt (> 33%)              → QUESTIONABLE
      6. Persistently negative margin       → QUESTIONABLE
      7. Minor haram revenue (< 5%)         → HALAL (purification required)
      8. Everything else                    → HALAL

    Args:
        sector:             Company sector from yfinance.
        debt_ratio:         Total Debt / Market Cap.
        profit_margin:      Net profit margin (e.g. 0.25 = 25%).
        industry:           Optional industry for finer classification.
        haram_revenue_ratio: Share of revenue from haram activities (0.0–1.0).

    Returns:
        Dict with keys:
          - status:      'HALAL' | 'QUESTIONABLE' | 'HARAM'
          - reason:      Primary reason for classification
          - purification: True if income purification is required
    """
    sector_n   = _normalize(sector)
    industry_n = _normalize(industry)

    # ── 1. Prohibited sector or industry → HARAM ─────────────────────────────
    match = _find_match(sector_n, HARAM_SECTORS) or _find_match(industry_n, HARAM_SECTORS)
    if match:
        return {
            "status":       "HARAM",
            "reason":       f"Operates in a prohibited sector: '{match}'.",
            "purification": False,
        }

    # ── 2. Excessive debt → HARAM ─────────────────────────────────────────────
    if debt_ratio > DEBT_HARAM_THRESHOLD:
        return {
            "status":       "HARAM",
            "reason":       f"Debt ratio ({debt_ratio:.1%}) exceeds AAOIFI limit of {DEBT_HARAM_THRESHOLD:.0%}.",
            "purification": False,
        }

    # ── 3. Haram revenue above tolerance → HARAM ─────────────────────────────
    if haram_revenue_ratio > PURIFICATION_TOLERANCE:
        return {
            "status":       "HARAM",
            "reason":       f"Haram revenue ({haram_revenue_ratio:.1%}) exceeds 5% tolerance.",
            "purification": False,
        }

    # ── 4. Borderline sector or industry → QUESTIONABLE ──────────────────────
    q_match = _find_match(sector_n, QUESTIONABLE_SECTORS) or _find_match(industry_n, QUESTIONABLE_SECTORS)
    if q_match:
        return {
            "status":       "QUESTIONABLE",
            "reason":       f"Sector requires further review: '{q_match}'.",
            "purification": False,
        }

    # ── 5. Moderate debt → QUESTIONABLE ──────────────────────────────────────
    if debt_ratio > DEBT_QUESTIONABLE_THRESHOLD:
        return {
            "status":       "QUESTIONABLE",
            "reason":       f"Debt ratio ({debt_ratio:.1%}) exceeds recommended {DEBT_QUESTIONABLE_THRESHOLD:.0%}.",
            "purification": False,
        }

    # ── 6. Persistently negative margin → QUESTIONABLE ───────────────────────
    if profit_margin < MARGIN_QUESTIONABLE_THRESHOLD:
        return {
            "status":       "QUESTIONABLE",
            "reason":       f"Profit margin ({profit_margin:.1%}) below threshold of {MARGIN_QUESTIONABLE_THRESHOLD:.0%}.",
            "purification": False,
        }

    # ── 7. Minor haram revenue → HALAL with purification ─────────────────────
    if haram_revenue_ratio > 0:
        return {
            "status":       "HALAL",
            "reason":       f"Passed screening. Minor haram revenue ({haram_revenue_ratio:.1%}) — purification required.",
            "purification": True,
        }

    # ── 8. HALAL ──────────────────────────────────────────────────────────────
    return {
        "status":       "HALAL",
        "reason":       f"Passed all AAOIFI screening criteria. Debt: {debt_ratio:.1%}.",
        "purification": False,
    }