import { useState } from "react"
import axios from "axios"

const API = "https://web-production-b5851.up.railway.app"

const gradeColor = (grade) => {
  if (grade === "A+") return "#22c55e"
  if (grade === "A")  return "#4ade80"
  if (grade === "B+") return "#86efac"
  if (grade === "B")  return "#93c5fd"
  if (grade === "C")  return "#fbbf24"
  if (grade === "D")  return "#f97316"
  return "#ef4444"
}

const fmtB = (v) => {
  if (v == null) return "N/A"
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return `$${v.toFixed(2)}`
}

const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : "N/A"

const statusColor = { HALAL: "#22c55e", QUESTIONABLE: "#f59e0b", HARAM: "#ef4444" }

export default function Compare() {
  const [inputs, setInputs] = useState(["", "", ""])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const compare = async () => {
    const tickers = inputs.map(t => t.trim().toUpperCase()).filter(Boolean)
    if (tickers.length < 2) {
      setError("Enter at least 2 tickers to compare.")
      return
    }
    setLoading(true)
    setError("")
    setResults([])
    try {
      const responses = await Promise.all(
        tickers.map(t => axios.get(`${API}/analyze?ticker=${t}`).catch(() => null))
      )
      const data = responses.map((r, i) => r?.data ? { ...r.data, ticker: tickers[i] } : null).filter(Boolean)
      if (data.length === 0) {
        setError("No data found. Check the tickers and try again.")
      } else {
        setResults(data)
      }
    } catch {
      setError("Error fetching data. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const metrics = [
    { label: "Price",           fn: c => c.price ? `$${c.price.toFixed(2)}` : "N/A" },
    { label: "Status",          fn: c => c.status },
    { label: "Grade",           fn: c => c.grade },
    { label: "Investment Score",fn: c => c.investment_score },
    { label: "Market Cap",      fn: c => fmtB(c.market_cap) },
    { label: "P/E Ratio",       fn: c => c.pe_ratio?.toFixed(1) ?? "N/A" },
    { label: "P/B Ratio",       fn: c => c.pb_ratio?.toFixed(1) ?? "N/A" },
    { label: "ROE",             fn: c => fmtPct(c.roe) },
    { label: "Profit Margin",   fn: c => fmtPct(c.profit_margin) },
    { label: "Revenue Growth",  fn: c => fmtPct(c.revenue_growth) },
    { label: "Earnings Growth", fn: c => fmtPct(c.earnings_growth) },
    { label: "Debt Ratio",      fn: c => c.debt_ratio ? `${(c.debt_ratio * 100).toFixed(1)}%` : "N/A" },
    { label: "Dividend Yield",  fn: c => fmtPct(c.dividend_yield) },
    { label: "EPS",             fn: c => c.eps ? `$${c.eps.toFixed(2)}` : "N/A" },
    { label: "Potential Upside",fn: c => c.fair_value?.upside_pct != null ? `${c.fair_value.upside_pct > 0 ? "+" : ""}${c.fair_value.upside_pct.toFixed(1)}%` : "N/A" },
    { label: "Fair Value",      fn: c => c.fair_value?.avg_fair_value ? `$${c.fair_value.avg_fair_value.toFixed(2)}` : "N/A" },
    { label: "Valuation",       fn: c => c.fair_value?.valuation ?? "N/A" },
  ]

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px", color: "#f1f5f9", fontFamily: "sans-serif" }}>

      <h2 style={{ color: "#22c55e", marginBottom: 8 }}>⚖️ Stock Comparator</h2>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 14 }}>
        Compare up to 3 halal stocks side by side
      </p>

      {/* Inputs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {inputs.map((val, i) => (
          <input
            key={i}
            value={val}
            onChange={e => {
              const next = [...inputs]
              next[i] = e.target.value
              setInputs(next)
            }}
            onKeyDown={e => e.key === "Enter" && compare()}
            placeholder={`Ticker ${i + 1} (e.g. ${["AAPL", "MSFT", "NVDA"][i]})`}
            style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 15 }}
          />
        ))}
        <button
          onClick={compare}
          style={{ padding: "12px 24px", borderRadius: 8, background: "#22c55e", color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
        >
          {loading ? "..." : "Compare"}
        </button>
      </div>

      {error && <p style={{ color: "#ef4444", textAlign: "center" }}>{error}</p>}

      {/* Results table */}
      {results.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: 13, borderBottom: "1px solid #334155", minWidth: 160 }}>
                  Metric
                </th>
                {results.map(c => (
                  <th key={c.ticker} style={{ padding: "12px 16px", textAlign: "center", borderBottom: "1px solid #334155", minWidth: 160 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{c.ticker}</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 400 }}>{c.name?.split(" ").slice(0, 2).join(" ")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, mi) => (
                <tr key={metric.label} style={{ background: mi % 2 === 0 ? "#0f172a" : "#1e293b" }}>
                  <td style={{ padding: "10px 16px", color: "#64748b", fontSize: 13, fontWeight: 600 }}>
                    {metric.label}
                  </td>
                  {results.map(c => {
                    const value = metric.fn(c)
                    const isStatus = metric.label === "Status"
                    const isGrade  = metric.label === "Grade"
                    const isUpside = metric.label === "Potential Upside"
                    const color = isStatus ? statusColor[value] || "#f1f5f9"
                      : isGrade ? gradeColor(value)
                      : isUpside && value !== "N/A" ? (value.startsWith("+") ? "#22c55e" : "#ef4444")
                      : "#f1f5f9"
                    return (
                      <td key={c.ticker} style={{ padding: "10px 16px", textAlign: "center", fontSize: 14, fontWeight: 600, color }}>
                        {value}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginTop: 24 }}>
        ⚠️ Data from Yahoo Finance. Not financial advice. Do your own research.
      </p>
    </div>
  )
}