"""
fmp_data.py
-----------
Integrates Alpha Vantage API for historical financial data.
"""

import requests
import time

AV_API_KEY = "P6N2HEQME55LM8EP"
AV_BASE    = "https://www.alphavantage.co/query"

_CACHE: dict = {}
_CACHE_TTL   = 3600


def _is_cache_valid(key: str) -> bool:
    if key not in _CACHE:
        return False
    return (time.time() - _CACHE[key]["_ts"]) < _CACHE_TTL


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

    result = {
        "description":    data.get("Description"),
        "exchange":       data.get("Exchange"),
        "country":        data.get("Country"),
        "sector":         data.get("Sector"),
        "industry":       data.get("Industry"),
        "employees":      data.get("FullTimeEmployees"),
        "ipo_date":       data.get("IPODate"),
        "founded":        None,
        "website":        None,
        "ceo":            None,
        "beta":           _safe_float(data.get("Beta")),
        "market_cap":     _safe_float(data.get("MarketCapitalization")),
        "pe_ratio":       _safe_float(data.get("PERatio")),
        "pb_ratio":       _safe_float(data.get("PriceToBookRatio")),
        "ev_ebitda":      _safe_float(data.get("EVToEBITDA")),
        "roe":            _safe_float(data.get("ReturnOnEquityTTM")),
        "analyst_target": _safe_float(data.get("AnalystTargetPrice")),
        "dividend_yield": _safe_float(data.get("DividendYield")),
        "eps":            _safe_float(data.get("EPS")),
        "book_value":     _safe_float(data.get("BookValue")),
        "forward_pe":     _safe_float(data.get("ForwardPE")),
        "peg_ratio":      _safe_float(data.get("PEGRatio")),
        "ps_ratio":       _safe_float(data.get("PriceToSalesRatioTTM")),
    }

    _CACHE[cache_key] = {"data": result, "_ts": time.time()}
    return result


def get_income_statement(ticker: str, years: int = 5) -> list[dict]:
    cache_key = f"income_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get({"function": "INCOME_STATEMENT", "symbol": ticker})
    if not data or "annualReports" not in data:
        return []

    result = []
    for item in data["annualReports"][:years]:
        revenue     = _safe_float(item.get("totalRevenue"))
        gross       = _safe_float(item.get("grossProfit"))
        net         = _safe_float(item.get("netIncome"))
        ebitda      = _safe_float(item.get("ebitda"))
        op_income   = _safe_float(item.get("operatingIncome"))
        result.append({
            "year":          item.get("fiscalDateEnding", "")[:4],
            "revenue":       revenue,
            "gross_profit":  gross,
            "ebitda":        ebitda,
            "operating_income": op_income,
            "net_income":    net,
            "eps":           _safe_float(item.get("reportedEPS")),
            "gross_margin":  _safe_ratio(gross, revenue),
            "operating_margin": _safe_ratio(op_income, revenue),
            "net_margin":    _safe_ratio(net, revenue),
            "ebitda_margin": _safe_ratio(ebitda, revenue),
        })

    _CACHE[cache_key] = {"data": result, "_ts": time.time()}
    return result


def get_balance_sheet(ticker: str, years: int = 5) -> list[dict]:
    cache_key = f"balance_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    data = _get({"function": "BALANCE_SHEET", "symbol": ticker})
    if not data or "annualReports" not in data:
        return []

    result = []
    for item in data["annualReports"][:years]:
        total_assets  = _safe_float(item.get("totalAssets"))
        total_equity  = _safe_float(item.get("totalShareholderEquity"))
        total_debt    = _safe_float(item.get("shortLongTermDebtTotal")) or _safe_float(item.get("longTermDebt"))
        result.append({
            "year":          item.get("fiscalDateEnding", "")[:4],
            "total_assets":  total_assets,
            "total_equity":  total_equity,
            "total_debt":    total_debt,
            "cash":          _safe_float(item.get("cashAndCashEquivalentsAtCarryingValue")),
            "debt_to_equity": _safe_ratio(total_debt, total_equity),
        })

    _CACHE[cache_key] = {"data": result, "_ts": time.time()}
    return result


def get_key_metrics(ticker: str, years: int = 5) -> list[dict]:
    cache_key = f"metrics_{ticker}"
    if _is_cache_valid(cache_key):
        return _CACHE[cache_key]["data"]

    income_data  = get_income_statement(ticker, years)
    balance_data = get_balance_sheet(ticker, years)
    cf_data      = _get({"function": "CASH_FLOW", "symbol": ticker})

    cf_by_year = {}
    if cf_data and "annualReports" in cf_data:
        for item in cf_data["annualReports"][:years]:
            year = item.get("fiscalDateEnding", "")[:4]
            op_cf  = _safe_float(item.get("operatingCashflow"))
            capex  = _safe_float(item.get("capitalExpenditures"))
            cf_by_year[year] = {
                "operating_cf":   op_cf,
                "capex":          capex,
                "fcf":            (op_cf - abs(capex)) if op_cf and capex else None,
                "dividends_paid": _safe_float(item.get("dividendPayout")),
            }

    result = []
    income_by_year = {i["year"]: i for i in income_data}
    balance_by_year = {b["year"]: b for b in balance_data}

    all_years = sorted(set(list(income_by_year.keys()) + list(cf_by_year.keys())), reverse=True)[:years]

    for year in all_years:
        inc = income_by_year.get(year, {})
        bal = balance_by_year.get(year, {})
        cf  = cf_by_year.get(year, {})

        net_income   = inc.get("net_income")
        total_equity = bal.get("total_equity")
        total_assets = bal.get("total_assets")

        result.append({
            "year":           year,
            "roe":            _safe_ratio(net_income, total_equity),
            "roa":            _safe_ratio(net_income, total_assets),
            "net_margin":     inc.get("net_margin"),
            "gross_margin":   inc.get("gross_margin"),
            "operating_margin": inc.get("operating_margin"),
            "ebitda_margin":  inc.get("ebitda_margin"),
            "operating_cf":   cf.get("operating_cf"),
            "capex":          cf.get("capex"),
            "fcf":            cf.get("fcf"),
            "dividends_paid": cf.get("dividends_paid"),
            "debt_to_equity": bal.get("debt_to_equity"),
            "total_debt":     bal.get("total_debt"),
            "cash":           bal.get("cash"),
        })

    _CACHE[cache_key] = {"data": result, "_ts": time.time()}
    return result


def get_dividends(ticker: str) -> list[dict]:
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