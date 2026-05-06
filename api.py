"""
api.py
------
Mizan Halal Screener — REST API built with FastAPI.
"""

import time
import logging
import os
import stripe
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.market_data import get_stock_data, get_price_history
from app.halal_filter import classify_company
from app.fair_value import calculate_fair_value
from app.scorer import score_company
from app.database import get_db, Portfolio, Watchlist, PortfolioSnapshot, User, create_tables, ComplianceSnapshot, ComplianceAlert, PriceAlert, HalalAlternative
from app.auth import hash_password, verify_password, create_access_token, decode_token
from app.alerts import check_alerts
from app.recommendations import get_monthly_recommendations
from app.fmp_data import (
    get_company_profile, get_income_statement,
    get_key_metrics, get_dividends, get_balance_sheet
)
logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")

create_tables()

TICKERS: list[str] = [
    "AAPL", "MSFT", "AMZN", "NVDA", "GOOGL", "META", "TSLA", "AVGO",
    "JNJ", "WMT", "UNH", "V", "MA", "PG", "HD", "XOM", "LLY", "MRK",
    "CVX", "ABBV", "PEP", "KO", "COST", "MCD", "NKE", "SBUX", "DIS",
    "NFLX", "ADBE", "CRM", "ORCL", "CSCO", "INTC", "AMD", "QCOM",
    "TXN", "IBM", "AMAT", "LRCX", "MU", "NOW", "SHOP", "UBER", "ABNB",
    "BKNG", "PYPL", "INTU", "AMGN", "GE", "CAT", "DE", "HON", "UNP",
]

app = FastAPI(
    title       = "Mizan Halal API",
    description = "Screens global stocks for halal compliance using AAOIFI standards.",
    version     = "4.0.0",
    contact     = {"name": "Daniel Collazo"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class PortfolioAddRequest(BaseModel):
    user_id:   int
    ticker:    str
    shares:    float
    buy_price: float
    notes:     str = ""
class RegisterRequest(BaseModel):
    name:     str
    email:    str
    password: str

class LoginRequest(BaseModel):
    email:    str
    password: str

class WatchlistAddRequest(BaseModel):
    user_id:      int
    ticker:       str
    target_price: float


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
        "ticker":         ticker.upper(),
        "name":           data.get("name", ticker),
        "sector":         data.get("sector", "Unknown"),
        "industry":       data.get("industry", "Unknown"),
        "country":        data.get("country", "Unknown"),
        "currency":       data.get("currency", "USD"),
        "price":          data.get("price"),
        "52w_high":       data.get("52w_high"),
        "52w_low":        data.get("52w_low"),
        "target_price":   data.get("target_price"),
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
        "eps":            data.get("eps"),
        "book_value":     data.get("book_value"),
        "status":         status,
        "reason":         halal_result.get("reason"),
        "reasons":        halal_result.get("reasons", []),
        "purification":   halal_result.get("purification", False),
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
        "status":  "online",
        "api":     "Mizan Halal API",
        "version": "4.0.0",
        "docs":    "/docs",
    }


# ── Screener ──────────────────────────────────────────────────────────────────

@app.get("/analyze", tags=["Screener"])
def analyze_stock(ticker: str = Query(...)):
    start  = time.perf_counter()
    result = _build_company(ticker)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No data for '{ticker.upper()}'.")
    result["processing_time_ms"] = round((time.perf_counter() - start) * 1000, 1)
    return result


@app.get("/ranking", tags=["Screener"])
def get_ranking(tickers: str = Query(default=None)):
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
def fair_value(ticker: str = Query(...)):
    data = get_stock_data(ticker.strip().upper())
    if not data.get("available"):
        raise HTTPException(status_code=404, detail=f"No data for '{ticker.upper()}'.")
    result           = calculate_fair_value(data)
    result["ticker"] = ticker.upper()
    result["price"]  = data.get("price")
    return result


# ── Charts ────────────────────────────────────────────────────────────────────

@app.get("/history", tags=["Charts"])
def price_history(
    ticker: str = Query(...),
    period: str = Query(default="6mo")
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
def add_to_portfolio(request: PortfolioAddRequest, db: Session = Depends(get_db)):
    ticker = request.ticker.strip().upper()
    data   = get_stock_data(ticker)
    if not data.get("available"):
        raise HTTPException(status_code=404, detail=f"Invalid ticker '{ticker}'.")

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
        "message":        f"✅ {ticker} added to portfolio!",
        "id":             item.id,
        "ticker":         ticker,
        "name":           data.get("name", ticker),
        "shares":         request.shares,
        "buy_price":      request.buy_price,
        "total_invested": round(request.shares * request.buy_price, 2),
        "halal_status":   halal_result["status"],
    }


@app.get("/portfolio/{user_id}", tags=["Portfolio"])
def get_portfolio(user_id: int, db: Session = Depends(get_db)):
    items = db.query(Portfolio).filter(Portfolio.user_id == user_id).all()
    if not items:
        return {"portfolio": [], "summary": {"total_invested": 0, "total_value": 0, "return_pct": 0}}

    portfolio      = []
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
@app.post("/portfolio/{user_id}/snapshot", tags=["Portfolio"])
def save_snapshot(user_id: int, db: Session = Depends(get_db)):
    items = db.query(Portfolio).filter(Portfolio.user_id == user_id).all()
    if not items:
        raise HTTPException(status_code=400, detail="No portfolio items found.")

    total_invested = sum(i.shares * i.buy_price for i in items)
    total_value = 0
    for item in items:
        data = get_stock_data(item.ticker)
        current_price = data.get("price") or item.buy_price
        total_value += item.shares * current_price

    return_pct = round((total_value - total_invested) / total_invested * 100, 2) if total_invested else 0

    snapshot = PortfolioSnapshot(
        user_id        = user_id,
        total_value    = round(total_value, 2),
        total_invested = round(total_invested, 2),
        return_pct     = return_pct,
    )
    db.add(snapshot)
    db.commit()
    return {"message": "✅ Snapshot saved!", "total_value": round(total_value, 2)}


@app.get("/portfolio/{user_id}/evolution", tags=["Portfolio"])
def get_evolution(user_id: int, db: Session = Depends(get_db)):
    snapshots = db.query(PortfolioSnapshot).filter(
        PortfolioSnapshot.user_id == user_id
    ).order_by(PortfolioSnapshot.date).all()

    return {
        "evolution": [
            {
                "date":           s.date.strftime("%Y-%m-%d"),
                "total_value":    s.total_value,
                "total_invested": s.total_invested,
                "return_pct":     s.return_pct,
            }
            for s in snapshots
        ]
    }
def remove_from_portfolio(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Portfolio).filter(Portfolio.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Portfolio item {item_id} not found.")
    db.delete(item)
    db.commit()
    return {"message": f"✅ {item.ticker} removed from portfolio!"}


# ── Watchlist ─────────────────────────────────────────────────────────────────

@app.post("/watchlist/add", tags=["Watchlist"])
def add_to_watchlist(request: WatchlistAddRequest, db: Session = Depends(get_db)):
    ticker = request.ticker.strip().upper()
    data   = get_stock_data(ticker)
    if not data.get("available"):
        raise HTTPException(status_code=404, detail=f"Invalid ticker '{ticker}'.")

    halal_result = classify_company(
        sector        = data.get("sector", ""),
        debt_ratio    = (data.get("debt") or 0) / (data.get("market_cap") or 1),
        profit_margin = data.get("profit_margin") or 0,
        industry      = data.get("industry", ""),
    )

    item = Watchlist(
        user_id      = request.user_id,
        ticker       = ticker,
        name         = data.get("name", ticker),
        target_price = request.target_price,
        halal_status = halal_result["status"],
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "message":       f"✅ {ticker} added to watchlist!",
        "id":            item.id,
        "ticker":        ticker,
        "name":          data.get("name", ticker),
        "target_price":  request.target_price,
        "current_price": data.get("price"),
        "halal_status":  halal_result["status"],
    }


# ── Alerts ────────────────────────────────────────────────────────────────────

@app.get("/alerts/{user_id}", tags=["Alerts"])
def get_alerts(user_id: int):
    alerts = check_alerts(user_id)
    return {
        "user_id":      user_id,
        "total_alerts": len(alerts),
        "alerts":       alerts,
    }


# ── Recommendations ───────────────────────────────────────────────────────────

@app.get("/recommendations", tags=["Recommendations"])
def monthly_recommendations(top_n: int = Query(default=3)):
    return get_monthly_recommendations(top_n=top_n)


# ── Company (Alpha Vantage) ───────────────────────────────────────────────────

@app.get("/company/{ticker}", tags=["Company"])
def company_profile(ticker: str):
    profile = get_company_profile(ticker.upper())
    if not profile:
        raise HTTPException(status_code=404, detail=f"No profile for '{ticker.upper()}'.")
    return profile


@app.get("/financials/{ticker}", tags=["Company"])
def company_financials(ticker: str):
    income  = get_income_statement(ticker.upper())
    metrics = get_key_metrics(ticker.upper())
    balance = get_balance_sheet(ticker.upper())
    return {
        "ticker":  ticker.upper(),
        "income":  income,
        "metrics": metrics,
        "balance": balance,
    }


@app.get("/dividends/{ticker}", tags=["Company"])
def company_dividends(ticker: str):
    dividends = get_dividends(ticker.upper())
    return {"ticker": ticker.upper(), "dividends": dividends}

# ── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/auth/register", tags=["Auth"])
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    user = User(
        name       = request.name,
        email      = request.email,
        password   = hash_password(request.password),
        is_premium = False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"user_id": user.id, "email": user.email})
    return {
        "message": "✅ Account created!",
        "token":   token,
        "user": {
            "id":    user.id,
            "name":  user.name,
            "email": user.email,
        }
    }


@app.post("/auth/login", tags=["Auth"])
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"user_id": user.id, "email": user.email})
    return {
        "message": "✅ Login successful!",
        "token":   token,
        "user": {
            "id":    user.id,
            "name":  user.name,
            "email": user.email,
        }
    }


@app.get("/auth/me", tags=["Auth"])
def get_me(token: str = Query(...), db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "id":         user.id,
        "name":       user.name,
        "email":      user.email,
        "is_premium": user.is_premium,
        "created_at": str(user.created_at),
    }


# ── Price Alerts ──────────────────────────────────────────────────────────────

from app.email_service import send_price_alert_email, send_compliance_alert_email
from app.export_service import generate_stock_pdf, generate_ranking_excel
from fastapi.responses import Response

class PriceAlertRequest(BaseModel):
    user_id:      int
    ticker:       str
    name:         str = ""
    target_price: float
    condition:    str = "below"

@app.post("/price-alerts", tags=["Alerts"])
def create_price_alert(request: PriceAlertRequest, db: Session = Depends(get_db)):
    alert = PriceAlert(
        user_id      = request.user_id,
        ticker       = request.ticker.upper(),
        name         = request.name or request.ticker.upper(),
        target_price = request.target_price,
        condition    = request.condition,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"message": "✅ Alert created!", "alert_id": alert.id}

@app.get("/price-alerts/{user_id}", tags=["Alerts"])
def get_price_alerts(user_id: int, db: Session = Depends(get_db)):
    alerts = db.query(PriceAlert).filter(
        PriceAlert.user_id == user_id,
        PriceAlert.is_active == True,
    ).all()
    return {"alerts": [
        {
            "id":           a.id,
            "ticker":       a.ticker,
            "name":         a.name,
            "target_price": a.target_price,
            "condition":    a.condition,
            "created_at":   str(a.created_at),
        } for a in alerts
    ]}

@app.delete("/price-alerts/{alert_id}", tags=["Alerts"])
def delete_price_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(PriceAlert).filter(PriceAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    db.delete(alert)
    db.commit()
    return {"message": "✅ Alert deleted!"}

@app.post("/price-alerts/check", tags=["Alerts"])
def check_price_alerts(db: Session = Depends(get_db)):
    active = db.query(PriceAlert).filter(PriceAlert.is_active == True).all()
    triggered = []
    for alert in active:
        try:
            data = get_stock_data(alert.ticker)
            if not data.get("available"):
                continue
            current_price = data.get("price") or 0
            hit = (
                (alert.condition == "below" and current_price <= alert.target_price) or
                (alert.condition == "above" and current_price >= alert.target_price)
            )
            if hit:
                user = db.query(User).filter(User.id == alert.user_id).first()
                if user:
                    send_price_alert_email(
                        to_email      = user.email,
                        user_name     = user.name,
                        ticker        = alert.ticker,
                        stock_name    = alert.name or alert.ticker,
                        current_price = current_price,
                        target_price  = alert.target_price,
                        condition     = alert.condition,
                    )
                alert.is_active    = False
                alert.triggered_at = datetime.utcnow()
                db.commit()
                triggered.append(alert.ticker)
        except Exception:
            continue
    return {"checked": len(active), "triggered": triggered}

# ── Export ────────────────────────────────────────────────────────────────────

@app.get("/export/pdf/{ticker}", tags=["Export"])
def export_stock_pdf(ticker: str):
    result = _build_company(ticker.upper())
    if not result:
        raise HTTPException(status_code=404, detail=f"No data for '{ticker.upper()}'.")
    pdf_bytes = generate_stock_pdf(result)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=mizan_{ticker.upper()}.pdf"}
    )

@app.get("/export/excel/ranking", tags=["Export"])
def export_ranking_excel(tickers: str = Query(default=None)):
    ticker_list = (
        [t.strip() for t in tickers.split(",") if t.strip()]
        if tickers else TICKERS
    )
    companies = [r for t in ticker_list if (r := _build_company(t)) is not None]
    if not companies:
        raise HTTPException(status_code=503, detail="No data available.")
    grouped = _group_and_sort(companies)
    all_companies = grouped["HALAL"] + grouped["QUESTIONABLE"] + grouped["HARAM"]
    excel_bytes = generate_ranking_excel(all_companies)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=mizan_ranking.xlsx"}
    )

# ── Benchmarks ────────────────────────────────────────────────────────────────

@app.get("/benchmarks", tags=["Benchmarks"])
def get_benchmarks(period: str = Query(default="1y")):
    import yfinance as yf
    
    benchmarks = {
    "sp500":    "^GSPC",
    "nasdaq":   "^IXIC",
    "djimi":    "DJIM",
    "ftse100":  "^FTSE",
    "dax":      "^GDAXI",
    "emerging": "EEM",
    "shanghai": "000001.SS",
}
    
    result = {}
    for name, symbol in benchmarks.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period)
            if hist.empty:
                continue
            
            # Normaliza para base 100
            first_price = hist["Close"].iloc[0]
            data = [
                {
                    "date":  str(hist.index[i].date()),
                    "value": round((hist["Close"].iloc[i] / first_price) * 100, 2),
                }
                for i in range(len(hist))
            ]
            result[name] = data
        except Exception:
            result[name] = []
    
    return result

    # ── Zakat Calculator ─────────────────────────────────────────────────────────

@app.get("/zakat/{user_id}", tags=["Zakat"])
def calculate_zakat(user_id: int, db: Session = Depends(get_db)):
    """
    Calcula o Zakat devido baseado no portfólio do usuário.
    Zakat = 2.5% sobre ativos elegíveis acima do nisab.
    Nisab atual: equivalente a 85g de ouro (~$5,200 USD).
    """
    try:
        # Busca o portfólio do usuário
        items = db.execute(
            text("SELECT ticker, shares, buy_price, halal_status FROM portfolios WHERE user_id = :uid"),
            {"uid": user_id}
        ).fetchall()

        if not items:
            return {
                "user_id": user_id,
                "portfolio_value": 0,
                "eligible_value": 0,
                "nisab_usd": 5200,
                "zakat_due": 0,
                "zakat_rate": 0.025,
                "above_nisab": False,
                "breakdown": []
            }

        NISAB_USD    = 5200.0   # equivalente a 85g de ouro em USD
        ZAKAT_RATE   = 0.025    # 2.5%

        breakdown    = []
        total_value  = 0.0
        eligible     = 0.0

        for item in items:
            ticker       = item[0]
            shares       = item[1] or 0
            price        = item[2] or 0
            halal_status = item[3] or "unknown"
            value        = shares * price

            total_value += value

            # Só ativos halal são elegíveis para Zakat
            is_eligible = halal_status.lower() == "halal"
            if is_eligible:
                eligible += value

            breakdown.append({
                "ticker":       ticker,
                "value":        round(value, 2),
                "halal_status": halal_status,
                "eligible":     is_eligible,
                "zakat":        round(value * ZAKAT_RATE, 2) if is_eligible else 0,
            })

        above_nisab = eligible > NISAB_USD
        zakat_due   = round(eligible * ZAKAT_RATE, 2) if above_nisab else 0.0

        return {
            "user_id":        user_id,
            "portfolio_value": round(total_value, 2),
            "eligible_value": round(eligible, 2),
            "nisab_usd":      NISAB_USD,
            "zakat_due":      zakat_due,
            "zakat_rate":     ZAKAT_RATE,
            "above_nisab":    above_nisab,
            "breakdown":      breakdown,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    # ── Compliance Alerts ────────────────────────────────────────────────────────

@app.post("/compliance-check", tags=["Compliance"])
def run_compliance_check(db: Session = Depends(get_db)):
    watchlist_items = db.query(Watchlist).all()
    tickers_checked = set()
    alerts_fired = []

    for item in watchlist_items:
        ticker = item.ticker
        if ticker in tickers_checked:
            continue
        tickers_checked.add(ticker)

        try:
            result = _build_company(ticker)
            if not result:
                continue

            new_status = result["status"]
            company_name = result["name"]

            snapshot = db.query(ComplianceSnapshot).filter(
                ComplianceSnapshot.ticker == ticker
            ).first()

            if snapshot is None:
                snapshot = ComplianceSnapshot(
                    ticker=ticker,
                    company_name=company_name,
                    status=new_status,
                    score=result.get("investment_score"),
                )
                db.add(snapshot)
                db.commit()
                continue

            prev_status = snapshot.status

            if prev_status != new_status:
                alert = ComplianceAlert(
                    ticker=ticker,
                    company_name=company_name,
                    prev_status=prev_status,
                    new_status=new_status,
                )
                db.add(alert)
                snapshot.status = new_status
                snapshot.score = result.get("investment_score")
                db.commit()
                db.refresh(alert)

                affected_users = db.query(Watchlist).filter(
                    Watchlist.ticker == ticker
                ).all()

                for w in affected_users:
                    user = db.query(User).filter(User.id == w.user_id).first()
                    if user:
                        send_compliance_alert_email(
                            to_email=user.email,
                            user_name=user.name,
                            ticker=ticker,
                            company_name=company_name,
                            prev_status=prev_status,
                            new_status=new_status,
                        )

                alert.notified = True
                db.commit()
                alerts_fired.append({
                    "ticker": ticker,
                    "prev_status": prev_status,
                    "new_status": new_status,
                })
            else:
                snapshot.score = result.get("investment_score")
                db.commit()

        except Exception as e:
            logging.warning(f"Compliance check failed for {ticker}: {e}")
            continue

    return {
        "tickers_checked": len(tickers_checked),
        "alerts_fired": len(alerts_fired),
        "changes": alerts_fired,
    }


@app.get("/compliance-alerts/{user_id}", tags=["Compliance"])
def get_compliance_alerts(user_id: int, db: Session = Depends(get_db)):
    user_tickers = [
        w.ticker for w in db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
    ]

    if not user_tickers:
        return {"user_id": user_id, "alerts": []}

    alerts = (
        db.query(ComplianceAlert)
        .filter(ComplianceAlert.ticker.in_(user_tickers))
        .order_by(ComplianceAlert.changed_at.desc())
        .limit(50)
        .all()
    )

    return {
        "user_id": user_id,
        "total": len(alerts),
        "alerts": [
            {
                "id": a.id,
                "ticker": a.ticker,
                "company_name": a.company_name,
                "prev_status": a.prev_status,
                "new_status": a.new_status,
                "changed_at": str(a.changed_at),
            }
            for a in alerts
        ],
    }

# ── Halal Alternatives ────────────────────────────────────────────────────────

# Alternativas curadas por setor — adicionadas uma vez na base de dados
HALAL_ALTERNATIVES_DATA = [
    # Pagamentos (substitutos de V, MA, PYPL)
    {"haram_ticker": "V",    "alt_ticker": "AAPL",  "alt_name": "Apple Inc",            "reason": "Apple Pay — tech-based payments, no interest income",  "sector": "Technology"},
    {"haram_ticker": "V",    "alt_ticker": "MSFT",  "alt_name": "Microsoft",            "reason": "Tech, no interest-based revenue",                      "sector": "Technology"},
    {"haram_ticker": "MA",   "alt_ticker": "AAPL",  "alt_name": "Apple Inc",            "reason": "Apple Pay — tech-based payments, no interest income",  "sector": "Technology"},
    {"haram_ticker": "PYPL", "alt_ticker": "AAPL",  "alt_name": "Apple Inc",            "reason": "Apple Pay — tech-based payments, no interest income",  "sector": "Technology"},
    # Bancos
    {"haram_ticker": "JPM",  "alt_ticker": "MSFT",  "alt_name": "Microsoft",            "reason": "Tech, no interest-based revenue",                      "sector": "Technology"},
    {"haram_ticker": "BAC",  "alt_ticker": "NVDA",  "alt_name": "NVIDIA",               "reason": "Semiconductors, no haram activities",                  "sector": "Technology"},
    {"haram_ticker": "GS",   "alt_ticker": "AAPL",  "alt_name": "Apple Inc",            "reason": "Tech, no interest-based revenue",                      "sector": "Technology"},
    # Álcool / Tabaco
    {"haram_ticker": "MO",   "alt_ticker": "COST",  "alt_name": "Costco",               "reason": "Retail, halal consumer goods",                         "sector": "Consumer"},
    {"haram_ticker": "PM",   "alt_ticker": "WMT",   "alt_name": "Walmart",              "reason": "Retail, halal consumer goods",                         "sector": "Consumer"},
    {"haram_ticker": "BUD",  "alt_ticker": "PEP",   "alt_name": "PepsiCo",              "reason": "Beverages without alcohol",                            "sector": "Consumer"},
    # Casinos
    {"haram_ticker": "LVS",  "alt_ticker": "ABNB",  "alt_name": "Airbnb",               "reason": "Halal hospitality and travel",                         "sector": "Consumer"},
    {"haram_ticker": "MGM",  "alt_ticker": "ABNB",  "alt_name": "Airbnb",               "reason": "Halal hospitality and travel",                         "sector": "Consumer"},
    # Defesa
    {"haram_ticker": "LMT",  "alt_ticker": "HON",   "alt_name": "Honeywell",            "reason": "Industrial tech, minimal weapons exposure",            "sector": "Industrials"},
    {"haram_ticker": "RTX",  "alt_ticker": "HON",   "alt_name": "Honeywell",            "reason": "Industrial tech, minimal weapons exposure",            "sector": "Industrials"},
]

@app.on_event("startup")
def seed_halal_alternatives():
    """Popula a tabela halal_alternatives na startup se estiver vazia."""
    db = next(get_db())
    try:
        existing = db.query(HalalAlternative).count()
        if existing == 0:
            for item in HALAL_ALTERNATIVES_DATA:
                db.add(HalalAlternative(**item))
            db.commit()
            logging.info(f"✅ Seeded {len(HALAL_ALTERNATIVES_DATA)} halal alternatives.")
    except Exception as e:
        logging.warning(f"Seed alternatives failed: {e}")
    finally:
        db.close()


@app.get("/alternatives/{ticker}", tags=["Screener"])
def get_halal_alternatives(ticker: str):
    ticker = ticker.strip().upper()

    STATIC_ALTERNATIVES = {
        "V":    [("AAPL", "Apple Inc",  "Apple Pay — tech payments, no interest income"),
                 ("MSFT", "Microsoft",  "Tech, no interest-based revenue")],
        "MA":   [("AAPL", "Apple Inc",  "Apple Pay — tech payments, no interest income"),
                 ("MSFT", "Microsoft",  "Tech, no interest-based revenue")],
        "PYPL": [("AAPL", "Apple Inc",  "Apple Pay — tech payments, no interest income")],
        "JPM":  [("MSFT", "Microsoft",  "Tech, no interest-based revenue"),
                 ("NVDA", "NVIDIA",     "Semiconductors, no haram activities")],
        "BAC":  [("NVDA", "NVIDIA",     "Semiconductors, no haram activities"),
                 ("AAPL", "Apple Inc",  "Tech, no interest-based revenue")],
        "GS":   [("AAPL", "Apple Inc",  "Tech, no interest-based revenue")],
        "WFC":  [("MSFT", "Microsoft",  "Tech, no interest-based revenue")],
        "MO":   [("COST", "Costco",     "Retail, halal consumer goods"),
                 ("WMT",  "Walmart",    "Retail, halal consumer goods")],
        "PM":   [("WMT",  "Walmart",    "Retail, halal consumer goods")],
        "BUD":  [("PEP",  "PepsiCo",   "Beverages without alcohol")],
        "LVS":  [("ABNB", "Airbnb",    "Halal hospitality and travel")],
        "MGM":  [("ABNB", "Airbnb",    "Halal hospitality and travel")],
        "LMT":  [("HON",  "Honeywell", "Industrial tech, minimal weapons exposure")],
        "RTX":  [("HON",  "Honeywell", "Industrial tech, minimal weapons exposure")],
    }

    alts = STATIC_ALTERNATIVES.get(ticker, [])
    results = []

    for alt_ticker, alt_name, reason in alts:
        try:
            data = _build_company(alt_ticker)
            if data:
                results.append({
                    "ticker": alt_ticker,
                    "name":   alt_name,
                    "reason": reason,
                    "sector": data.get("sector", ""),
                    "price":  data.get("price"),
                    "status": data["status"],
                    "score":  data.get("investment_score"),
                    "grade":  data.get("grade"),
                    "upside": data.get("fair_value", {}).get("upside_pct"),
                })
        except Exception:
            continue

    return {
        "ticker": ticker,
        "total": len(results),
        "alternatives": results,
    }

    return {
        "ticker": ticker,
        "total": len(results),
        "alternatives": results,
    }

# ── Baskets Temáticos ─────────────────────────────────────────────────────────

BASKETS = [
    {
        "id": "top-tech-halal",
        "name": "Top 10 Tech Halal",
        "emoji": "💻",
        "description": "The best halal technology stocks — high growth, no haram activities.",
        "tickers": ["AAPL", "MSFT", "NVDA", "GOOGL", "AVGO", "AMD", "QCOM", "AMAT", "NOW", "ADBE"],
    },
    {
        "id": "healthcare-halal",
        "name": "Healthcare Halal",
        "emoji": "💊",
        "description": "Pharmaceutical and medical companies screened for halal compliance.",
        "tickers": ["JNJ", "LLY", "MRK", "ABBV", "AMGN", "UNH", "INTU", "TMO", "DHR", "ISRG"],
    },
    {
        "id": "consumer-halal",
        "name": "Consumer Staples Halal",
        "emoji": "🛒",
        "description": "Everyday consumer goods companies — halal certified.",
        "tickers": ["WMT", "COST", "PG", "KO", "PEP", "MCD", "NKE", "SBUX", "HD", "TGT"],
    },
    {
        "id": "industrial-halal",
        "name": "Industrials Halal",
        "emoji": "⚙️",
        "description": "Industrial and infrastructure companies with halal compliance.",
        "tickers": ["HON", "GE", "CAT", "DE", "UNP", "MMM", "EMR", "ITW", "ROK", "PH"],
    },
    {
        "id": "dividend-halal",
        "name": "Halal Dividend Kings",
        "emoji": "💰",
        "description": "Halal stocks with consistent dividend payments.",
        "tickers": ["JNJ", "KO", "PG", "ABBV", "MRK", "WMT", "NKE", "PEP", "HON", "TXN"],
    },
]

@app.get("/baskets", tags=["Baskets"])
def get_baskets():
    """Retorna a lista de baskets temáticos disponíveis."""
    return {
        "total": len(BASKETS),
        "baskets": [
            {
                "id": b["id"],
                "name": b["name"],
                "emoji": b["emoji"],
                "description": b["description"],
                "ticker_count": len(b["tickers"]),
                "tickers": b["tickers"],
            }
            for b in BASKETS
        ]
    }

@app.get("/baskets/{basket_id}", tags=["Baskets"])
def get_basket_detail(basket_id: str):
    """Retorna os detalhes de um basket específico com análise halal de cada ticker."""
    basket = next((b for b in BASKETS if b["id"] == basket_id), None)
    if not basket:
        raise HTTPException(status_code=404, detail=f"Basket '{basket_id}' not found.")

    stocks = []
    for ticker in basket["tickers"]:
        try:
            data = _build_company(ticker)
            if data:
                stocks.append({
                    "ticker": data["ticker"],
                    "name": data["name"],
                    "status": data["status"],
                    "grade": data["grade"],
                    "score": data["investment_score"],
                    "price": data["price"],
                    "upside": data.get("fair_value", {}).get("upside_pct"),
                    "sector": data["sector"],
                })
        except Exception:
            continue

    halal_count = sum(1 for s in stocks if s["status"] == "HALAL")

    return {
        "id": basket["id"],
        "name": basket["name"],
        "emoji": basket["emoji"],
        "description": basket["description"],
        "total": len(stocks),
        "halal_count": halal_count,
        "stocks": sorted(stocks, key=lambda x: x["score"], reverse=True),
    }

# ── Stripe Payments ───────────────────────────────────────────────────────────

import stripe

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

STRIPE_PRICES = {
    "monthly": "price_1TT9um2MhVyyYbTcRpqa72yI",
    "yearly":  "price_1TT9x42MhVyyYbTcur7X04tI",
} 

FRONTEND_URL = "https://mizan-web-omega.vercel.app"

class CheckoutRequest(BaseModel):
    user_id: int
    plan: str  # "monthly" ou "yearly"

@app.post("/create-checkout-session", tags=["Payments"])
def create_checkout_session(request: CheckoutRequest, db: Session = Depends(get_db)):
    price_id = STRIPE_PRICES.get(request.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid plan.")

    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            customer_email=user.email,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{FRONTEND_URL}?upgrade=success",
            cancel_url=f"{FRONTEND_URL}?upgrade=cancelled",
            metadata={"user_id": str(request.user_id)},
        )
        return {"checkout_url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhook/stripe", tags=["Payments"])
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook.")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = int(session["metadata"].get("user_id", 0))
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_premium = True
            db.commit()

    return {"status": "ok"}

# ── Portfolio Advanced — Risk & Diversification ───────────────────────────────

@app.get("/portfolio/{user_id}/risk", tags=["Portfolio"])
def get_portfolio_risk(user_id: int, db: Session = Depends(get_db)):
    """
    Análise de risco do portfolio — volatilidade, diversificação, alertas.
    """
    positions = db.query(Portfolio).filter(Portfolio.user_id == user_id).all()
    if not positions:
        return {
            "user_id": user_id,
            "score": None,
            "grade": None,
            "total_score": 0,
            "breakdown": {"halal": 0, "diversification": 0, "return": 0},
            "details": {}
        }

    total_value = sum(p.current_price * p.shares for p in positions if p.current_price)
    alerts = []
    positions_data = []

    for p in positions:
        if not p.current_price:
            continue
        value = p.current_price * p.shares
        allocation = (value / total_value * 100) if total_value > 0 else 0

        # Alerta de concentração
        if allocation > 20:
            alerts.append({
                "type": "CONCENTRATION",
                "severity": "WARNING",
                "ticker": p.ticker,
                "message": f"{p.ticker} represents {allocation:.1f}% of your portfolio — consider reducing to below 20%",
            })

        # Alerta de posição HARAM
        if p.halal_status == "HARAM":
            alerts.append({
                "type": "COMPLIANCE",
                "severity": "CRITICAL",
                "ticker": p.ticker,
                "message": f"{p.ticker} is classified as HARAM — consider replacing with a halal alternative",
            })

        positions_data.append({
            "ticker": p.ticker,
            "allocation": round(allocation, 1),
            "value": round(value, 2),
            "shares": p.shares,
            "halal_status": p.halal_status,
        })

    # Diversificação por sector
    sector_map = {}
    for p in positions:
        sector = p.sector or "Unknown"
        value = (p.current_price or 0) * p.shares
        sector_map[sector] = sector_map.get(sector, 0) + value

    sector_allocation = [
        {"sector": k, "value": round(v, 2), "pct": round(v / total_value * 100, 1)}
        for k, v in sector_map.items()
    ]

    # Alerta de falta de diversificação
    if len(sector_map) < 3:
        alerts.append({
            "type": "DIVERSIFICATION",
            "severity": "INFO",
            "ticker": None,
            "message": f"Your portfolio only covers {len(sector_map)} sector(s) — consider diversifying across more sectors",
        })

    # Rebalanceamento sugerido
    rebalance = []
    target_pct = 100 / len(positions_data) if positions_data else 0
    for p in positions_data:
        diff = p["allocation"] - target_pct
        if abs(diff) > 5:
            action = "REDUCE" if diff > 0 else "INCREASE"
            rebalance.append({
                "ticker": p["ticker"],
                "current_pct": p["allocation"],
                "target_pct": round(target_pct, 1),
                "action": action,
                "diff": round(abs(diff), 1),
            })

    return {
        "user_id": user_id,
        "total_value": round(total_value, 2),
        "positions": len(positions_data),
        "alerts": alerts,
        "sector_allocation": sector_allocation,
        "rebalance_suggestions": rebalance,
        "diversification_score": min(100, len(sector_map) * 20),
    }
# ── Portfolio Score ───────────────────────────────────────────────────────────

@app.get("/portfolio/{user_id}/score", tags=["Portfolio"])
def get_portfolio_score(user_id: int, db: Session = Depends(get_db)):
    """
    Score geral do portfolio de A+ a F baseado em halal, diversificação e retorno.
    """
    positions = db.query(Portfolio).filter(Portfolio.user_id == user_id).all()
    if not positions:
        return {"user_id": user_id, "score": None}

    # Halal Score (0-40 pontos)
    halal_count = sum(1 for p in positions if p.halal_status == "HALAL")
    haram_count = sum(1 for p in positions if p.halal_status == "HARAM")
    halal_pct = halal_count / len(positions) * 100
    halal_points = (halal_pct / 100) * 40
    # Penalização por HARAM
    halal_points -= haram_count * 5
    halal_points = max(0, halal_points)

    # Diversificação Score (0-30 pontos)
    sectors = set(p.sector for p in positions if p.sector) or {"Technology"}
    diversification_points = min(30, len(sectors) * 6)

    # Retorno Score (0-30 pontos)
    total_invested = sum(p.buy_price * p.shares for p in positions if p.buy_price)
    total_value = sum((p.current_price or p.buy_price) * p.shares for p in positions)
    return_pct = ((total_value - total_invested) / total_invested * 100) if total_invested > 0 else 0

    if return_pct >= 20:
        return_points = 30
    elif return_pct >= 10:
        return_points = 22
    elif return_pct >= 0:
        return_points = 15
    elif return_pct >= -10:
        return_points = 8
    else:
        return_points = 0

    total_score = halal_points + diversification_points + return_points

    # Grade
    if total_score >= 90:
        grade = "A+"
    elif total_score >= 80:
        grade = "A"
    elif total_score >= 70:
        grade = "B+"
    elif total_score >= 60:
        grade = "B"
    elif total_score >= 50:
        grade = "C+"
    elif total_score >= 40:
        grade = "C"
    elif total_score >= 30:
        grade = "D"
    else:
        grade = "F"

    return {
        "user_id": user_id,
        "total_score": round(total_score, 1),
        "grade": grade,
        "breakdown": {
            "halal": round(halal_points, 1),
            "diversification": round(diversification_points, 1),
            "return": round(return_points, 1),
        },
        "details": {
            "halal_pct": round(halal_pct, 1),
            "sectors": len(sectors),
            "return_pct": round(return_pct, 1),
            "total_value": round(total_value, 2),
        }
    }

    # ── Markets Dashboard ─────────────────────────────────────────────────────────

@app.get("/markets", tags=["Markets"])
def get_markets():
    """
    Retorna dados em tempo real de índices, forex e commodities.
    """
    import yfinance as yf

    INDICES = {
        "S&P 500":   "^GSPC",
        "NASDAQ":    "^IXIC",
        "FTSE 100":  "^FTSE",
        "DAX":       "^GDAXI",
        "Nikkei":    "^N225",
        "Tadawul":   "^TASI.SR",
        "DJIMI":     "^DJIMI",
    }

    FOREX = {
        "USD/EUR":   "EURUSD=X",
        "USD/GBP":   "GBPUSD=X",
        "USD/SAR":   "USSAR=X",
        "USD/MYR":   "MYRX=X",
        "USD/AED":   "AEDX=X",
    }

    COMMODITIES = {
        "Gold":      "GC=F",
        "Silver":    "SI=F",
        "Oil (WTI)": "CL=F",
        "Gas":       "NG=F",
    }

    def fetch_quote(symbol):
        try:
            t = yf.Ticker(symbol)
            info = t.fast_info
            price = info.last_price
            prev  = info.previous_close
            change_pct = ((price - prev) / prev * 100) if prev else 0
            return {
                "price":      round(price, 4) if price else None,
                "change_pct": round(change_pct, 2) if change_pct else None,
            }
        except Exception:
            return {"price": None, "change_pct": None}

    result = {
        "indices":    {},
        "forex":      {},
        "commodities":{},
    }

    import concurrent.futures

    def fetch_all(items_dict):
        results = {}
        def fetch_one(item):
            name, symbol = item
            return name, fetch_quote(symbol)
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(fetch_one, item): item for item in items_dict.items()}
            for future in concurrent.futures.as_completed(futures):
                name, data = future.result()
                results[name] = data
        return results

    result["indices"]     = fetch_all(INDICES)
    result["forex"]       = fetch_all(FOREX)
    result["commodities"] = fetch_all(COMMODITIES)

    return result