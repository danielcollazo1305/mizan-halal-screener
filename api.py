"""
api.py
------
Mizan Halal Screener — REST API built with FastAPI.
"""

import time
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.market_data import get_stock_data, get_price_history
from app.halal_filter import classify_company
from app.fair_value import calculate_fair_value
from app.scorer import score_company
from app.database import get_db, Portfolio, Watchlist, PortfolioSnapshot, User, create_tables, ComplianceSnapshot, ComplianceAlert, PriceAlert
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