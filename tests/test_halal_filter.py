"""
test_halal_filter.py
--------------------
Unit tests for the halal_filter.py module.
Run with: pytest tests/
"""

import pytest
from app.halal_filter import classify_company


# ── HARAM tests ───────────────────────────────────────────────────────────────

def test_banking_is_haram():
    result = classify_company(
        sector="Financial Services",
        debt_ratio=0.10,
        profit_margin=0.20,
    )
    assert result["status"] == "HARAM"
    assert "prohibited" in result["reason"].lower()


def test_gambling_is_haram():
    result = classify_company(
        sector="Consumer Cyclical",
        debt_ratio=0.10,
        profit_margin=0.20,
        industry="Casino",
    )
    assert result["status"] == "HARAM"


def test_excessive_debt_is_haram():
    result = classify_company(
        sector="Technology",
        debt_ratio=0.99,
        profit_margin=0.20,
    )
    assert result["status"] == "HARAM"
    assert "debt" in result["reason"].lower()


def test_alcohol_is_haram():
    result = classify_company(
        sector="Consumer Defensive",
        debt_ratio=0.10,
        profit_margin=0.15,
        industry="Beverages - Wineries & Distilleries",
    )
    assert result["status"] == "HARAM"


# ── QUESTIONABLE tests ────────────────────────────────────────────────────────

def test_moderate_debt_is_questionable():
    result = classify_company(
        sector="Technology",
        debt_ratio=0.40,
        profit_margin=0.20,
    )
    assert result["status"] == "QUESTIONABLE"


def test_restaurant_is_questionable():
    result = classify_company(
        sector="Consumer Cyclical",
        debt_ratio=0.10,
        profit_margin=0.15,
        industry="Restaurants",
    )
    assert result["status"] == "QUESTIONABLE"


def test_negative_margin_is_questionable():
    result = classify_company(
        sector="Technology",
        debt_ratio=0.10,
        profit_margin=-0.10,
    )
    assert result["status"] == "QUESTIONABLE"


# ── HALAL tests ───────────────────────────────────────────────────────────────

def test_nvidia_is_halal():
    result = classify_company(
        sector="Technology",
        debt_ratio=0.05,
        profit_margin=0.55,
        industry="Semiconductors",
    )
    assert result["status"] == "HALAL"


def test_apple_is_halal():
    result = classify_company(
        sector="Technology",
        debt_ratio=0.10,
        profit_margin=0.25,
        industry="Consumer Electronics",
    )
    assert result["status"] == "HALAL"


def test_zero_debt_is_halal():
    result = classify_company(
        sector="Healthcare",
        debt_ratio=0.0,
        profit_margin=0.30,
    )
    assert result["status"] == "HALAL"


# ── Purification tests ────────────────────────────────────────────────────────

def test_minor_haram_revenue_needs_purification():
    result = classify_company(
        sector="Technology",
        debt_ratio=0.05,
        profit_margin=0.25,
        haram_revenue_ratio=0.02,
    )
    assert result["status"] == "HALAL"
    assert result["purification"] is True


def test_excess_haram_revenue_is_haram():
    result = classify_company(
        sector="Technology",
        debt_ratio=0.05,
        profit_margin=0.25,
        haram_revenue_ratio=0.10,
    )
    assert result["status"] == "HARAM"