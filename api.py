"""
api.py
------
Mizan Halal Screener — REST API built with FastAPI.

Endpoints:
  GET /                              → health check
  GET /analyze?ticker=AAPL           → analyze a single stock
  GET /ranking                       → full halal ranking
  GET /ranking?tickers=AAPL,MSFT     → ranking for specific tickers
  GET /fair-value?ticker=AAPL        → fair value calculation
  GET /history?ticker=AAPL           → price history for charts
"""

import time
import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.market_data import get_stock_data, get_price_history
from app.halal_filter import classify_company
from app.fair_value import calculate_fair_value
from app.scorer import score_company

logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")

# ── Tickers ───────────────────────────────────────────────────────────────────
TICKERS: list[str] = [
    "AAPL", "MSFT", "AMZN", "NVDA", "GOOGL", "META", "TSLA", "AVGO",
    "JNJ", "WMT", "UNH", "V", "MA", "PG", "HD", "XOM", "LLY", "MRK",
    "CVX", "ABBV", "PEP", "KO", "COST", "MCD", "NKE", "SBUX", "DIS",
    "NFLX", "ADBE", "CRM", "ORCL", "CSCO", "INTC", "AMD", "QCOM",
    "TXN", "IBM", "AMAT", "LRCX", "MU", "NOW", "SHOP", "UBER", "ABNB",
    "BKNG", "PYPL", "INTU", "AMGN", "GE", "CAT", "DE", "HON", "UNP",
]

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "Mizan Halal API",
    description = (
        "Screens global stocks for halal compliance using AAOIFI standards. "
        "Returns halal status, fundamental score, fair value and investment grade."
    ),
    version     = "2.0.0",
    contact     = {"name": "Daniel Collazo"},
)

# CORS — allows frontend and mobile app to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── Shared logic ──────────────────────────────────────────────────────────────

def _build_company(ticker: str) -> dict | None:
    """
    Fetches, classifies, scores and valuates a single ticker.
    Returns None if data is unavailable.
    """
    data = get_stock_data(ticker.strip().upper())
    if not data.get("available"):
        return None

    market_cap = data.get("market_cap") or 0
    debt       = data.get("debt")       or 0
    debt_ratio = debt / market_cap if market_cap else 0

    # 1. Halal classification
    halal_result = classify_company(
        sector        = data.get("sector", ""),
        debt_ratio    = debt_ratio,
        profit_margin = data.get("profit_margin") or 0,
        industry      = data.get("industry", ""),
    )
    status = halal_result["status"]

    # 2. Fair value
    fair_value = calculate_fair_value(data)

    # 3. Scoring
    scores = score_company(
        data       = data,
        status     = status,
        upside_pct = fair_value.get("upside_pct"),
    )

    return {
        # Identity
        "ticker":   ticker.upper(),
        "name":     data.get("name", ticker),
        "sector":   data.get("sector", "Unknown"),
        "industry": data.get("industry", "Unknown"),
        "country":  data.get("country", "Unknown"),
        "currency": data.get("currency", "USD"),
        # Price
        "price":      data.get("price"),
        "52w_high":   data.get("52w_high"),
        "52w_low":    data.get("52w_low"),
        # Fundamentals
        "market_cap":     market_cap,
        "debt":           debt,
        "debt_ratio":     round(debt_ratio, 4),
        "profit_margin":  data.get("profit_margin"),
        "roe":            data.get("roe"),
        "pe_ratio":       data.get("pe_ratio"),
        "pb_ratio":       data.get("pb_ratio"),
        "revenue_growth": data.get("revenue_growth"),
        "earnings_growth":data.get("earnings_growth"),
        "dividend_yield": data.get("dividend_yield"),
        # Halal
        "status":  status,
        "reason":  halal_result.get("reason"),
        "reasons": halal_result.get("reasons", []),
        "purification": halal_result.get("purification", False),
        # Fair value
        "fair_value": fair_value,
        # Scores
        "fundamental_score": scores["fundamental_score"],
        "investment_score":  scores["investment_score"],
        "grade":             scores["grade"],
    }


def _group_and_sort(companies: list[dict]) -> dict:
    """Groups companies by status and sorts each group by investment score."""
    groups: dict[str, list] = {"HALAL": [], "QUESTIONABLE": [], "HARAM": []}
    for c in companies:
        groups.get(c["status"], groups["HARAM"]).append(c)
    for group in groups.values():
        group.sort(key=lambda x: x["investment_score"], reverse=True)
    return groups


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def home():
    """Returns API status and version."""
    return {
        "status":    "online",
        "api":       "Mizan Halal API",
        "version":   "2.0.0",
        "endpoints": ["/analyze", "/ranking", "/fair-value", "/history"],
        "docs":      "/docs",
    }


@app.get("/analyze", tags=["Screener"])
def analyze_stock(
    ticker: str = Query(..., description="Stock ticker (e.g. AAPL, PETR4.SA)")
):
    """
    Full analysis of a single stock:
    halal status + fair value + fundamental score + investment grade.
    """
    start  = time.perf_counter()
    result = _build_company(ticker)

    if result is None:
        raise HTTPException(
            status_code = 404,
            detail      = f"No data available for '{ticker.upper()}'."
        )

    result["processing_time_ms"] = round((time.perf_counter() - start) * 1000, 1)
    return result


@app.get("/ranking", tags=["Screener"])
def get_ranking(
    tickers: str = Query(
        default     = None,
        description = "Comma-separated tickers. Defaults to built-in list."
    )
):
    """
    Full halal ranking grouped by HALAL / QUESTIONABLE / HARAM.
    Sorted by Investment Score descending.
    """
    start = time.perf_counter()

    ticker_list = (
        [t.strip() for t in tickers.split(",") if t.strip()]
        if tickers else TICKERS
    )

    if len(ticker_list) > 50:
        raise HTTPException(
            status_code = 400,
            detail      = "Maximum 50 tickers per request."
        )

    companies, failed = [], []
    for ticker in ticker_list:
        result = _build_company(ticker)
        if result:
            companies.append(result)
        else:
            failed.append(ticker.upper())

    if not companies:
        raise HTTPException(
            status_code = 503,
            detail      = "Could not retrieve data. Check connection."
        )

    grouped = _group_and_sort(companies)
    top10   = grouped["HALAL"][:10]

    return {
        "summary": {
            "total":        len(companies),
            "halal":        len(grouped["HALAL"]),
            "questionable": len(grouped["QUESTIONABLE"]),
            "haram":        len(grouped["HARAM"]),
            "failed":       len(failed),
        },
        "top10_halal":    top10,
        "halal":          grouped["HALAL"],
        "questionable":   grouped["QUESTIONABLE"],
        "haram":          grouped["HARAM"],
        "failed_tickers": failed,
        "processing_time_ms": round((time.perf_counter() - start) * 1000, 1),
    }


@app.get("/fair-value", tags=["Valuation"])
def fair_value(
    ticker: str = Query(..., description="Stock ticker (e.g. AAPL)")
):
    """
    Returns fair value calculation using Graham formula and DCF model.
    """
    data = get_stock_data(ticker.strip().upper())
    if not data.get("available"):
        raise HTTPException(
            status_code = 404,
            detail      = f"No data available for '{ticker.upper()}'."
        )
    result = calculate_fair_value(data)
    result["ticker"] = ticker.upper()
    result["price"]  = data.get("price")
    return result


@app.get("/history", tags=["Charts"])
def price_history(
    ticker: str = Query(..., description="Stock ticker (e.g. AAPL)"),
    period: str = Query(default="6mo", description="Period: 1mo, 3mo, 6mo, 1y, 2y")
):
    """
    Returns daily price history for charting.
    """
    valid_periods = ["1mo", "3mo", "6mo", "1y", "2y"]
    if period not in valid_periods:
        raise HTTPException(
            status_code = 400,
            detail      = f"Invalid period. Use: {valid_periods}"
        )

    history = get_price_history(ticker.strip().upper(), period=period)
    if not history:
        raise HTTPException(
            status_code = 404,
            detail      = f"No price history for '{ticker.upper()}'."
        )

    return {
        "ticker":  ticker.upper(),
        "period":  period,
        "count":   len(history),
        "history": history,
    }