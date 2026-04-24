"""
api.py
------
Mizan Halal Screener — REST API built with FastAPI.

Endpoints:
  GET  /                              → health check
  GET  /analyze?ticker=AAPL           → analyze a single stock
  GET  /ranking                       → full halal ranking
  GET  /fair-value?ticker=AAPL        → fair value calculation
  GET  /history?ticker=AAPL           → price history for charts
  POST /portfolio/add                 → add stock to portfolio
  GET  /portfolio/{user_id}           → view portfolio
  GET  /portfolio/{user_id}/value     → portfolio value vs invested
  DELETE /portfolio/{item_id}         → remove stock from portfolio
"""

import time
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.market_data import get_stock_data, get_price_history
from app.halal_filter import classify_company
from app.fair_value import calculate_fair_value
from app.scorer import score_company
from app.database import get_db, Portfolio, User, create_tables
from app.alerts import check_alerts

logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")

# ── Create tables on startup ──────────────────────────────────────────────────
create_tables()

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
    version     = "3.0.0",
    contact     = {"name": "Daniel Collazo"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class PortfolioAddRequest(BaseModel):
    user_id:   int
    ticker:    str
    shares:    float
    buy_price: float
    notes:     str = ""


# ── Shared logic ──────────────────────────────────────────────────────────────

def _build_company(ticker: str) -> dict | None:
    data = get_stock_data(ticker.strip().upper())
    if not data.get("available"):
        return None

    market_cap = data.get("market_cap") or 0
    debt       = data.get("debt")       or 0
    debt_ratio = debt / market_cap if market_cap else 0

    halal_result = classify_company(
        sector        = data.get("sector", ""),
        debt_ratio    = debt_ratio,
        profit_margin = data.get("profit_margin") or 0,
        industry      = data.get("industry", ""),
    )
    status     = halal_result["status"]
    fair_value = calculate_fair_value(data)
    scores     = score_company(
        data       = data,
        status     = status,
        upside_pct = fair_value.get("upside_pct"),
    )

    return {
        "ticker":   ticker.upper(),
        "name":     data.get("name", ticker),
        "sector":   data.get("sector", "Unknown"),
        "industry": data.get("industry", "Unknown"),
        "country":  data.get("country", "Unknown"),
        "currency": data.get("currency", "USD"),
        "price":      data.get("price"),
        "52w_high":   data.get("52w_high"),
        "52w_low":    data.get("52w_low"),
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
        "status":       status,
        "reason":       halal_result.get("reason"),
        "reasons":      halal_result.get("reasons", []),
        "purification": halal_result.get("purification", False),
        "fair_value":         fair_value,
        "fundamental_score":  scores["fundamental_score"],
        "investment_score":   scores["investment_score"],
        "grade":              scores["grade"],
    }


def _group_and_sort(companies: list[dict]) -> dict:
    groups: dict[str, list] = {"HALAL": [], "QUESTIONABLE": [], "HARAM": []}
    for c in companies:
        groups.get(c["status"], groups["HARAM"]).append(c)
    for group in groups.values():
        group.sort(key=lambda x: x["investment_score"], reverse=True)
    return groups


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def home():
    return {
        "status":    "online",
        "api":       "Mizan Halal API",
        "version":   "3.0.0",
        "endpoints": [
            "/analyze", "/ranking", "/fair-value",
            "/history", "/portfolio"
        ],
        "docs": "/docs",
    }


# ── Screener ──────────────────────────────────────────────────────────────────

@app.get("/analyze", tags=["Screener"])
def analyze_stock(
    ticker: str = Query(..., description="Stock ticker (e.g. AAPL, PETR4.SA)")
):
    start  = time.perf_counter()
    result = _build_company(ticker)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No data for '{ticker.upper()}'.")
    result["processing_time_ms"] = round((time.perf_counter() - start) * 1000, 1)
    return result


@app.get("/ranking", tags=["Screener"])
def get_ranking(
    tickers: str = Query(default=None, description="Comma-separated tickers.")
):
    start = time.perf_counter()
    ticker_list = (
        [t.strip() for t in tickers.split(",") if t.strip()]
        if tickers else TICKERS
    )
    if len(ticker_list) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 tickers per request.")

    companies, failed = [], []
    for ticker in ticker_list:
        result = _build_company(ticker)
        if result:
            companies.append(result)
        else:
            failed.append(ticker.upper())

    if not companies:
        raise HTTPException(status_code=503, detail="Could not retrieve data.")

    grouped = _group_and_sort(companies)
    return {
        "summary": {
            "total":        len(companies),
            "halal":        len(grouped["HALAL"]),
            "questionable": len(grouped["QUESTIONABLE"]),
            "haram":        len(grouped["HARAM"]),
            "failed":       len(failed),
        },
        "top10_halal":    grouped["HALAL"][:10],
        "halal":          grouped["HALAL"],
        "questionable":   grouped["QUESTIONABLE"],
        "haram":          grouped["HARAM"],
        "failed_tickers": failed,
        "processing_time_ms": round((time.perf_counter() - start) * 1000, 1),
    }


# ── Valuation ─────────────────────────────────────────────────────────────────

@app.get("/fair-value", tags=["Valuation"])
def fair_value(ticker: str = Query(..., description="Stock ticker (e.g. AAPL)")):
    data = get_stock_data(ticker.strip().upper())
    if not data.get("available"):
        raise HTTPException(status_code=404, detail=f"No data for '{ticker.upper()}'.")
    result         = calculate_fair_value(data)
    result["ticker"] = ticker.upper()
    result["price"]  = data.get("price")
    return result


# ── Charts ────────────────────────────────────────────────────────────────────

@app.get("/history", tags=["Charts"])
def price_history(
    ticker: str = Query(..., description="Stock ticker (e.g. AAPL)"),
    period: str = Query(default="6mo", description="Period: 1mo, 3mo, 6mo, 1y, 2y")
):
    valid_periods = ["1mo", "3mo", "6mo", "1y", "2y"]
    if period not in valid_periods:
        raise HTTPException(status_code=400, detail=f"Invalid period. Use: {valid_periods}")
    history = get_price_history(ticker.strip().upper(), period=period)
    if not history:
        raise HTTPException(status_code=404, detail=f"No history for '{ticker.upper()}'.")
    return {"ticker": ticker.upper(), "period": period, "count": len(history), "history": history}


# ── Portfolio ─────────────────────────────────────────────────────────────────

@app.post("/portfolio/add", tags=["Portfolio"])
def add_to_portfolio(
    request: PortfolioAddRequest,
    db: Session = Depends(get_db)
):
    """Adds a stock to the user's portfolio."""
    ticker = request.ticker.strip().upper()

    # Validate ticker
    data = get_stock_data(ticker)
    if not data.get("available"):
        raise HTTPException(status_code=404, detail=f"Invalid ticker '{ticker}'.")

    # Get halal status
    halal_result = classify_company(
        sector        = data.get("sector", ""),
        debt_ratio    = (data.get("debt") or 0) / (data.get("market_cap") or 1),
        profit_margin = data.get("profit_margin") or 0,
        industry      = data.get("industry", ""),
    )

    item = Portfolio(
        user_id      = request.user_id,
        ticker       = ticker,
        name         = data.get("name", ticker),
        shares       = request.shares,
        buy_price    = request.buy_price,
        halal_status = halal_result["status"],
        notes        = request.notes,
        buy_date     = datetime.utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "message":      f"✅ {ticker} added to portfolio!",
        "id":           item.id,
        "ticker":       ticker,
        "name":         data.get("name", ticker),
        "shares":       request.shares,
        "buy_price":    request.buy_price,
        "total_invested": round(request.shares * request.buy_price, 2),
        "halal_status": halal_result["status"],
    }


@app.get("/portfolio/{user_id}", tags=["Portfolio"])
def get_portfolio(user_id: int, db: Session = Depends(get_db)):
    """Returns all stocks in the user's portfolio with current value."""
    items = db.query(Portfolio).filter(Portfolio.user_id == user_id).all()
    if not items:
        return {"portfolio": [], "summary": {"total_invested": 0, "total_value": 0, "return_pct": 0}}

    portfolio = []
    total_invested = 0
    total_value    = 0

    for item in items:
        data          = get_stock_data(item.ticker)
        current_price = data.get("price") or item.buy_price
        invested      = round(item.shares * item.buy_price, 2)
        current       = round(item.shares * current_price, 2)
        gain_loss     = round(current - invested, 2)
        return_pct    = round((current - invested) / invested * 100, 2) if invested else 0

        total_invested += invested
        total_value    += current

        portfolio.append({
            "id":            item.id,
            "ticker":        item.ticker,
            "name":          item.name,
            "shares":        item.shares,
            "buy_price":     item.buy_price,
            "current_price": current_price,
            "invested":      invested,
            "current_value": current,
            "gain_loss":     gain_loss,
            "return_pct":    return_pct,
            "halal_status":  item.halal_status,
            "buy_date":      str(item.buy_date),
            "notes":         item.notes,
        })

    total_return = round((total_value - total_invested) / total_invested * 100, 2) if total_invested else 0

    return {
        "portfolio": portfolio,
        "summary": {
            "total_invested": round(total_invested, 2),
            "total_value":    round(total_value, 2),
            "gain_loss":      round(total_value - total_invested, 2),
            "return_pct":     total_return,
            "positions":      len(portfolio),
        }
    }


@app.delete("/portfolio/{item_id}", tags=["Portfolio"])
def remove_from_portfolio(item_id: int, db: Session = Depends(get_db)):
    """Removes a stock from the portfolio."""
    item = db.query(Portfolio).filter(Portfolio.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Portfolio item {item_id} not found.")
    db.delete(item)
    db.commit()
    return {"message": f"✅ {item.ticker} removed from portfolio!"}

# ── Alerts ────────────────────────────────────────────────────────────────────

@app.get("/alerts/{user_id}", tags=["Alerts"])
def get_alerts(user_id: int):
    """
    Returns triggered price alerts for a user's watchlist.
    """
    alerts = check_alerts(user_id)
    return {
        "user_id":      user_id,
        "total_alerts": len(alerts),
        "alerts":       alerts,
    }