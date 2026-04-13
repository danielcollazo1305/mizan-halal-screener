"""
market_data.py
--------------
Fetches fundamental financial data from Yahoo Finance via yfinance.
"""

import logging
import yfinance as yf

logger = logging.getLogger(__name__)


# Fields to extract from yfinance info and their fallback values
_FIELDS: dict[str, tuple[str, object]] = {
    # Basic info
    "name":            ("longName",                        None),
    "sector":          ("sector",                          "Unknown"),
    "industry":        ("industry",                        "Unknown"),
    "country":         ("country",                         "Unknown"),
    "currency":        ("currency",                        "USD"),
    # Price
    "price":           ("currentPrice",                    None),
    "previous_close":  ("previousClose",                   None),
    "52w_high":        ("fiftyTwoWeekHigh",                None),
    "52w_low":         ("fiftyTwoWeekLow",                 None),
    # Size
    "market_cap":      ("marketCap",                       None),
    "enterprise_value":("enterpriseValue",                 None),
    # Debt & cash
    "debt":            ("totalDebt",                       None),
    "cash":            ("totalCash",                       None),
    "free_cash_flow":  ("freeCashflow",                    None),
    # Profitability
    "profit_margin":   ("profitMargins",                   None),
    "ebitda_margin":   ("ebitdaMargins",                   None),
    "roe":             ("returnOnEquity",                   None),
    "roa":             ("returnOnAssets",                   None),
    # Growth
    "revenue_growth":  ("revenueGrowth",                   None),
    "earnings_growth": ("earningsGrowth",                  None),
    # Valuation multiples
    "pe_ratio":        ("trailingPE",                      None),
    "pb_ratio":        ("priceToBook",                     None),
    "ps_ratio":        ("priceToSalesTrailing12Months",    None),
    "peg_ratio":       ("pegRatio",                        None),
    # Per-share data (needed for Graham formula)
    "eps":             ("trailingEps",                     None),
    "book_value":      ("bookValue",                       None),
    # Income
    "dividend_yield":  ("dividendYield",                   None),
}


def _empty_result(ticker: str, reason: str = "") -> dict:
    """Returns a well-structured empty result when data is unavailable."""
    result = {"ticker": ticker, "available": False, "error": reason}
    result.update({key: None for key in _FIELDS})
    result["sector"] = "Unknown"
    result["industry"] = "Unknown"
    result["country"] = "Unknown"
    result["currency"] = "USD"
    result["name"] = ticker
    return result


def _safe_positive(value: object) -> float | None:
    """Returns the value only if it is a positive number, else None."""
    if isinstance(value, (int, float)) and value > 0:
        return value
    return None


def get_stock_data(ticker: str) -> dict:
    """
    Fetches fundamental data for a given stock ticker from Yahoo Finance.

    Args:
        ticker: Stock ticker symbol (e.g. 'AAPL', 'PETR4.SA').

    Returns:
        Dictionary with fundamental data fields.
        Always returns a dict with the same keys — never raises.
    """
    ticker = ticker.strip().upper()

    try:
        info: dict = yf.Ticker(ticker).info
    except Exception as exc:
        logger.warning("yfinance request failed for %s: %s", ticker, exc)
        return _empty_result(ticker, reason=str(exc))

    # Require at least a valid price to consider the data usable
    price = info.get("currentPrice") or info.get("regularMarketPrice")
    if not price:
        logger.warning("No price data available for %s — skipping.", ticker)
        return _empty_result(ticker, reason="No price data available")

    # Build result extracting all mapped fields
    result: dict = {"ticker": ticker, "available": True, "error": None}

    for key, (yf_key, default) in _FIELDS.items():
        result[key] = info.get(yf_key, default)

    # Override name fallback if longName is missing
    if not result["name"]:
        result["name"] = info.get("shortName") or ticker

    # Sanitize: market cap, debt, and price must be positive numbers
    result["price"]      = _safe_positive(price)
    result["market_cap"] = _safe_positive(result["market_cap"])
    result["debt"]       = _safe_positive(result["debt"]) or 0.0

    return result