"""
screener.py
-----------
Core halal screening logic for Mizan Halal Screener.

This module is the single source of truth for classifying companies.
It replaces both screener.py and halal_filter.py — do not duplicate this logic.

Classification priority:
  1. HARAM   — prohibited sector or industry
  2. HARAM   — excessive debt (> MAX_DEBT_RATIO)
  3. QUESTIONABLE — borderline sector or industry
  4. QUESTIONABLE — moderate debt (> MAX_QUESTIONABLE_DEBT_RATIO)
  5. QUESTIONABLE — persistently negative profit margin
  6. HALAL   — passed all criteria
"""

from .rules import (
    PROHIBITED_SECTORS,
    QUESTIONABLE_SECTORS,
    MAX_DEBT_RATIO,
    MAX_QUESTIONABLE_DEBT_RATIO,
)

# Margin below this threshold flags a company as QUESTIONABLE
MIN_PROFIT_MARGIN = -0.05   # -5%


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalize(value: str | None) -> str:
    """Safely strips and lowercases a string."""
    return str(value).strip().lower() if value else ""


def _first_match(text: str, keywords: list[str]) -> str | None:
    """Returns the first keyword found in text, or None."""
    return next((kw for kw in keywords if kw in text), None)


def _build_result(
    company_name: str,
    status: str,
    reasons: list[str],
) -> dict:
    """
    Builds a standardized screening result dict.

    Returns:
        {
            "company": str,
            "status":  "HALAL" | "QUESTIONABLE" | "HARAM",
            "reason":  str,      # primary reason (first in list)
            "reasons": list[str] # all reasons found
        }
    """
    return {
        "company": company_name,
        "status":  status,
        "reason":  reasons[0] if reasons else "No issues found.",
        "reasons": reasons,
    }


# ── Main classifier ───────────────────────────────────────────────────────────

def screen_company(
    company_name:  str,
    sector:        str,
    debt_ratio:    float,
    industry:      str   = "",
    profit_margin: float = 0.0,
) -> dict:
    """
    Screens a company for halal compliance.

    Args:
        company_name:  Display name of the company.
        sector:        Sector string from yfinance (e.g. 'Financial Services').
        debt_ratio:    Total Debt / Market Cap (e.g. 0.25 = 25%).
        industry:      Optional industry for finer classification.
        profit_margin: Net profit margin (e.g. 0.20 = 20%).

    Returns:
        Dict with keys:
          - company  : str
          - status   : 'HALAL' | 'QUESTIONABLE' | 'HARAM'
          - reason   : str  (primary reason)
          - reasons  : list[str]  (all reasons)
    """
    # ── Input sanitization ────────────────────────────────────────────────────
    if not isinstance(company_name, str) or not company_name.strip():
        company_name = "Unknown Company"

    debt_ratio = float(debt_ratio) if isinstance(debt_ratio, (int, float)) else 0.0
    debt_ratio = max(0.0, debt_ratio)

    profit_margin = float(profit_margin) if isinstance(profit_margin, (int, float)) else 0.0

    sector_n   = _normalize(sector)
    industry_n = _normalize(industry)

    # ── 1. HARAM — prohibited sector or industry ──────────────────────────────
    match = _first_match(sector_n, PROHIBITED_SECTORS) or _first_match(industry_n, PROHIBITED_SECTORS)
    if match:
        return _build_result(
            company_name,
            status  = "HARAM",
            reasons = [f"Operates in a prohibited sector: '{match}'."],
        )

    # ── 2. HARAM — excessive debt ─────────────────────────────────────────────
    if debt_ratio > MAX_DEBT_RATIO:
        return _build_result(
            company_name,
            status  = "HARAM",
            reasons = [
                f"Debt ratio ({debt_ratio:.1%}) exceeds the AAOIFI maximum "
                f"of {MAX_DEBT_RATIO:.0%}."
            ],
        )

    # ── Collect QUESTIONABLE flags (may have more than one) ───────────────────
    q_reasons: list[str] = []

    # 3. Borderline sector or industry
    q_match = (
        _first_match(sector_n,   QUESTIONABLE_SECTORS)
        or _first_match(industry_n, QUESTIONABLE_SECTORS)
    )
    if q_match:
        q_reasons.append(
            f"Operates in a sector that requires further review: '{q_match}'."
        )

    # 4. Moderate debt
    if debt_ratio > MAX_QUESTIONABLE_DEBT_RATIO:
        q_reasons.append(
            f"Debt ratio ({debt_ratio:.1%}) exceeds the recommended "
            f"threshold of {MAX_QUESTIONABLE_DEBT_RATIO:.0%}."
        )

    # 5. Persistently negative margin
    if profit_margin < MIN_PROFIT_MARGIN:
        q_reasons.append(
            f"Profit margin ({profit_margin:.1%}) is below the minimum "
            f"acceptable threshold of {MIN_PROFIT_MARGIN:.0%}."
        )

    if q_reasons:
        return _build_result(company_name, status="QUESTIONABLE", reasons=q_reasons)

    # ── 6. HALAL ──────────────────────────────────────────────────────────────
    return _build_result(
        company_name,
        status  = "HALAL",
        reasons = [
            f"Passed all screening criteria. "
            f"Sector: '{sector or 'N/A'}'. "
            f"Debt ratio: {debt_ratio:.1%}. "
            f"Profit margin: {profit_margin:.1%}."
        ],
    )