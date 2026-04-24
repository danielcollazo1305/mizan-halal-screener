import { useState } from "react"
import axios from "axios"
import Portfolio from "./Portfolio"
import Ranking from "./Ranking"
import Recommendations from "./Recommendations"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const API = "https://web-production-b5851.up.railway.app"

function Screener() {
  const [ticker, setTicker] = useState("")
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [period, setPeriod] = useState("1y")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const analyze = async (t = ticker, p = period) => {
    if (!t) return
    setLoading(true)
    setError("")
    setResult(null)
    setHistory([])
    try {
      const [res, hist] = await Promise.all([
        axios.get(`${API}/analyze?ticker=${t.toUpperCase()}`),
        axios.get(`${API}/history?ticker=${t.toUpperCase()}&period=${p}`)
      ])
      setResult(res.data)
      setHistory(hist.data.history || [])
    } catch {
      setError("Stock not found. Check the ticker and try again.")
    } finally {
      setLoading(false)
    }
  }

  const changePeriod = async (p) => {
    setPeriod(p)
    if (result) {
      try {
        const hist = await axios.get(`${API}/history?ticker=${ticker.toUpperCase()}&period=${p}`)
        setHistory(hist.data.history || [])
      } catch {}
    }
  }

  const statusColor = { HALAL: "#22c55e", QUESTIONABLE: "#f59e0b", HARAM: "#ef4444" }
  const periods = ["1mo", "3mo", "6mo", "1y", "2y"]
  const chartColor = history.length > 1
    ? history[history.length - 1].close >= history[0].close ? "#22c55e" : "#ef4444"
    : "#22c55e"

  const fmt = (v, type = "pct") => {
    if (v == null) return "N/A"
    if (type === "pct") return `${(v * 100).toFixed(1)}%`
    if (type === "x") return `${v.toFixed(1)}x`
    if (type === "num") return v.toFixed(2)
    return v
  }

  const fundamentals = result ? [
    { label: "ROE", value: fmt(result.roe), hint: "Return on Equity" },
    { label: "Profit Margin", value: fmt(result.profit_margin), hint: "Net profit margin" },
    { label: "P/E Ratio", value: result.pe_ratio ? result.pe_ratio.toFixed(1) : "N/A", hint: "Price / Earnings" },
    { label: "P/B Ratio", value: result.pb_ratio ? result.pb_ratio.toFixed(1) : "N/A", hint: "Price / Book Value" },
    { label: "Revenue Growth", value: fmt(result.revenue_growth), hint: "YoY revenue growth" },
    { label: "Earnings Growth", value: fmt(result.earnings_growth), hint: "YoY earnings growth" },
    { label: "Debt Ratio", value: result.debt_ratio ? `${(result.debt_ratio * 100).toFixed(1)}%` : "N/A", hint: "Debt / Market Cap" },
    { label: "Dividend Yield", value: fmt(result.dividend_yield), hint: "Annual dividend yield" },
  ] : []

  return (
    <div style={{ maxWidth: 750, margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        <input
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          onKeyDown={e => e.key === "Enter" && analyze()}
          placeholder="Enter ticker (e.g. AAPL, MSFT, NVDA)"
          style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 16 }}
        />
        <button onClick={() => analyze()} style={{ padding: "12px 24px", borderRadius: 8, background: "#22c55e", color: "#fff", border: "none", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
          {loading ? "..." : "Analyze"}
        </button>
      </div>

      {error && <p style={{ color: "#ef4444", textAlign: "center" }}>{error}</p>}

      {result && (
        <div>
          {/* Header */}
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>{result.name}</h2>
                <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>{result.sector} · {result.country}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>${result.price?.toFixed(2)}</div>
                <div style={{ color: statusColor[result.status], fontWeight: 700, fontSize: 18 }}>{result.status}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              {[
                { label: "Grade", value: result.grade, color: "#22c55e" },
                { label: "Investment Score", value: result.investment_score },
                { label: "Potential Upside (fair value)", value: `${result.fair_value?.upside_pct > 0 ? "+" : ""}${result.fair_value?.upside_pct?.toFixed(1)}%`, color: result.fair_value?.upside_pct > 0 ? "#22c55e" : "#ef4444" },
              ].map(item => (
                <div key={item.label} style={{ flex: 1, background: "#0f172a", borderRadius: 8, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: item.color || "#f1f5f9" }}>{item.value}</div>
                  <div style={{ color: "#94a3b8", fontSize: 11 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <p style={{ color: "#475569", fontSize: 12, textAlign: "center", margin: "8px 0 0" }}>
              ⚠️ Potential upside is based on Graham & DCF fair value models. Not financial advice.
            </p>
          </div>

          {/* Price History */}
          {history.length > 0 && (
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>Price History</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {periods.map(p => (
                    <button key={p} onClick={() => changePeriod(p)} style={{
                      padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                      background: period === p ? chartColor : "#0f172a",
                      color: period === p ? "#fff" : "#94a3b8",
                    }}>{p}</button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={["auto", "auto"]} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#94a3b8" }} formatter={v => [`$${v.toFixed(2)}`, "Price"]} />
                  <Area type="monotone" dataKey="close" stroke={chartColor} fill="url(#colorPrice)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Fundamentals */}
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 16 }}>📊 Key Fundamentals</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {fundamentals.map(item => (
                <div key={item.label} style={{ background: "#0f172a", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{item.hint}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Fair Value */}
          {result.fair_value && (
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Fair Value</div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                <span>Graham: <b style={{ color: "#f1f5f9" }}>${result.fair_value.graham_value?.toFixed(2) ?? "N/A"}</b></span>
                <span>DCF: <b style={{ color: "#f1f5f9" }}>${result.fair_value.dcf_value?.toFixed(2) ?? "N/A"}</b></span>
                <span>Valuation: <b style={{ color: "#f1f5f9" }}>{result.fair_value.valuation}</b></span>
              </div>
            </div>
          )}

          {/* Halal Status */}
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Halal Status</div>
            <p style={{ margin: 0, color: "#94a3b8" }}>{result.reason}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState("screener")

  const navStyle = (p) => ({
    padding: "8px 20px", borderRadius: 8, border: "none",
    background: page === p ? "#22c55e" : "transparent",
    color: page === p ? "#fff" : "#94a3b8",
    fontWeight: 600, cursor: "pointer", fontSize: 15,
  })

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "sans-serif" }}>
      <div style={{ borderBottom: "1px solid #1e293b", padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>🕌 Mizan</span>
          <span style={{ color: "#94a3b8", marginLeft: 8, fontSize: 14 }}>Halal Stock Screener</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={navStyle("screener")} onClick={() => setPage("screener")}>Screener</button>
          <button style={navStyle("ranking")} onClick={() => setPage("ranking")}>Ranking</button>
          <button style={navStyle("picks")} onClick={() => setPage("picks")}>⭐ Monthly Picks</button>
          <button style={navStyle("portfolio")} onClick={() => setPage("portfolio")}>Portfolio</button>
        </div>
      </div>

      {page === "screener"  && <Screener />}
      {page === "ranking"   && <Ranking />}
      {page === "picks"     && <Recommendations />}
      {page === "portfolio" && <Portfolio />}

      <div style={{ textAlign: "center", padding: "20px 40px", color: "#475569", fontSize: 12, borderTop: "1px solid #1e293b", marginTop: 40 }}>
        📊 Mizan provides data-driven analysis for informational purposes only. This is not financial advice.
        Always do your own research before making investment decisions.
      </div>
    </div>
  )
}