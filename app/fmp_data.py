"""
fmp_data.py
-----------
Integrates Alpha Vantage API for historical financial data.
Cache: 24h in-memory + JSON file persistence (survives Railway restarts).
"""

import json
import logging
import os
import requests
import time

logger = logging.getLogger(__name__)

AV_API_KEY   = "P6N2HEQME55LM8EP"
AV_BASE      = "https://www.alphavantage.co/query"
_CACHE_TTL   = 86400          # 24 hours in seconds
_CACHE_FILE  = "/tmp/av_cache.json"

# In-memory cache — loaded from disk on startup
_CACHE: dict = {}


def _load_cache_from_disk() -> None:
    """Load persisted cache from JSON file (called once at module import)."""
    global _CACHE
    try:
        if os.path.exists(_CACHE_FILE):
            with open(_CACHE_FILE, "r") as f:
                _CACHE = json.load(f)
            logger.info("AV cache loaded from disk (%d entries)", len(_CACHE))
    except Exception as exc:
        logger.warning("Could not load AV cache from disk: %s", exc)
        _CACHE = {}


def _save_cache_to_disk() -> None:
    """Persist in-memory cache to JSON file."""
    try:
        with open(_CACHE_FILE, "w") as f:
            json.dump(_CACHE, f)
    except Exception as exc:
        logger.warning("Could not save AV cache to disk: %s", exc)


def _is_cache_valid(key: str) -> bool:
    if key not in _CACHE:
        return False
    return (time.time() - _CACHE[key]["_ts"]) < _CACHE_TTL


def _set_cache(key: str, data: dict) -> None:
    _CACHE[key] = {"data": data, "_ts": time.time()}
    _save_cache_to_disk()


def _get(params: dict) -> dict | None:
    try:
        params["apikey"] = AV_API_KEY
        res = requests.get(AV_BASE, params=params, timeout=15)
        if res.status_code == 200:
            return res.json()
        return None
    except Exception:
        return None


def get_company_profile(ticker: str) -> dict | None:
    cache_key = f"profile_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get({"function": "OVERVIEW", "symbol": ticker})
    if not data or "Symbol" not in data:
        return None

    def _f(key: str) -> float | None:
        try:
            v = data.get(key)
            return float(v) if v not in (None, "None", "-", "") else None
        except (TypeError, ValueError):
            return None

    result = {
        "description":    data.get("Description"),
        "sector":         data.get("Sector"),
        "industry":       data.get("Industry"),
        "country":        data.get("Country"),
        "exchange":       data.get("Exchange"),
        "currency":       data.get("Currency"),
        "market_cap":     _f("MarketCapitalization"),
        "pe_ratio":       _f("PERatio"),
        "pb_ratio":       _f("PriceToBookRatio"),
        "ps_ratio":       _f("PriceToSalesRatioTTM"),
        "ev_ebitda":      _f("EVToEBITDA"),
        "roe":            _f("ReturnOnEquityTTM"),
        "roa":            _f("ReturnOnAssetsTTM"),
        "profit_margin":  _f("ProfitMargin"),
        "revenue_ttm":    _f("RevenueTTM"),
        "gross_profit":   _f("GrossProfitTTM"),
        "ebitda":         _f("EBITDA"),
        "eps":            _f("EPS"),
        "beta":           _f("Beta"),
        "52w_high":       _f("52WeekHigh"),
        "52w_low":        _f("52WeekLow"),
        "50d_ma":         _f("50DayMovingAverage"),
        "200d_ma":        _f("200DayMovingAverage"),
        "dividend_yield": _f("DividendYield"),
        "payout_ratio":   _f("PayoutRatio"),
        "shares_outstanding": _f("SharesOutstanding"),
        "total_debt":         _f("TotalDebt") if "TotalDebt" in data else None,
        "debt_to_equity":     _f("DebtToEquityRatio") if "DebtToEquityRatio" in data else None,
    }

    _set_cache(cache_key, result)
    return result


def get_income_statement(ticker: str) -> list[dict]:
    cache_key = f"income_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get({"function": "INCOME_STATEMENT", "symbol": ticker})
    if not data or "annualReports" not in data:
        _set_cache(cache_key, [])
        return []

    def _f(v):
        try:
            return float(v) if v not in (None, "None", "-", "") else None
        except (TypeError, ValueError):
            return None

    result = [
        {
            "fiscal_year":         r.get("fiscalDateEnding", "")[:4],
            "revenue":             _f(r.get("totalRevenue")),
            "gross_profit":        _f(r.get("grossProfit")),
            "operating_income":    _f(r.get("operatingIncome")),
            "net_income":          _f(r.get("netIncome")),
            "ebitda":              _f(r.get("ebitda")),
            "interest_expense":    _f(r.get("interestExpense")),
            "income_tax":          _f(r.get("incomeTaxExpense")),
            "rd_expense":          _f(r.get("researchAndDevelopment")),
        }
        for r in data["annualReports"][:5]
    ]

    _set_cache(cache_key, result)
    return result


def get_key_metrics(ticker: str) -> dict | None:
    cache_key = f"metrics_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get({"function": "OVERVIEW", "symbol": ticker})
    if not data or "Symbol" not in data:
        return None

    def _f(key):
        try:
            v = data.get(key)
            return float(v) if v not in (None, "None", "-", "") else None
        except (TypeError, ValueError):
            return None

    result = {
        "pe_ratio":          _f("PERatio"),
        "pb_ratio":          _f("PriceToBookRatio"),
        "ps_ratio":          _f("PriceToSalesRatioTTM"),
        "ev_ebitda":         _f("EVToEBITDA"),
        "roe":               _f("ReturnOnEquityTTM"),
        "roa":               _f("ReturnOnAssetsTTM"),
        "profit_margin":     _f("ProfitMargin"),
        "revenue_growth":    _f("QuarterlyRevenueGrowthYOY"),
        "earnings_growth":   _f("QuarterlyEarningsGrowthYOY"),
        "current_ratio":     _f("CurrentRatio") if "CurrentRatio" in data else None,
        "debt_to_equity":    _f("DebtToEquityRatio") if "DebtToEquityRatio" in data else None,
        "dividend_yield":    _f("DividendYield"),
        "payout_ratio":      _f("PayoutRatio"),
        "beta":              _f("Beta"),
        "analyst_target":    _f("AnalystTargetPrice"),
    }

    _set_cache(cache_key, result)
    return result


def get_dividends(ticker: str) -> list[dict]:
    cache_key = f"dividends_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get({"function": "DIVIDENDS", "symbol": ticker})
    if not data or "data" not in data:
        _set_cache(cache_key, [])
        return []

    result = [
        {
            "ex_date":      d.get("ex_dividend_date"),
            "payment_date": d.get("payment_date"),
            "amount":       float(d["amount"]) if d.get("amount") not in (None, "") else None,
            "currency":     d.get("currency"),
        }
        for d in data["data"][:20]
        if d.get("amount") not in (None, "")
    ]

    _set_cache(cache_key, result)
    return result


def get_balance_sheet(ticker: str) -> list[dict]:
    cache_key = f"balance_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get({"function": "BALANCE_SHEET", "symbol": ticker})
    if not data or "annualReports" not in data:
        _set_cache(cache_key, [])
        return []

    def _f(v):
        try:
            return float(v) if v not in (None, "None", "-", "") else None
        except (TypeError, ValueError):
            return None

    result = [
        {
            "fiscal_year":           r.get("fiscalDateEnding", "")[:4],
            "total_assets":          _f(r.get("totalAssets")),
            "total_liabilities":     _f(r.get("totalLiabilities")),
            "total_equity":          _f(r.get("totalShareholderEquity")),
            "total_debt":            _f(r.get("shortLongTermDebtTotal")),
            "cash":                  _f(r.get("cashAndCashEquivalentsAtCarryingValue")),
            "current_assets":        _f(r.get("totalCurrentAssets")),
            "current_liabilities":   _f(r.get("totalCurrentLiabilities")),
            "goodwill":              _f(r.get("goodwill")),
            "intangible_assets":     _f(r.get("intangibleAssets")),
        }
        for r in data["annualReports"][:5]
    ]

    _set_cache(cache_key, result)
    return result


# Load persisted cache on module import
_load_cache_from_disk()
