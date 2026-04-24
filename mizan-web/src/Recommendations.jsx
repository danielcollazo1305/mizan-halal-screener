import { useState, useEffect } from "react"
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

export default function Recommendations() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchRecommendations = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await axios.get(`${API}/recommendations?top_n=3`)
      setData(res.data)
    } catch {
      setError("Error loading recommendations. Try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRecommendations() }, [])

  return (
    <div style={{ maxWidth: 750, margin: "0 auto", padding: "40px 20px", color: "#f1f5f9", fontFamily: "sans-serif" }}>

      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h2 style={{ color: "#22c55e", margin: 0, fontSize: 28 }}>⭐ Monthly Picks</h2>
        <p style={{ color: "#94a3b8", marginTop: 8 }}>
          Top 3 halal stocks to consider this month — ranked by Investment Score
        </p>
        {data && (
          <div style={{ display: "inline-block", background: "#1e293b", borderRadius: 20, padding: "4px 16px", fontSize: 13, color: "#64748b", marginTop: 4 }}>
            {data.month} · {data.total_analyzed} stocks analyzed
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "#94a3b8", fontSize: 16 }}>⏳ Analyzing halal stocks... This may take a minute.</p>
        </div>
      )}

      {error && <p style={{ color: "#ef4444", textAlign: "center" }}>{error}</p>}

      {!loading && data?.top_picks?.map((stock, i) => (
        <div key={stock.ticker} style={{
          background: i === 0 ? "linear-gradient(135deg, #0f2a1a, #1e293b)" : "#1e293b",
          borderRadius: 16, padding: 24, marginBottom: 16,
          border: i === 0 ? "1px solid #22c55e44" : "1px solid #1e293b",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: i === 0 ? "#22c55e" : i === 1 ? "#f59e0b" : "#94a3b8",
                fontWeight: 700, fontSize: 16, color: "#fff"
              }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>
                  {stock.ticker}
                  <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 14, marginLeft: 8 }}>{stock.name}</span>
                </div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>✅ HALAL</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: gradeColor(stock.grade) }}>{stock.grade}</div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>Score: {stock.investment_score?.toFixed(1)}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Price", value: `$${stock.price?.toFixed(2)}` },
              { label: "Fundamental", value: stock.fundamental_score?.toFixed(1) },
              { label: "Fair Value", value: stock.fair_value ? `$${stock.fair_value?.toFixed(2)}` : "N/A" },
              {
                label: "Potential Upside (fair value)",
                value: stock.upside_pct != null ? `${stock.upside_pct > 0 ? "+" : ""}${stock.upside_pct?.toFixed(1)}%` : "N/A",
                color: stock.upside_pct > 0 ? "#22c55e" : "#ef4444"
              },
            ].map(item => (
              <div key={item.label} style={{ flex: 1, background: "#0f172a", borderRadius: 8, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: item.color || "#f1f5f9" }}>{item.value}</div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{item.label}</div>
              </div>
            ))}
          </div>

          {stock.valuation && (
            <div style={{ display: "inline-block", background: "#0f172a", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#94a3b8" }}>
              📊 {stock.valuation}
            </div>
          )}
        </div>
      ))}

      {data && (
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginTop: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: "#94a3b8", fontSize: 14 }}>Methodology</div>
          <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>{data.methodology}</p>
        </div>
      )}

      <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginTop: 24 }}>
        ⚠️ Potential upside is based on Graham & DCF fair value models. These are not buy recommendations.
        Always do your own research before investing.
      </p>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button onClick={fetchRecommendations} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}>
          🔄 Refresh
        </button>
      </div>
    </div>
  )
}