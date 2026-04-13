"""
api.py
------
Mizan Halal Screener — REST API built with FastAPI.

Endpoints:
  GET /                          → health check
  GET /analyze?ticker=AAPL       → analyze a single stock
  GET /ranking                   → full halal ranking
  GET /ranking?tickers=AAPL,MSFT → ranking for specific tickers
"""

import time
import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse

from app.market_data import get_stock_data
from app.halal_filter import classify_company
from main import calculate_score, TICKERS          # reuse — no duplication

logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "Mizan Halal API",
    description = (
        "Screens global stocks for halal compliance using AAOIFI standards. "
        "Returns halal status, fundamental score, and debt analysis."
    ),
    version     = "1.0.0",
    contact     = {"name": "Daniel Collazo"},
)

# ── Shared logic ──────────────────────────────────────────────────────────────

def _build_company(ticker: str) -> dict | None:
    """
    Fetches, classifies, and scores a single ticker.
    Returns None if data is unavailable.
    """
    data = get_stock_data(ticker.strip().upper())

    if not data.get("available"):
        return None

    market_cap = data.get("market_cap") or 0
    debt       = data.get("debt") or 0
    debt_ratio = debt / market_cap if market_cap else 0

    status = classify_company(
        sector        = data.get("sector", ""),
        debt_ratio    = debt_ratio,
        profit_margin = data.get("profit_margin") or 0,
        industry      = data.get("industry", ""),
    )

    score = calculate_score(data, status)

    return {
        "ticker":        ticker.upper(),
        "name":          data.get("name", ticker),
        "sector":        data.get("sector", "Unknown"),
        "industry":      data.get("industry", "Unknown"),
        "country":       data.get("country", "Unknown"),
        "currency":      data.get("currency", "USD"),
        "price":         data.get("price"),
        "market_cap":    market_cap,
        "debt":          debt,
        "debt_ratio":    round(debt_ratio, 4),
        "profit_margin": data.get("profit_margin"),
        "roe":           data.get("roe"),
        "pe_ratio":      data.get("pe_ratio"),
        "revenue_growth":data.get("revenue_growth"),
        "status":        status,
        "score":         score,
    }


def _group_and_sort(companies: list[dict]) -> dict:
    """Groups companies by status and sorts each group by score."""
    groups: dict[str, list] = {"HALAL": [], "QUESTIONABLE": [], "HARAM": []}
    for c in companies:
        groups.get(c["status"], groups["HARAM"]).append(c)
    for group in groups.values():
        group.sort(key=lambda x: x["score"], reverse=True)
    return groups


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def home():
    """Returns API status and version."""
    return {
        "status":  "online",
        "api":     "Mizan Halal API",
        "version": "1.0.0",
        "docs":    "/docs",
    }


@app.get("/analyze", tags=["Screener"])
def analyze_stock(
    ticker: str = Query(..., description="Stock ticker symbol (e.g. AAPL, PETR4.SA)")
):
    """
    Analyzes a single stock and returns its halal status,
    fundamental data, and investment score.
    """
    start = time.perf_counter()

    result = _build_company(ticker)

    if result is None:
        raise HTTPException(
            status_code = 404,
            detail      = f"No data available for ticker '{ticker.upper()}'. "
                          "Check the symbol and try again."
        )

    result["processing_time_ms"] = round((time.perf_counter() - start) * 1000, 1)
    return result


@app.get("/ranking", tags=["Screener"])
def get_ranking(
    tickers: str = Query(
        default     = None,
        description = "Comma-separated list of tickers. Defaults to the built-in list."
    )
):
    """
    Returns a full halal ranking grouped by status (HALAL, QUESTIONABLE, HARAM).
    Optionally accepts a custom list of tickers via query param.

    Example: /ranking?tickers=AAPL,MSFT,NVDA,JPM
    """
    start = time.perf_counter()

    ticker_list = (
        [t.strip() for t in tickers.split(",") if t.strip()]
        if tickers
        else TICKERS
    )

    if len(ticker_list) > 50:
        raise HTTPException(
            status_code = 400,
            detail      = "Maximum 50 tickers per request."
        )

    companies = []
    failed    = []

    for ticker in ticker_list:
        result = _build_company(ticker)
        if result:
            companies.append(result)
        else:
            failed.append(ticker.upper())

    if not companies:
        raise HTTPException(
            status_code = 503,
            detail      = "Could not retrieve data for any ticker. "
                          "Check your connection or ticker symbols."
        )

    grouped = _group_and_sort(companies)

    return {
        "summary": {
            "total":        len(companies),
            "halal":        len(grouped["HALAL"]),
            "questionable": len(grouped["QUESTIONABLE"]),
            "haram":        len(grouped["HARAM"]),
            "failed":       len(failed),
        },
        "halal":         grouped["HALAL"],
        "questionable":  grouped["QUESTIONABLE"],
        "haram":         grouped["HARAM"],
        "failed_tickers": failed,
        "processing_time_ms": round((time.perf_counter() - start) * 1000, 1),
    }