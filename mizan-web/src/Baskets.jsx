import { useState, useEffect } from "react"
import axios from "axios"

const API = "https://web-production-b5851.up.railway.app"

const C = {
  bg:     "#080f0b",
  card:   "#0C1F17",
  card2:  "#0a1a10",
  border: "rgba(255,255,255,0.06)",
  green:  "#0A7C5C",
  gold:   "#C9A84C",
  red:    "#ef4444",
  amber:  "#f59e0b",
  text:   "#f0f4f1",
  muted:  "#5a6a60",
  muted2: "#7a8a80",
}

const statusConfig = {
  HALAL:        { color: "#0A7C5C", bg: "rgba(10,124,92,0.15)",  label: "Halal" },
  QUESTIONABLE: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", label: "Questionable" },
  HARAM:        { color: "#ef4444", bg: "rgba(239,68,68,0.15)",  label: "Haram" },
}

const BASKETS = [
  {
    id: "conservative",
    name: "Conservative",
    subtitle: "Stability & Dividends",
    description: "Blue-chip halal stocks with strong fundamentals, low volatility and consistent dividends. Ideal for capital preservation.",
    color: "#0A7C5C",
    audience: "Risk-averse investors",
    tickers: ["JNJ", "PG", "KO", "PEP", "MCD", "WMT", "COST", "MMM", "ABT", "MRK"],
  },
  {
    id: "growth",
    name: "Growth",
    subtitle: "High-Growth Halal",
    description: "Fast-growing companies with strong revenue momentum, screened for halal compliance. Higher risk, higher reward.",
    color: "#C9A84C",
    audience: "Growth investors",
    tickers: ["NVDA", "MSFT", "GOOGL", "AMZN", "META", "AVGO", "AMD", "ADBE", "CRM", "NOW"],
  },
  {
    id: "dividend",
    name: "Dividend",
    subtitle: "Income Focused",
    description: "Halal stocks with above-average dividend yields, suitable for passive income generation and long-term wealth building.",
    color: "#f59e0b",
    audience: "Income investors",
    tickers: ["V", "MA", "ABBV", "CVX", "NEE", "TXN", "QCOM", "HON", "RTX", "UPS"],
  },
  {
    id: "emerging",
    name: "Emerging Markets",
    subtitle: "Global Halal",
    description: "Halal-compliant stocks from GCC and emerging markets. Diversify beyond the US with Shariah-screened companies.",
    color: "#0A7C5C",
    audience: "Global diversification",
    tickers: ["2222.SR", "4002.SR", "3030.SR", "2290.SR", "EMAAR.AE", "ALDAR.AE", "TAQA.AE", "AIR.PA", "SAP.DE", "AZN.L"],
  },
  {
    id: "tech",
    name: "Tech Halal",
    subtitle: "Pure Technology",
    description: "Technology leaders screened for halal compliance. Focused on semiconductors, software, and cloud infrastructure.",
    color: "#C9A84C",
    audience: "Tech investors",
    tickers: ["AAPL", "MSFT", "NVDA", "AMD", "QCOM", "TXN", "AMAT", "LRCX", "KLAC", "MRVL"],
  },
]

function BasketDetail({ basket, onClose }) {
  const [stocks, setStocks]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setStocks([])
    Promise.all(
      basket.tickers.map(ticker =>
        axios.get(`${API}/analyze?ticker=${ticker}`, { timeout: 30000 })
          .then(r => ({ ticker, ...r.data }))
          .catch(() => ({ ticker, status: null, price: null, grade: null, name: ticker }))
      )
    ).then(results => {
      setStocks(results)
      setLoading(false)
    })
  }, [basket.id])

  const halalCount = stocks.filter(s => s.status === "HALAL").length
  const avgUpside  = stocks.length > 0
    ? stocks.filter(s => s.fair_value?.upside_pct != null).reduce((acc, s, _, arr) => acc + s.fair_value.upside_pct / arr.length, 0)
    : 0

  return (
    <div style={{ background: C.card2, borderRadius: 12, padding: 24, marginTop: 2, borderTop: `2px solid ${basket.color}` }}>
      {loading ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: C.muted }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>Analysing {basket.tickers.length} stocks...</div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
            {basket.tickers.map(t => (
              <span key={t} style={{ fontSize: 11, color: C.muted2, background: C.card, padding: "3px 8px", borderRadius: 4 }}>{t}</span>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Total",      value: basket.tickers.length, color: C.text },
              { label: "Halal",      value: halalCount,            color: C.green },
              { label: "Halal Rate", value: `${Math.round((halalCount / stocks.length) * 100)}%`, color: C.green },
              { label: "Avg Upside", value: `${avgUpside > 0 ? "+" : ""}${avgUpside.toFixed(1)}%`, color: avgUpside > 0 ? C.green : C.red },
            ].map(item => (
              <div key={item.label} style={{ flex: 1, background: C.card, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "4px 14px", marginBottom: 6 }}>
            {["Stock", "Price", "Status", "Grade", "Upside"].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: h === "Stock" ? "left" : "right" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stocks.map((s, i) => {
              const sc     = statusConfig[s.status] || null
              const upside = s.fair_value?.upside_pct
              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8,
                  background: C.card, borderRadius: 8, padding: "10px 14px",
                  borderLeft: `3px solid ${sc?.color || C.border}`,
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{s.ticker}</div>
                    <div style={{ fontSize: 11, color: C.muted2 }}>{s.name?.slice(0, 22) || "—"}</div>
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700, color: C.text, fontSize: 13, alignSelf: "center" }}>
                    {s.price ? `$${s.price.toFixed(2)}` : "—"}
                  </div>
                  <div style={{ textAlign: "right", alignSelf: "center" }}>
                    {sc && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: sc.bg, color: sc.color }}>{sc.label}</span>}
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700, color: C.green, fontSize: 13, alignSelf: "center" }}>
                    {s.grade || "—"}
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 600, fontSize: 13, alignSelf: "center", color: upside > 0 ? C.green : upside < 0 ? C.red : C.muted }}>
                    {upside != null ? `${upside > 0 ? "+" : ""}${upside.toFixed(1)}%` : "—"}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: C.muted }}>
            Halal classification based on sector, debt ratio and revenue screening. Not financial advice.
          </div>
        </>
      )}
    </div>
  )
}

export default function Baskets() {
  const [openId, setOpenId] = useState(null)

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6 }}>Halal Baskets</div>
        <div style={{ fontSize: 13, color: C.muted2 }}>Curated Shariah-compliant portfolios for every investor profile.</div>
        <div style={{ display: "inline-block", marginTop: 10, padding: "3px 12px", borderRadius: 20, background: "rgba(201,168,76,0.1)", border: "1px solid #C9A84C44", fontSize: 11, fontWeight: 700, color: C.gold }}>Premium Feature</div>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {BASKETS.map(b => {
          const isOpen = openId === b.id
          return (
            <div key={b.id}>
              {/* Row */}
              <div onClick={() => setOpenId(isOpen ? null : b.id)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: isOpen ? C.card : C.card2,
                borderRadius: isOpen ? "10px 10px 0 0" : 10,
                padding: "18px 22px",
                cursor: "pointer",
                border: `0.5px solid ${isOpen ? b.color : C.border}`,
                borderBottom: isOpen ? "none" : `0.5px solid ${C.border}`,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!isOpen) e.currentTarget.style.borderColor = b.color }}
              onMouseLeave={e => { if (!isOpen) e.currentTarget.style.borderColor = C.border }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1 }}>
                  <div style={{ width: 4, height: 40, borderRadius: 2, background: b.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: b.color, fontWeight: 600 }}>{b.subtitle}</div>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted2, marginTop: 3 }}>{b.description}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{b.tickers.length} stocks</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{b.audience}</div>
                  </div>
                  <div style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(201,168,76,0.1)", border: "1px solid #C9A84C44", fontSize: 10, fontWeight: 700, color: C.gold }}>PREMIUM</div>
                  <div style={{ color: C.muted2, fontSize: 18, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</div>
                </div>
              </div>

              {/* Detail */}
              {isOpen && <BasketDetail basket={b} onClose={() => setOpenId(null)} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
