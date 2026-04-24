"""
fmp_data.py
-----------
Integrates Financial Modeling Prep (FMP) API for:
- Company profile (description, founded, IPO, exchange)
- Historical financial statements (income, balance, cash flow)
- Key metrics (valuation, profitability, growth, leverage)
- Dividend history
"""

import requests
import time

FMP_API_KEY = "ZFMxj1KT1FPjYvs9kSC58fAgYy2kPgkd"
FMP_BASE    = "https://financialmodelingprep.com/stable"

# ── Cache ─────────────────────────────────────────────────────────────────────
_CACHE: dict = {}
_CACHE_TTL   = 3600  # 1 hour


def _is_cache_valid(key: str) -> bool:
    if key not in _CACHE:
        return False
    return (time.time() - _CACHE[key]["_ts"]) < _CACHE_TTL


def _get(endpoint: str, params: dict = {}) -> dict | list | None:
    """Makes a GET request to FMP API."""
    try:
        url    = f"{FMP_BASE}/{endpoint}"
        params = {**params, "apikey": FMP_API_KEY}
        res    = requests.get(url, params=params, timeout=10)
        if res.status_code == 200:
            return res.json()
        return None
    except Exception:
        return None


# ── Company Profile ───────────────────────────────────────────────────────────

def get_company_profile(ticker: str) -> dict | None:
    """
    Returns company profile including description, IPO date,
    founding year, exchange, website, CEO and more.
    """
    cache_key = f"profile_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get(f"profile/{ticker}")
    if not data:
        return None

    profile = data[0] if isinstance(data, list) and data else data
    result = {
        "description":   profile.get("description"),
        "ceo":           profile.get("ceo"),
        "website":       profile.get("website"),
        "exchange":      profile.get("exchange"),
        "ipo_date":      profile.get("ipoDate"),
        "founded":       profile.get("founded"),
        "employees":     profile.get("fullTimeEmployees"),
        "industry":      profile.get("industry"),
        "sector":        profile.get("sector"),
        "country":       profile.get("country"),
        "image":         profile.get("image"),
        "market_cap":    profile.get("mktCap"),
        "beta":          profile.get("beta"),
    }

    _CACHE[cache_key] = {"data": result, "_ts": time.time()}
    return result


# ── Financial Statements ──────────────────────────────────────────────────────

def get_income_statement(ticker: str, years: int = 5) -> list[dict]:
    """Returns annual income statements for the last N years."""
    cache_key = f"income_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get(f"income-statement/{ticker}", {"period": "annual", "limit": years})
    if not data:
        return []

    result = []
    for item in data[:years]:
        result.append({
            "year":          item.get("calendarYear") or item.get("date", "")[:4],
            "revenue":       item.get("revenue"),
            "gross_profit":  item.get("grossProfit"),
            "ebitda":        item.get("ebitda"),
            "net_income":    item.get("netIncome"),
            "eps":           item.get("eps"),
            "gross_margin":  item.get("grossProfitRatio"),
            "net_margin":    item.get("netIncomeRatio"),
            "ebitda_margin": item.get("ebitdaratio"),
        })

    _CACHE[cache_key] = {"data": result, "_ts": time.time()}
    return result


def get_key_metrics(ticker: str, years: int = 5) -> list[dict]:
    """Returns key financial metrics for the last N years."""
    cache_key = f"metrics_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get(f"key-metrics/{ticker}", {"period": "annual", "limit": years})
    if not data:
        return []

    result = []
    for item in data[:years]:
        result.append({
            "year":              item.get("calendarYear") or item.get("date", "")[:4],
            "pe_ratio":          item.get("peRatio"),
            "pb_ratio":          item.get("pbRatio"),
            "ps_ratio":          item.get("priceToSalesRatio"),
            "ev_ebitda":         item.get("evToEbitda"),
            "ev_revenue":        item.get("evToSales"),
            "roe":               item.get("roe"),
            "roic":              item.get("roic"),
            "roa":               item.get("returnOnTangibleAssets"),
            "debt_to_equity":    item.get("debtToEquity"),
            "current_ratio":     item.get("currentRatio"),
            "fcf_per_share":     item.get("freeCashFlowPerShare"),
            "dividend_yield":    item.get("dividendYield"),
            "market_cap":        item.get("marketCap"),
        })

    _CACHE[cache_key] = {"data": result, "_ts": time.time()}
    return result


def get_dividends(ticker: str) -> list[dict]:
    """Returns dividend history."""
    cache_key = f"dividends_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get(f"dividends/{ticker}")
    if not data:
        return []

    dividends = data.get("historical", data) if isinstance(data, dict) else data

    result = []
    for item in dividends[:20]:
        result.append({
            "ex_date":     item.get("date") or item.get("exDividendDate"),
            "pay_date":    item.get("paymentDate"),
            "amount":      item.get("dividend") or item.get("adjDividend"),
            "frequency":   "Quarterly",
        })

    _CACHE[cache_key] = {"data": result, "_ts": time.time()}
    return result