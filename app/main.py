"""
main.py
-------
Mizan Halal Screener — CLI entry point.

Usage:
  python main.py                        # all tickers
  python main.py --market usa           # US only
  python main.py --halal                # HALAL only
  python main.py --top 10               # top 10 by investment score
  python main.py --ticker AAPL MSFT     # specific tickers
  python main.py --output report.txt    # custom output file
"""

import argparse
import logging
import sys
from colorama import Fore, Style, init
 
from app.market_data import get_stock_data
from app.halal_filter import classify_company

init(autoreset=True)
logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")

# ── Ticker lists ──────────────────────────────────────────────────────────────

TICKERS_USA: list[str] = [
    "AAPL", "MSFT", "AMZN", "NVDA", "GOOGL", "META", "TSLA", "AVGO",
    "BRK-B", "JPM", "JNJ", "WMT", "UNH", "V", "MA", "PG", "HD",
    "XOM", "LLY", "MRK", "CVX", "ABBV", "PEP", "KO", "COST", "MCD",
    "NKE", "SBUX", "DIS", "NFLX", "ADBE", "CRM", "ORCL", "CSCO",
    "INTC", "AMD", "QCOM", "TXN", "IBM", "AMAT", "LRCX", "MU", "NOW",
    "SHOP", "UBER", "ABNB", "BKNG", "PYPL", "INTU", "SNOW", "ZM",
    "AMGN", "GE", "CAT", "DE", "HON", "RTX", "LMT", "ETN", "PH",
    "MMM", "UNP",
]

TICKERS_BRAZIL: list[str] = [
    "PETR4.SA", "VALE3.SA", "ITUB4.SA", "BBDC4.SA", "ABEV3.SA",
    "WEGE3.SA", "RENT3.SA", "TOTS3.SA", "PRIO3.SA", "RDOR3.SA",
]

TICKERS_GLOBAL: list[str] = [
    "PDD", "MELI", "JD", "BABA", "TCEHY", "SONY",
    "SAP", "ASML", "TSM", "NVO", "AZN", "GSK", "BMY",
]

ALL_TICKERS = TICKERS_USA + TICKERS_BRAZIL + TICKERS_GLOBAL

STATUS_ORDER  = ["HALAL", "QUESTIONABLE", "HARAM"]
STATUS_COLORS = {
    "HALAL":        Fore.GREEN,
    "QUESTIONABLE": Fore.YELLOW,
    "HARAM":        Fore.RED,
}


# ── Scoring ───────────────────────────────────────────────────────────────────

def calculate_score(data: dict, status: str) -> float:
    """
    Scores a company 0–100. HARAM always scores 0.

    Weights:
      ROE            20%
      Profit margin  20%
      P/E ratio      15%
      Revenue growth 15%
      Earnings growth 10%
      P/B ratio      10%
      Debt ratio     10%
    """
    if status == "HARAM":
        return 0.0

    market_cap = data.get("market_cap") or 0
    debt       = data.get("debt") or 0
    debt_ratio = debt / market_cap if market_cap else 0

    def _pct(key: str) -> float:
        return max(0.0, (data.get(key) or 0) * 100)

    def _cap(val: float, ceiling: float) -> float:
        return min(ceiling, max(0.0, val))

    roe_score     = _cap(_pct("roe"),             20.0)
    margin_score  = _cap(_pct("profit_margin"),   20.0)
    growth_score  = _cap(_pct("revenue_growth"),  15.0)
    eargrow_score = _cap(_pct("earnings_growth"), 10.0)

    pe = data.get("pe_ratio") or 0
    pe_score = (
        15.0 if 0 < pe <= 10 else
        12.0 if pe <= 20 else
        8.0  if pe <= 30 else
        4.0  if pe <= 50 else 0.0
    )

    pb = data.get("pb_ratio") or 0
    pb_score = (
        10.0 if 0 < pb <= 1 else
        8.0  if pb <= 2 else
        5.0  if pb <= 3 else
        2.0  if pb <= 5 else 0.0
    )

    debt_score = (
        10.0 if debt_ratio <= 0.10 else
        7.0  if debt_ratio <= 0.20 else
        4.0  if debt_ratio <= 0.33 else
        1.0  if debt_ratio <= 0.50 else 0.0
    )

    raw = (
        roe_score + margin_score + growth_score
        + eargrow_score + pe_score + pb_score + debt_score
    )

    if status == "QUESTIONABLE":
        raw *= 0.85     # 15% penalty

    return round(max(0.0, min(100.0, raw)), 2)


# ── Formatting ────────────────────────────────────────────────────────────────

def _fmt_currency(value: float | None, currency: str = "USD") -> str:
    if not value or value <= 0:
        return "N/A"
    symbol = "R$" if currency == "BRL" else "$"
    if value >= 1e12: return f"{symbol}{value / 1e12:.2f}T"
    if value >= 1e9:  return f"{symbol}{value / 1e9:.2f}B"
    if value >= 1e6:  return f"{symbol}{value / 1e6:.2f}M"
    return f"{symbol}{value:,.2f}"


def _fmt_pct(value: float | None) -> str:
    return f"{value * 100:.1f}%" if value is not None else "N/A"


def _fmt_upside(upside: float | None) -> str:
    if upside is None:
        return "N/A"
    sign = "+" if upside > 0 else ""
    return f"{sign}{upside:.1f}%"


def format_company_block(i: int, c: dict) -> str:
    currency = c.get("currency", "USD")
    color    = STATUS_COLORS.get(c["status"], "")
    return (
        f"{i:>2}. {c['name']} ({c['ticker']})\n"
        f"    Sector    : {str(c.get('sector', '')).title()}\n"
        f"    Industry  : {str(c.get('industry', '')).title()}\n"
        f"    Price     : {_fmt_currency(c.get('price'), currency)}\n"
        f"    Market Cap: {_fmt_currency(c.get('market_cap'), currency)}\n"
        f"    Debt      : {_fmt_currency(c.get('debt'), currency)}\n"
        f"    Margin    : {_fmt_pct(c.get('profit_margin'))}\n"
        f"    ROE       : {_fmt_pct(c.get('roe'))}\n"
        f"    P/E       : {c.get('pe_ratio') or 'N/A'}\n"
        f"    Status    : {color}{c['status']}{Style.RESET_ALL}\n"
        f"    Score     : {c['score']}/100\n"
    )


# ── Analysis ──────────────────────────────────────────────────────────────────

def build_company_result(ticker: str) -> dict | None:
    """Fetches, classifies, and scores a ticker. Returns None on failure."""
    try:
        data = get_stock_data(ticker)
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

        return {**data, "status": status, "score": calculate_score(data, status)}

    except Exception as exc:
        logging.error("[%s] %s", ticker, exc)
        return None


def group_and_sort(results: list[dict]) -> dict[str, list[dict]]:
    grouped = {s: [] for s in STATUS_ORDER}
    for c in results:
        grouped.get(c["status"], grouped["HARAM"]).append(c)
    for g in grouped.values():
        g.sort(key=lambda x: x["score"], reverse=True)
    return grouped


# ── Reports ───────────────────────────────────────────────────────────────────

def print_report(grouped: dict, top_n: int = 0) -> None:
    print(f"\n{Fore.CYAN}{'=' * 55}")
    print(f"  MIZAN HALAL SCREENER — RESULTS")
    print(f"{'=' * 55}{Style.RESET_ALL}")

    for status in STATUS_ORDER:
        companies = grouped[status]
        color = STATUS_COLORS[status]
        print(f"\n{color}{status} ({len(companies)}){Style.RESET_ALL}")
        print("-" * 55)
        for i, c in enumerate(companies, start=1):
            print(format_company_block(i, c))

    total = sum(len(v) for v in grouped.values())
    print(f"{Fore.CYAN}SUMMARY{Style.RESET_ALL}")
    print("-" * 55)
    print(f"  Total         : {total}")
    for status in STATUS_ORDER:
        color = STATUS_COLORS[status]
        print(f"  {color}{status:<14}{Style.RESET_ALL}: {len(grouped[status])}")

    if top_n and grouped["HALAL"]:
        top = grouped["HALAL"][:top_n]
        print(f"\n{Fore.GREEN}{'=' * 55}")
        print(f"  🏆 TOP {top_n} HALAL STOCKS TO INVEST")
        print(f"{'=' * 55}{Style.RESET_ALL}")
        for i, c in enumerate(top, 1):
            print(
                f"  {i:>2}. {c['ticker']:<8} {c['name']:<30} "
                f"Score: {c['score']}/100"
            )


def write_report(
    grouped: dict,
    filepath: str = "ranking_halal.txt",
    top_n: int = 10,
) -> None:
    total = sum(len(v) for v in grouped.values())
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("MIZAN HALAL SCREENER — RESULTS\n")
        f.write("=" * 55 + "\n\n")
        for status in STATUS_ORDER:
            companies = grouped[status]
            f.write(f"{status} ({len(companies)})\n")
            f.write("-" * 55 + "\n")
            for i, c in enumerate(companies, start=1):
                f.write(format_company_block(i, c) + "\n")
        f.write("SUMMARY\n")
        f.write("-" * 55 + "\n")
        f.write(f"Total: {total}\n")
        for status in STATUS_ORDER:
            f.write(f"  {status}: {len(grouped[status])}\n")

        if grouped["HALAL"]:
            f.write(f"\nTOP {top_n} HALAL STOCKS TO INVEST\n")
            f.write("=" * 55 + "\n")
            for i, c in enumerate(grouped["HALAL"][:top_n], 1):
                f.write(f"  {i:>2}. {c['ticker']:<8} Score: {c['score']}/100\n")

    print(f"\n{Fore.GREEN}✅ Report saved to '{filepath}'{Style.RESET_ALL}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Mizan Halal Stock Screener")
    parser.add_argument("--market",
        choices=["usa", "brazil", "global", "all"], default="all",
        help="Filter by market (default: all)")
    parser.add_argument("--halal", action="store_true",
        help="Show HALAL companies only")
    parser.add_argument("--top", type=int, default=10,
        help="Show top N companies to invest (default: 10)")
    parser.add_argument("--ticker", nargs="+",
        help="Analyze specific tickers (e.g. --ticker AAPL MSFT)")
    parser.add_argument("--output", default="ranking_halal.txt",
        help="Output file path (default: ranking_halal.txt)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Select tickers
    if args.ticker:
        tickers = [t.upper() for t in args.ticker]
    else:
        tickers = {
            "usa":    TICKERS_USA,
            "brazil": TICKERS_BRAZIL,
            "global": TICKERS_GLOBAL,
            "all":    ALL_TICKERS,
        }[args.market]

    print(f"\n{Fore.CYAN}Analyzing {len(tickers)} tickers...{Style.RESET_ALL}")
    print("(Fetching live data — this may take a few minutes)\n")

    results = []
    for i, ticker in enumerate(tickers, 1):
        print(f"  [{i:>3}/{len(tickers)}] {ticker:<12}", end="", flush=True)
        result = build_company_result(ticker)
        if result:
            color = STATUS_COLORS.get(result["status"], "")
            print(f"{color}{result['status']:<14}{Style.RESET_ALL}Score: {result['score']}/100")
            results.append(result)
        else:
            print(f"{Fore.RED}FAILED{Style.RESET_ALL}")

    if not results:
        print(f"\n{Fore.RED}No data retrieved. Check your connection.{Style.RESET_ALL}")
        sys.exit(1)

    grouped = group_and_sort(results)

    if args.halal:
        grouped = {"HALAL": grouped["HALAL"], "QUESTIONABLE": [], "HARAM": []}

    print_report(grouped, top_n=args.top)
    write_report(grouped, filepath=args.output, top_n=args.top)


if __name__ == "__main__":
    main()