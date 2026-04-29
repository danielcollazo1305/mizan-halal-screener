"""
fair_value.py
Calcula o valor justo de uma ação usando média ponderada DCF + Graham,
com pesos ajustados por setor.

Compatível com todos os arquivos existentes — mantém os mesmos campos de saída
e adiciona: sector, dcf_weight, graham_weight, confidence.
"""

import math

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

DCF_DISCOUNT_RATE   = 0.10
DCF_TERMINAL_GROWTH = 0.025
DCF_YEARS           = 10
MARGIN_OF_SAFETY    = 0.25
AAA_BOND_YIELD      = 0.052   # ~5.2% — atualizar mensalmente se quiser

# ---------------------------------------------------------------------------
# Pesos por setor (dcf_weight, graham_weight) — soma = 1.0
# ---------------------------------------------------------------------------

SECTOR_WEIGHTS = {
    "Technology":              (0.75, 0.25),
    "Healthcare":              (0.65, 0.35),
    "Financials":              (0.40, 0.60),
    "Consumer Discretionary":  (0.55, 0.45),
    "Consumer Staples":        (0.45, 0.55),
    "Industrials":             (0.55, 0.45),
    "Energy":                  (0.60, 0.40),
    "Utilities":               (0.35, 0.65),
    "Real Estate":             (0.35, 0.65),
    "Materials":               (0.50, 0.50),
    "Communication Services":  (0.65, 0.35),
    "Unknown":                 (0.50, 0.50),
}

def get_sector_weights(sector: str) -> tuple[float, float]:
    return SECTOR_WEIGHTS.get(sector, SECTOR_WEIGHTS["Unknown"])

# ---------------------------------------------------------------------------
# Motor Graham — fórmula revisada com taxa de juros
# V = EPS × (8.5 + 2g) × (4.4 / Y)
# ---------------------------------------------------------------------------

def graham_fair_value(
    eps: float,
    book_value: float,                  # mantido por compatibilidade
    growth_rate: float = 0.08,
    aaa_yield: float = AAA_BOND_YIELD,
) -> float | None:
    if not eps or eps <= 0:
        return None
    if not aaa_yield or aaa_yield <= 0:
        return None

    g_pct = min(abs(growth_rate) * 100, 25.0)   # cap em 25%
    value = eps * (8.5 + 2 * g_pct) * (4.4 / (aaa_yield * 100))
    return round(value, 2) if value > 0 else None

# ---------------------------------------------------------------------------
# Motor DCF — dois estágios
# ---------------------------------------------------------------------------

def dcf_fair_value(
    free_cash_flow: float,
    shares_outstanding: float,
    revenue_growth: float = 0.0,
    earnings_growth: float = 0.0,
) -> float | None:
    if not free_cash_flow or not shares_outstanding:
        return None
    if free_cash_flow <= 0 or shares_outstanding <= 0:
        return None

    fcf_per_share = free_cash_flow / shares_outstanding

    growth = (
        (revenue_growth + earnings_growth) / 2
        if (revenue_growth and earnings_growth)
        else 0.08
    )
    growth = max(DCF_TERMINAL_GROWTH, min(0.35, growth))

    # Estágio 1: 10 anos descontados
    total_pv = 0.0
    fcf = fcf_per_share
    for year in range(1, DCF_YEARS + 1):
        fcf *= (1 + growth)
        total_pv += fcf / ((1 + DCF_DISCOUNT_RATE) ** year)

    # Estágio 2: valor terminal
    terminal_value = (fcf * (1 + DCF_TERMINAL_GROWTH)) / (DCF_DISCOUNT_RATE - DCF_TERMINAL_GROWTH)
    terminal_pv    = terminal_value / ((1 + DCF_DISCOUNT_RATE) ** DCF_YEARS)

    result = round(total_pv + terminal_pv, 2)
    return result if result > 0 else None

# ---------------------------------------------------------------------------
# Label de valoração — igual ao original
# ---------------------------------------------------------------------------

def _valuation_label(upside: float) -> str:
    if upside > 40:   return "STRONGLY UNDERVALUED"
    if upside > 20:   return "UNDERVALUED"
    if upside > 0:    return "FAIRLY VALUED"
    if upside > -20:  return "OVERVALUED"
    return "STRONGLY OVERVALUED"

# ---------------------------------------------------------------------------
# Função principal — compatível com o código existente
# ---------------------------------------------------------------------------

def calculate_fair_value(data: dict) -> dict:
    price              = data.get("price") or 0
    eps                = data.get("eps") or 0
    book_value         = data.get("book_value") or 0
    free_cash_flow     = data.get("free_cash_flow") or 0
    shares_outstanding = data.get("shares_outstanding") or 0
    revenue_growth     = data.get("revenue_growth") or 0
    earnings_growth    = data.get("earnings_growth") or 0
    sector             = data.get("sector") or "Unknown"

    # Crescimento médio para Graham
    growth_rate = (
        (revenue_growth + earnings_growth) / 2
        if (revenue_growth and earnings_growth)
        else 0.08
    )

    graham = graham_fair_value(eps, book_value, growth_rate)
    dcf    = dcf_fair_value(
        free_cash_flow, shares_outstanding,
        revenue_growth, earnings_growth,
    )

    # Pesos por setor
    dcf_w, graham_w = get_sector_weights(sector)

    # Blend ponderado
    fair_value = None
    methods_used = []
    if dcf and graham:
        fair_value   = round(dcf * dcf_w + graham * graham_w, 2)
        methods_used = ["dcf", "graham"]
    elif dcf:
        fair_value   = dcf
        methods_used = ["dcf"]
    elif graham:
        fair_value   = graham
        methods_used = ["graham"]

    # Confiança: alta se os dois métodos existem e diferença < 30%
    confidence = "low"
    if dcf and graham:
        divergence = abs(dcf - graham) / max(dcf, graham)
        confidence = "high" if divergence < 0.30 else "medium"
    elif dcf or graham:
        confidence = "medium"

    safe_value = round(fair_value * (1 - MARGIN_OF_SAFETY), 2) if fair_value else None

    upside = None
    if fair_value and price > 0:
        upside = round((fair_value - price) / price * 100, 1)

    return {
        # Campos originais — mantidos para compatibilidade
        "graham_value":   graham,
        "dcf_value":      dcf,
        "avg_fair_value": fair_value,    # agora ponderado, antes era média simples
        "safe_value":     safe_value,
        "upside_pct":     upside,
        "valuation":      _valuation_label(upside) if upside is not None else "N/A",
        "methods_used":   methods_used,
        # Campos novos — semana 19
        "fair_value":     fair_value,
        "sector":         sector,
        "dcf_weight":     dcf_w,
        "graham_weight":  graham_w,
        "confidence":     confidence,
    }