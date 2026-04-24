import { useState } from "react"
import axios from "axios"

const API = "https://web-production-b5851.up.railway.app"

function App() {
  const [ticker, setTicker] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const analyze = async () => {
    if (!ticker) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await axios.get(`${API}/analyze?ticker=${ticker.toUpperCase()}`)
      setResult(res.data)
    } catch {
      setError("Stock not found. Check the ticker and try again.")
    } finally {
      setLoading(false)
    }
  }

  const statusColor = {
    HALAL: "#22c55e",
    QUESTIONABLE: "#f59e0b",
    HARAM: "#ef4444",
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: "#22c55e", margin: 0 }}>🕌 Mizan</h1>
          <p style={{ color: "#94a3b8", marginTop: 8 }}>Halal Stock Screener</p>
        </div>

        {/* Search */}
        <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          <input
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            onKeyDown={e => e.key === "Enter" && analyze()}
            placeholder="Enter ticker (e.g. AAPL)"
            style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 16 }}
          />
          <button
            onClick={analyze}
            style={{ padding: "12px 24px", borderRadius: 8, background: "#22c55e", color: "#fff", border: "none", fontWeight: 700, fontSize: 16, cursor: "pointer" }}
          >
            {loading ? "..." : "Analyze"}
          </button>
        </div>

        {/* Error */}
        {error && <p style={{ color: "#ef4444", textAlign: "center" }}>{error}</p>}

        {/* Result */}
        {result && (
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 24 }}>

            {/* Company header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>{result.name}</h2>
                <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>{result.sector} · {result.country}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>${result.price?.toFixed(2)}</div>
                <div style={{ color: statusColor[result.status], fontWeight: 700, fontSize: 18 }}>
                  {result.status}
                </div>
              </div>
            </div>

            {/* Grade + Score */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, background: "#0f172a", borderRadius: 8, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: "#22c55e" }}>{result.grade}</div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>Grade</div>
              </div>
              <div style={{ flex: 1, background: "#0f172a", borderRadius: 8, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 700 }}>{result.investment_score}</div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>Investment Score</div>
              </div>
              <div style={{ flex: 1, background: "#0f172a", borderRadius: 8, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: result.fair_value?.upside_pct > 0 ? "#22c55e" : "#ef4444" }}>
                  {result.fair_value?.upside_pct > 0 ? "+" : ""}{result.fair_value?.upside_pct?.toFixed(1)}%
                </div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>Upside</div>
              </div>
            </div>

            {/* Fair Value */}
            {result.fair_value && (
              <div style={{ background: "#0f172a", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Fair Value</div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                  <span>Graham: <b style={{ color: "#f1f5f9" }}>${result.fair_value.graham_value?.toFixed(2) ?? "N/A"}</b></span>
                  <span>DCF: <b style={{ color: "#f1f5f9" }}>${result.fair_value.dcf_value?.toFixed(2) ?? "N/A"}</b></span>
                  <span>Valuation: <b style={{ color: "#f1f5f9" }}>{result.fair_value.valuation}</b></span>
                </div>
              </div>
            )}

            {/* Reason */}
            <div style={{ background: "#0f172a", borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Halal Status</div>
              <p style={{ margin: 0, color: "#94a3b8" }}>{result.reason}</p>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default App