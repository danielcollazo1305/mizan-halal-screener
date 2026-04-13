"""
main.py
-------
Entry point for the Mizan Halal Screener.
Fetches real-time data, classifies companies, scores them,
and outputs a ranked report to the terminal and to ranking_halal.txt.
"""

import logging
from app.market_data import get_stock_data
from app.halal_filter import classify_company

logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")

# ── Configuration ─────────────────────────────────────────────────────────────

TICKERS: list[str] = [
    "AAPL", "MSFT", "TSLA", "KO", "JPM",
    "NVDA", "MCD", "XOM",
]

STATUS = {"HALAL": "HALAL", "QUESTIONABLE": "QUESTIONABLE", "HARAM": "HARAM"}
OUTPUT_FILE = "ranking_halal.txt"


# ── Scoring ───────────────────────────────────────────────────────────────────

def calculate_score(data: dict, status: str) -> float:
    """
    Scores a company from 0 to 100 based on:
      - Debt ratio        (40%)
      - Profit margin     (25%)
      - ROE               (20%)
      - Revenue growth    (15%)
    HARAM companies always score 0.
    """
    if status == STATUS["HARAM"]:
        return 0.0

    debt_ratio     = data.get("debt", 0) / data["market_cap"] if data.get("market_cap") else 0
    profit_margin  = max(0.0, (data.get("profit_margin")  or 0) * 100)
    roe            = max(0.0, (data.get("roe")            or 0) * 100)
    revenue_growth = max(0.0, (data.get("revenue_growth") or 0) * 100)

    debt_score   = max(0.0, 100.0 - (debt_ratio * 100))
    margin_score = min(100.0, profit_margin)
    roe_score    = min(100.0, roe)
    growth_score = min(100.0, revenue_growth)

    raw = (
        debt_score   * 0.40
        + margin_score * 0.25
        + roe_score    * 0.20
        + growth_score * 0.15
    )

    # QUESTIONABLE companies are penalised
    if status == STATUS["QUESTIONABLE"]:
        raw *= 0.80

    return round(max(0.0, min(100.0, raw)), 2)


# ── Formatting ────────────────────────────────────────────────────────────────

def _fmt_currency(value: float | None, currency: str = "USD") -> str:
    if not value:
        return "N/A"
    symbol = "R$" if currency == "BRL" else "$"
    if value >= 1_000_000_000_000:
        return f"{symbol}{value / 1_000_000_000_000:.2f}T"
    if value >= 1_000_000_000:
        return f"{symbol}{value / 1_000_000_000:.2f}B"
    if value >= 1_000_000:
        return f"{symbol}{value / 1_000_000:.2f}M"
    return f"{symbol}{value:,.2f}"


def _fmt_pct(value: float | None) -> str:
    return f"{value * 100:.1f}%" if value is not None else "N/A"


def _format_company(i: int, c: dict, detailed: bool = False) -> str:
    """Formats a company entry for terminal or file output."""
    currency = c.get("currency", "USD")
    line = (
        f"{i:>2}. {c['name']} ({c['ticker']})\n"
        f"    Sector     : {c['sector']}\n"
        f"    Price      : {_fmt_currency(c.get('price'), currency)}\n"
        f"    Market Cap : {_fmt_currency(c.get('market_cap'), currency)}\n"
        f"    Debt Ratio : {c['debt_ratio']:.1%}\n"
        f"    Margin     : {_fmt_pct(c.get('profit_margin'))}\n"
        f"    ROE        : {_fmt_pct(c.get('roe'))}\n"
        f"    Status     : {c['status']}\n"
        f"    Score      : {c['score']}/100\n"
    )
    if detailed:
        line += f"    Reason     : {c.get('reason', '')}\n"
    return line


# ── Analysis ──────────────────────────────────────────────────────────────────

def analyze_ticker(ticker: str) -> dict | None:
    """Fetches, classifies and scores a single ticker. Returns None on failure."""
    try:
        data = get_stock_data(ticker)
        if not data.get("available"):
            logging.warning("Skipping %s — no data available.", ticker)
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

        return {
            **data,
            "debt_ratio": debt_ratio,
            "status":     status,
            "score":      calculate_score(data, status),
        }

    except Exception as exc:
        logging.error("Failed to analyze %s: %s", ticker, exc)
        return None


def group_and_sort(results: list[dict]) -> dict[str, list[dict]]:
    """Groups results by status and sorts each group by score descending."""
    grouped = {s: [] for s in STATUS}
    for c in results:
        grouped.get(c["status"], grouped["HARAM"]).append(c)
    for group in grouped.values():
        group.sort(key=lambda x: x["score"], reverse=True)
    return grouped


# ── Output ────────────────────────────────────────────────────────────────────

def print_report(grouped: dict[str, list[dict]]) -> None:
    print("\n" + "=" * 50)
    print("  MIZAN HALAL SCREENER — RESULTS")
    print("=" * 50)
    for status, companies in grouped.items():
        print(f"\n{status} ({len(companies)})")
        print("-" * 50)
        for i, c in enumerate(companies, start=1):
            print(_format_company(i, c))

    total = sum(len(v) for v in grouped.values())
    print("=" * 50)
    print(f"  Total   : {total}")
    for status, companies in grouped.items():
        print(f"  {status:<14}: {len(companies)}")
    print("=" * 50)


def write_report(grouped: dict[str, list[dict]], filepath: str = OUTPUT_FILE) -> None:
    total = sum(len(v) for v in grouped.values())
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("MIZAN HALAL SCREENER\n")
        f.write("=" * 50 + "\n\n")
        for status, companies in grouped.items():
            f.write(f"{status} ({len(companies)})\n")
            f.write("-" * 50 + "\n")
            for i, c in enumerate(companies, start=1):
                f.write(_format_company(i, c, detailed=True) + "\n")
        f.write("SUMMARY\n")
        f.write("-" * 50 + "\n")
        f.write(f"Total   : {total}\n")
        for status, companies in grouped.items():
            f.write(f"{status:<14}: {len(companies)}\n")
    print(f"\n✅ Report saved to '{filepath}'")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    print("\nFetching data for", len(TICKERS), "companies...\n")

    results = [r for t in TICKERS if (r := analyze_ticker(t)) is not None]

    if not results:
        print("❌ No data retrieved. Check your internet connection.")
        return

    grouped = group_and_sort(results)
    print_report(grouped)
    write_report(grouped)


if __name__ == "__main__":
    main()