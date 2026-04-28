"""
price_alerts.py
---------------
API routes for price alerts with email notifications.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database import get_db, PriceAlert, User
from app.market_data import get_stock_data
from app.email_service import send_price_alert_email

router = APIRouter(prefix="/alerts", tags=["alerts"])

# ── Schemas ───────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    ticker: str
    name: Optional[str] = ""
    target_price: float
    condition: str = "below"  # "below" ou "above"

class AlertResponse(BaseModel):
    id: int
    ticker: str
    name: Optional[str]
    target_price: float
    condition: str
    is_active: bool
    triggered_at: Optional[datetime]
    created_at: datetime

# ── Auth helper ───────────────────────────────────────────────────────────────

def get_current_user(token: str, db: Session) -> User:
    from app.auth import decode_token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/")
def create_alert(
    alert: AlertCreate,
    token: str,
    db: Session = Depends(get_db),
):
    user = get_current_user(token, db)

    new_alert = PriceAlert(
        user_id=user.id,
        ticker=alert.ticker.upper(),
        name=alert.name or alert.ticker.upper(),
        target_price=alert.target_price,
        condition=alert.condition,
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return {"message": "Alert created", "alert_id": new_alert.id}


@router.get("/")
def get_alerts(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    alerts = db.query(PriceAlert).filter(
        PriceAlert.user_id == user.id,
        PriceAlert.is_active == True,
    ).all()
    return alerts


@router.delete("/{alert_id}")
def delete_alert(alert_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    alert = db.query(PriceAlert).filter(
        PriceAlert.id == alert_id,
        PriceAlert.user_id == user.id,
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted"}


@router.post("/check")
def check_and_trigger_alerts(db: Session = Depends(get_db)):
    """
    Checks all active alerts and sends emails for triggered ones.
    Call this endpoint via a cron job (e.g. Railway cron or external scheduler).
    """
    active_alerts = db.query(PriceAlert).filter(PriceAlert.is_active == True).all()
    triggered = []

    for alert in active_alerts:
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
                        to_email=user.email,
                        user_name=user.name,
                        ticker=alert.ticker,
                        stock_name=alert.name or alert.ticker,
                        current_price=current_price,
                        target_price=alert.target_price,
                        condition=alert.condition,
                    )
                alert.is_active = False
                alert.triggered_at = datetime.utcnow()
                db.commit()
                triggered.append(alert.ticker)
        except Exception as e:
            continue

    return {"checked": len(active_alerts), "triggered": triggered}