import { useState } from "react"
import axios from "axios"
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts"

const API = "https://web-production-b5851.up.railway.app"

const C = {
  bg:     "#0a0f1e",
  card:   "#111827",
  card2:  "#1a2235",
  border: "#1f2d45",
  green:  "#10b981",
  red:    "#ef4444",
  amber:  "#f59e0b",
  blue:   "#3b82f6",
  purple: "#8b5cf6",
  text:   "#f1f5f9",
  muted:  "#64748b",
  muted2: "#94a3b8",
}

const TICKER_COLORS = ["#10b981", "#3b82f6", "#f59e0b"]

const fmtB = (v) => {
  if (v == null) return "N/A"
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return `$${v.toFixed(2)}`
}

const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : "N/A"

const statusColor = { HALAL: C.green, QUESTIONABLE: C.amber, HARAM: C.red }

const gradeColor = (g) => {
  if (!g) return C.muted2
  if (g.startsWith("A")) return C.green
  if (g.startsWith("B")) return C.blue
  if (g.startsWith("C")) return C.amber
  return C.red
}

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, ...style }}>
    {children}
  </div>
)

export default function Compare() {
  const [inputs, setInputs]   = useState(["", "", ""])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  const compare = async () => {
    const tickers = inputs.map(t => t.trim().toUpperCase()).filter(Boolean)
    if (tickers.length < 2) { setError("Enter at least 2 tickers to compare."); return }
    setLoading(true)
    setError("")
    setResults([])
    try {
      const responses = await Promise.all(
        tickers.map(t => axios.get(`${API}/analyze?ticker=${t}`).catch(() => null))
      )
      const data = responses.map((r, i) => r?.data ? { ...r.data, ticker: tickers[i] } : null).filter(Boolean)
      if (data.length === 0) setError("No data found. Check the tickers.")
      else setResults(data)
    } catch {
      setError("Error fetching data. Try again.")
    } finally {
      setLoading(false)
    }
  }

  // Find best value for a metric (higher = better unless inverted)
  const getBest = (key, inverted = false) => {
    if (results.length < 2) return null
    const vals = results.map(c => {
      const v = key.split(".").reduce((o, k) => o?.[k], c)
      return typeof v === "number" ? v : null
    }).filter(v => v !== null)
    if (vals.length < 2) return null
    return inverted ? Math.min(...vals) : Math.max(...vals)
  }

  const getCellStyle = (value, best, inverted = false) => {
    if (best === null || value === null || typeof value !== "number") return {}
    const isBest = inverted ? value === Math.min(...results.map(c => {
      const k = typeof best === "number" ? best : null
      return k
    })) : value === best
    return isBest ? { color: C.green, fontWeight: 800 } : {}
  }

  const metrics = [
    { label: "💰 Price",           key: "price",                    fn: c => c.price ? `$${c.price.toFixed(2)}` : "N/A",           raw: c => c.price },
    { label: "🏷️ Status",          key: "status",                   fn: c => c.status,                                              special: "status" },
    { label: "🎓 Grade",           key: "grade",                    fn: c => c.grade,                                               special: "grade" },
    { label: "⭐ Inv. Score",      key: "investment_score",         fn: c => c.investment_score,                                    raw: c => c.investment_score, best: true },
    { label: "📊 Market Cap",      key: "market_cap",               fn: c => fmtB(c.market_cap),                                    raw: c => c.market_cap, best: true },
    { label: "📉 P/E Ratio",       key: "pe_ratio",                 fn: c => c.pe_ratio?.toFixed(1) ?? "N/A",                      raw: c => c.pe_ratio, inverted: true },
    { label: "📉 P/B Ratio",       key: "pb_ratio",                 fn: c => c.pb_ratio?.toFixed(1) ?? "N/A",                      raw: c => c.pb_ratio, inverted: true },
    { label: "📈 ROE",             key: "roe",                      fn: c => fmtPct(c.roe),                                         raw: c => c.roe, best: true },
    { label: "💵 Profit Margin",   key: "profit_margin",            fn: c => fmtPct(c.profit_margin),                               raw: c => c.profit_margin, best: true },
    { label: "🚀 Revenue Growth",  key: "revenue_growth",           fn: c => fmtPct(c.revenue_growth),                              raw: c => c.revenue_growth, best: true },
    { label: "📈 Earnings Growth", key: "earnings_growth",          fn: c => fmtPct(c.earnings_growth),                             raw: c => c.earnings_growth, best: true },
    { label: "🏦 Debt Ratio",      key: "debt_ratio",               fn: c => c.debt_ratio ? `${(c.debt_ratio*100).toFixed(1)}%` : "N/A", raw: c => c.debt_ratio, inverted: true },
    { label: "💸 Dividend Yield",  key: "dividend_yield",           fn: c => c.dividend_yield ? `${c.dividend_yield.toFixed(2)}%` : "N/A", raw: c => c.dividend_yield, best: true },
    { label: "💹 EPS",             key: "eps",                      fn: c => c.eps ? `$${c.eps.toFixed(2)}` : "N/A",               raw: c => c.eps, best: true },
    { label: "🎯 Upside",          key: "fair_value.upside_pct",    fn: c => c.fair_value?.upside_pct != null ? `${c.fair_value.upside_pct > 0 ? "+" : ""}${c.fair_value.upside_pct.toFixed(1)}%` : "N/A", raw: c => c.fair_value?.upside_pct, best: true, special: "upside" },
    { label: "💎 Fair Value",      key: "fair_value.avg_fair_value",fn: c => c.fair_value?.avg_fair_value ? `$${c.fair_value.avg_fair_value.toFixed(2)}` : "N/A" },
    { label: "📋 Valuation",       key: "fair_value.valuation",     fn: c => c.fair_value?.valuation ?? "N/A" },
  ]

  // Radar chart data
  const radarData = results.length > 0 ? [
    { metric: "Score",    ...Object.fromEntries(results.map(c => [c.ticker, c.investment_score || 0])) },
    { metric: "ROE",      ...Object.fromEntries(results.map(c => [c.ticker, Math.min((c.roe || 0) * 500, 100)])) },
    { metric: "Margin",   ...Object.fromEntries(results.map(c => [c.ticker, Math.min((c.profit_margin || 0) * 500, 100)])) },
    { metric: "Growth",   ...Object.fromEntries(results.map(c => [c.ticker, Math.min(((c.revenue_growth || 0) + 0.1) * 200, 100)])) },
    { metric: "Upside",   ...Object.fromEntries(results.map(c => [c.ticker, Math.min(Math.max((c.fair_value?.upside_pct || 0) + 50, 0), 100)])) },
    { metric: "Low Debt", ...Object.fromEntries(results.map(c => [c.ticker, Math.max(100 - (c.debt_ratio || 0) * 500, 0)])) },
  ] : []

  // Winner recommendation
  const winner = results.length >= 2
    ? results.reduce((best, c) => (c.investment_score || 0) > (best.investment_score || 0) ? c : best)
    : null

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px", color: C.text, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>⚖️ Stock Comparator</h2>
        <p style={{ color: C.muted2, fontSize: 14, margin: "6px 0 0" }}>Compare up to 3 halal stocks side by side</p>
      </div>

      {/* Inputs */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10 }}>
          {inputs.map((val, i) => (
            <input key={i} value={val}
              onChange={e => { const n = [...inputs]; n[i] = e.target.value; setInputs(n) }}
              onKeyDown={e => e.key === "Enter" && compare()}
              placeholder={`Ticker ${i + 1} (${["AAPL", "MSFT", "NVDA"][i]})`}
              style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 15, outline: "none" }}
            />
          ))}
          <button onClick={compare} style={{ padding: "12px 28px", borderRadius: 10, background: C.green, color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            {loading ? "..." : "Compare"}
          </button>
        </div>
        {error && <p style={{ color: C.red, margin: "12px 0 0", fontSize: 13 }}>{error}</p>}
      </Card>

      {results.length > 0 && (
        <>
          {/* Winner Banner */}
          {winner && (
            <div style={{ background: `linear-gradient(135deg, #064e3b, #065f46)`, borderRadius: 16, padding: "20px 24px", marginBottom: 20, border: `1px solid ${C.green}`, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 40 }}>🏆</div>
              <div>
                <div style={{ fontSize: 13, color: "#6ee7b7", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Best Investment Pick</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{winner.ticker} — {winner.name?.split(" ").slice(0, 3).join(" ")}</div>
                <div style={{ fontSize: 13, color: "#6ee7b7", marginTop: 4 }}>
                  Score {winner.investment_score} · Grade {winner.grade} · {winner.status} · Upside {winner.fair_value?.upside_pct != null ? `${winner.fair_value.upside_pct > 0 ? "+" : ""}${winner.fair_value.upside_pct.toFixed(1)}%` : "N/A"}
                </div>
              </div>
            </div>
          )}

          {/* Score Cards */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${results.length}, 1fr)`, gap: 14, marginBottom: 20 }}>
            {results.map((c, i) => (
              <Card key={c.ticker} style={{ textAlign: "center", border: winner?.ticker === c.ticker ? `2px solid ${C.green}` : `1px solid ${C.border}` }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: TICKER_COLORS[i], margin: "0 auto 12px" }} />
                <div style={{ fontSize: 28, fontWeight: 800 }}>{c.ticker}</div>
                <div style={{ fontSize: 13, color: C.muted2, marginBottom: 16 }}>{c.name?.split(" ").slice(0, 3).join(" ")}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: gradeColor(c.grade) }}>{c.grade}</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Grade</div>
                <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: c.status === "HALAL" ? "#064e3b" : c.status === "QUESTIONABLE" ? "#451a03" : "#450a0a", color: statusColor[c.status] || C.muted2 }}>
                  {c.status}
                </div>
                <div style={{ marginTop: 16, fontSize: 13, color: C.muted2 }}>
                  Score: <span style={{ fontWeight: 700, color: C.text }}>{c.investment_score}</span>
                </div>
                <div style={{ fontSize: 13, color: C.muted2 }}>
                  Price: <span style={{ fontWeight: 700, color: C.text }}>${c.price?.toFixed(2)}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Radar Chart */}
          {radarData.length > 0 && (
            <Card style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                Radar Comparison
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={C.border} />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: C.muted2, fontSize: 12 }} />
                  {results.map((c, i) => (
                    <Radar key={c.ticker} name={c.ticker} dataKey={c.ticker}
                      stroke={TICKER_COLORS[i]} fill={TICKER_COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                  ))}
                  <Tooltip contentStyle={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8 }}>
                {results.map((c, i) => (
                  <div key={c.ticker} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: TICKER_COLORS[i] }} />
                    <span style={{ fontSize: 13, color: C.muted2 }}>{c.ticker}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Comparison Table */}
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
              Full Comparison
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "10px 16px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, minWidth: 160 }}>Metric</th>
                    {results.map((c, i) => (
                      <th key={c.ticker} style={{ padding: "10px 16px", textAlign: "center", borderBottom: `1px solid ${C.border}`, minWidth: 140 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: TICKER_COLORS[i] }} />
                          <span style={{ fontSize: 15, fontWeight: 700 }}>{c.ticker}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric, mi) => {
                    const rawVals = results.map(c => metric.raw ? metric.raw(c) : null)
                    const numVals = rawVals.filter(v => v !== null && typeof v === "number")
                    const bestVal = numVals.length >= 2
                      ? (metric.inverted ? Math.min(...numVals) : Math.max(...numVals))
                      : null

                    return (
                      <tr key={metric.label} style={{ background: mi % 2 === 0 ? C.bg : C.card2 }}>
                        <td style={{ padding: "11px 16px", color: C.muted2, fontSize: 13, fontWeight: 500 }}>{metric.label}</td>
                        {results.map((c, i) => {
                          const display = metric.fn(c)
                          const rawVal  = metric.raw ? metric.raw(c) : null
                          const isBest  = bestVal !== null && rawVal === bestVal
                          const isWorst = bestVal !== null && numVals.length >= 2 && rawVal === (metric.inverted ? Math.max(...numVals) : Math.min(...numVals)) && rawVal !== bestVal

                          let color = C.text
                          if (metric.special === "status") color = statusColor[display] || C.muted2
                          else if (metric.special === "grade") color = gradeColor(display)
                          else if (metric.special === "upside") color = display.startsWith("+") ? C.green : display.startsWith("-") ? C.red : C.muted2
                          else if (isBest) color = C.green
                          else if (isWorst) color = C.red

                          return (
                            <td key={c.ticker} style={{ padding: "11px 16px", textAlign: "center", fontSize: 14, fontWeight: isBest ? 800 : 500, color }}>
                              {display}
                              {isBest && numVals.length >= 2 && <span style={{ fontSize: 10, marginLeft: 4 }}>✓</span>}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <p style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 24 }}>
        ⚠️ Data from Yahoo Finance. Not financial advice. Always do your own research.
      </p>
    </div>
  )
}
