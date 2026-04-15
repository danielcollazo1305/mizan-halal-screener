"""
market_data.py
--------------
Fetches fundamental financial data from Yahoo Finance via yfinance.

Features:
  - In-memory cache (TTL 15 min) — avoids redundant API calls
  - Price history for charts
  - Numeric field sanitization
  - Graceful error handling — never raises, always returns a dict
"""

import logging
import time
from functools import lru_cache

import yfinance as yf

logger = logging.getLogger(__name__)

# ── Cache config ──────────────────────────────────────────────────────────────
_CACHE: dict[str, dict] = {}
_CACHE_TTL_SECONDS = 900   # 15 minutes


# ── Field map ─────────────────────────────────────────────────────────────────
_FIELDS: dict[str, tuple[str, object]] = {
    # Basic info
    "name":             ("longName",                      None),
    "sector":           ("sector",                        "Unknown"),
    "industry":         ("industry",                      "Unknown"),
    "country":          ("country",                       "Unknown"),
    "currency":         ("currency",                      "USD"),
    "website":          ("website",                       None),
    "description":      ("longBusinessSummary",           None),
    # Price
    "price":            ("currentPrice",                  None),
    "previous_close":   ("previousClose",                 None),
    "52w_high":         ("fiftyTwoWeekHigh",              None),
    "52w_low":          ("fiftyTwoWeekLow",               None),
    "target_price":     ("targetMeanPrice",               None),
    # Size
    "market_cap":       ("marketCap",                     None),
    "enterprise_value": ("enterpriseValue",               None),
    "shares_outstanding":("sharesOutstanding",            None),
    # Debt & cash
    "debt":             ("totalDebt",                     None),
    "cash":             ("totalCash",                     None),
    "free_cash_flow":   ("freeCashflow",                  None),
    "operating_cash_flow":("operatingCashflow",           None),
    # Profitability
    "profit_margin":    ("profitMargins",                 None),
    "gross_margin":     ("grossMargins",                  None),
    "ebitda_margin":    ("ebitdaMargins",                 None),
    "roe":              ("returnOnEquity",                None),
    "roa":              ("returnOnAssets",                None),
    # Growth
    "revenue_growth":   ("revenueGrowth",                None),
    "earnings_growth":  ("earningsGrowth",               None),
    "revenue_ttm":      ("totalRevenue",                 None),
    # Valuation multiples
    "pe_ratio":         ("trailingPE",                   None),
    "forward_pe":       ("forwardPE",                    None),
    "pb_ratio":         ("priceToBook",                  None),
    "ps_ratio":         ("priceToSalesTrailing12Months", None),
    "peg_ratio":        ("pegRatio",                     None),
    "ev_ebitda":        ("enterpriseToEbitda",           None),
    # Per-share (needed for Graham formula)
    "eps":              ("trailingEps",                  None),
    "forward_eps":      ("forwardEps",                   None),
    "book_value":       ("bookValue",                    None),
    # Dividends
    "dividend_yield":   ("dividendYield",                None),
    "dividend_rate":    ("dividendRate",                 None),
    "payout_ratio":     ("payoutRatio",                  None),
    # Analyst
    "analyst_rating":   ("recommendationKey",            None),
    "analyst_count":    ("numberOfAnalystOpinions",      None),
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _empty_result(ticker: str, reason: str = "") -> dict:
    """Returns a consistent empty result when data is unavailable."""
    result = {"ticker": ticker, "available": False, "error": reason}
    result.update({key: None for key in _FIELDS})
    result["sector"]   = "Unknown"
    result["industry"] = "Unknown"
    result["country"]  = "Unknown"
    result["currency"] = "USD"
    result["name"]     = ticker
    return result


def _to_float(value: object) -> float | None:
    """Safely converts a value to float — handles strings like '1,234.56'."""
    if value is None:
        return None
    try:
        if isinstance(value, str):
            value = value.replace(",", "").replace("%", "").strip()
        return float(value)
    except (ValueError, TypeError):
        return None


def _safe_positive(value: object) -> float | None:
    """Returns float only if positive, else None."""
    v = _to_float(value)
    return v if v and v > 0 else None


def _is_cache_valid(ticker: str) -> bool:
    """Returns True if cached data is still within TTL."""
    if ticker not in _CACHE:
        return False
    return (time.time() - _CACHE[ticker]["_cached_at"]) < _CACHE_TTL_SECONDS


# ── Price history ─────────────────────────────────────────────────────────────

def get_price_history(ticker: str, period: str = "6mo") -> list[dict]:
    """
    Returns daily price history for charts.

    Args:
        ticker: Stock ticker symbol.
        period: yfinance period string — '1mo', '3mo', '6mo', '1y', '2y'.

    Returns:
        List of dicts with keys: date, open, high, low, close, volume.
    """
    try:
        hist = yf.Ticker(ticker.upper()).history(period=period)
        return [
            {
                "date":   str(row.Index.date()),
                "open":   round(row.Open, 2),
                "high":   round(row.High, 2),
                "low":    round(row.Low, 2),
                "close":  round(row.Close, 2),
                "volume": int(row.Volume),
            }
            for row in hist.itertuples()
        ]
    except Exception as exc:
        logger.warning("Price history failed for %s: %s", ticker, exc)
        return []


# ── Main fetch ────────────────────────────────────────────────────────────────

def get_stock_data(ticker: str, use_cache: bool = True) -> dict:
    """
    Fetches fundamental data for a stock ticker from Yahoo Finance.

    Args:
        ticker:    Stock ticker symbol (e.g. 'AAPL', 'PETR4.SA').
        use_cache: If True, returns cached data when available (TTL 15 min).

    Returns:
        Dictionary with all fundamental fields.
        Always returns a dict — never raises.
    """
    ticker = ticker.strip().upper()

    # Return cached result if valid
    if use_cache and _is_cache_valid(ticker):
        logger.debug("Cache hit for %s", ticker)
        return _CACHE[ticker]

    try:
        info: dict = yf.Ticker(ticker).info
    except Exception as exc:
        logger.warning("yfinance request failed for %s: %s", ticker, exc)
        return _empty_result(ticker, reason=str(exc))

    # Require at least a valid price
    price = info.get("currentPrice") or info.get("regularMarketPrice")
    if not price:
        logger.warning("No price data for %s — skipping.", ticker)
        return _empty_result(ticker, reason="No price data available")

    # Build result from field map
    result: dict = {"ticker": ticker, "available": True, "error": None}

    for key, (yf_key, default) in _FIELDS.items():
        result[key] = info.get(yf_key, default)

    # Name fallback
    if not result["name"]:
        result["name"] = info.get("shortName") or ticker

    # Sanitize critical numeric fields
    result["price"]               = _safe_positive(price)
    result["market_cap"]          = _safe_positive(result["market_cap"])
    result["debt"]                = _safe_positive(result["debt"]) or 0.0
    result["free_cash_flow"]      = _to_float(result["free_cash_flow"])
    result["eps"]                 = _to_float(result["eps"])
    result["book_value"]          = _safe_positive(result["book_value"])
    result["revenue_ttm"]         = _safe_positive(result["revenue_ttm"])
    result["shares_outstanding"]  = _safe_positive(result["shares_outstanding"])

    # Store in cache
    result["_cached_at"] = time.time()
    _CACHE[ticker] = result

    return result


def clear_cache(ticker: str | None = None) -> None:
    """
    Clears the in-memory cache.

    Args:
        ticker: If provided, clears only that ticker. Otherwise clears all.
    """
    if ticker:
        _CACHE.pop(ticker.upper(), None)
    else:
        _CACHE.clear()