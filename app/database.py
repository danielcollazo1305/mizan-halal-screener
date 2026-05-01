"""
database.py
-----------
Database configuration and models for Mizan Halal Screener.

Tables:
  - users          → registered users
  - portfolios     → user stock portfolios
  - watchlist      → user watchlist
  - analysis_cache → cached stock analysis results
"""

from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, Float,
    String, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

# ── Database setup ────────────────────────────────────────────────────────────
import os
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./mizan.db")

# Railway usa postgres://, SQLAlchemy precisa de postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Models ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"


    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String, unique=True, index=True, nullable=False)
    name       = Column(String, nullable=False)
    password   = Column(String, nullable=False)
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    portfolios = relationship("Portfolio", back_populates="user")
    watchlist  = relationship("Watchlist", back_populates="user")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker       = Column(String, nullable=False)
    name         = Column(String)
    shares       = Column(Float, nullable=False)
    buy_price    = Column(Float, nullable=False)
    buy_date     = Column(DateTime, default=datetime.utcnow)
    halal_status = Column(String)
    notes        = Column(Text)

    user = relationship("User", back_populates="portfolios")


class Watchlist(Base):
    __tablename__ = "watchlist"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker       = Column(String, nullable=False)
    name         = Column(String)
    target_price = Column(Float)
    halal_status = Column(String)
    added_at     = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="watchlist")


class AnalysisCache(Base):
    __tablename__ = "analysis_cache"

    id           = Column(Integer, primary_key=True, index=True)
    ticker       = Column(String, unique=True, index=True, nullable=False)
    halal_status = Column(String)
    score        = Column(Float)
    grade        = Column(String)
    fair_value   = Column(Float)
    upside_pct   = Column(Float)
    cached_at    = Column(DateTime, default=datetime.utcnow)
    data_json    = Column(Text)


class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    date           = Column(DateTime, default=datetime.utcnow, nullable=False)
    total_value    = Column(Float, nullable=False)
    total_invested = Column(Float, nullable=False)
    return_pct     = Column(Float, nullable=False)

# ── Helper functions ──────────────────────────────────────────────────────────

class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker       = Column(String, nullable=False)
    name         = Column(String)
    target_price = Column(Float, nullable=False)
    condition    = Column(String, default="below")
    is_active    = Column(Boolean, default=True)
    triggered_at = Column(DateTime, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="price_alerts")


class ComplianceSnapshot(Base):
    __tablename__ = "compliance_snapshots"

    id           = Column(Integer, primary_key=True, index=True)
    ticker       = Column(String, unique=True, index=True, nullable=False)
    company_name = Column(String)
    status       = Column(String, nullable=False)
    score        = Column(Float, nullable=True)
    checked_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ComplianceAlert(Base):
    __tablename__ = "compliance_alerts"

    id           = Column(Integer, primary_key=True, index=True)
    ticker       = Column(String, nullable=False, index=True)
    company_name = Column(String)
    prev_status  = Column(String, nullable=False)
    new_status   = Column(String, nullable=False)
    changed_at   = Column(DateTime, default=datetime.utcnow)
    notified     = Column(Boolean, default=False)


def get_db():
    """Dependency for FastAPI endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Creates all tables in the database."""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")


if __name__ == "__main__":
    create_tables()