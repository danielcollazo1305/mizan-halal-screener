"""
financial_data.py
-----------------
Integrates Alpha Vantage API for historical financial data:
- Company overview (description, sector, IPO, employees)
- Income Statement historical (5 years)
- Balance Sheet historical
- Cash Flow historical
"""

import requests
import time

AV_API_KEY = "P6N2HEQME55LM8EP"
AV_BASE    = "https://www.alphavantage.co/query"

# ── Cache ─────────────────────────────────────────────────────────────────────
_CACHE: dict = {}
_CACHE_TTL   = 3600  # 1 hour


def _is_cache_valid(key: str) -> bool:
    if key not in _CACHE:
        return False
    return (time.time() - _CACHE[key]["_ts"]) < _CACHE_TTL


def _get(params: dict) -> dict | None:
    """Makes a GET request to Alpha Vantage API."""
    try:
        params["apikey"] = AV_API_KEY
        res = requests.get(AV_BASE, params=params, timeout=15)
        if res.status_code == 200:
            return res.json()
        return None
    except Exception:
        return None


# ── Company Overview ──────────────────────────────────────────────────────────

def get_company_profile(ticker: str) -> dict | None:
    """Returns company overview from Alpha Vantage."""
    cache_key = f"profile_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get({"function": "OVERVIEW", "symbol": ticker})
    if not data or "Symbol" not in data:
        return None

    result = {
        "description": data.get("Description"),
        "exchange":    data.get("Exchange"),
        "country":     data.get("Country"),
        "sector":      data.get("Sector"),
        "industry":    data.get("Industry"),
        "employees":   data.get("FullTimeEmployees"),
        "ipo_date":    data.get("IPODate"),
        "founded":     None,
        "website":     None,
        "ceo":         None,
        "beta":        _safe_float(data.get("Beta")),
        "market_cap":  _safe_float(data.get("MarketCapitalization")),
        "pe_ratio":    _safe_float(data.get("PERatio")),
        "pb_ratio":    _safe_float(data.get("PriceToBookRatio")),
        "ev_ebitda":   _safe_float(data.get("EVToEBITDA")),
        "roe":         _safe_float(data.get("ReturnOnEquityTTM")),
        "analyst_target": _safe_float(data.get("AnalystTargetPrice")),
        "dividend_yield": _safe_float(data.get("DividendYield")),
        "eps":         _safe_float(data.get("EPS")),
        "book_value":  _safe_float(data.get("BookValue")),
    }

    _CACHE[cache_key] = {"data": result, "_ts": time.time()}
    return result


# ── Income Statement ──────────────────────────────────────────────────────────

def get_income_statement(ticker: str, years: int = 5) -> list[dict]:
    """Returns annual income statements for the last N years."""
    cache_key = f"income_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get({"function": "INCOME_STATEMENT", "symbol": ticker})
    if not data or "annualReports" not in data:
        return []

    result = []
    for item in data["annualReports"][:years]:
        result.append({
            "year":         item.get("fiscalDateEnding", "")[:4],
            "revenue":      _safe_float(item.get("totalRevenue")),
            "gross_profit": _safe_float(item.get("grossProfit")),
            "ebitda":       _safe_float(item.get("ebitda")),
            "net_income":   _safe_float(item.get("netIncome")),
            "eps":          _safe_float(item.get("reportedEPS")),
            "gross_margin": _safe_ratio(item.get("grossProfit"), item.get("totalRevenue")),
            "net_margin":   _safe_ratio(item.get("netIncome"), item.get("totalRevenue")),
        })

    _CACHE[cache_key] = {"data": result, "_ts": time.time()}
    return result


# ── Key Metrics ───────────────────────────────────────────────────────────────

def get_key_metrics(ticker: str, years: int = 5) -> list[dict]:
    """Returns key metrics — uses overview for current + cash flow for history."""
    cache_key = f"metrics_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get({"function": "CASH_FLOW", "symbol": ticker})
    if not data or "annualReports" not in data:
        return []

    result = []
    for item in data["annualReports"][:years]:
        result.append({
            "year":          item.get("fiscalDateEnding", "")[:4],
            "operating_cf":  _safe_float(item.get("operatingCashflow")),
            "capex":         _safe_float(item.get("capitalExpenditures")),
            "fcf":           _safe_float(item.get("operatingCashflow"), item.get("capitalExpenditures"), op="subtract"),
            "dividends_paid":_safe_float(item.get("dividendPayout")),
        })

    _CACHE[cache_key] = {"data": result, "_ts": time.time()}
    return result


# ── Dividends ─────────────────────────────────────────────────────────────────

def get_dividends(ticker: str) -> list[dict]:
    """Returns dividend history."""
    cache_key = f"dividends_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get({"function": "TIME_SERIES_MONTHLY_ADJUSTED", "symbol": ticker})
    if not data:
        return []

    monthly = data.get("Monthly Adjusted Time Series", {})
    result = []
    for date, values in list(monthly.items())[:24]:
        dividend = _safe_float(values.get("7. dividend amount"))
        if dividend and dividend > 0:
            result.append({
                "ex_date":   date,
                "pay_date":  None,
                "amount":    dividend,
                "frequency": "Monthly",
            })

    _CACHE[cache_key] = {"data": result, "_ts": time.time()}
    return result


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_float(value, value2=None, op=None) -> float | None:
    try:
        v1 = float(value) if value and value != "None" else None
        if value2 is None:
            return v1
        v2 = float(value2) if value2 and value2 != "None" else None
        if v1 is None or v2 is None:
            return None
        if op == "subtract":
            return v1 - v2
        return v1
    except (ValueError, TypeError):
        return None


def _safe_ratio(num, den) -> float | None:
    try:
        n = float(num) if num and num != "None" else None
        d = float(den) if den and den != "None" else None
        if n is None or d is None or d == 0:
            return None
        return round(n / d, 4)
    except (ValueError, TypeError):
        return None