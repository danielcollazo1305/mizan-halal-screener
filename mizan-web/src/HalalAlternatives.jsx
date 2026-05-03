import { useState, useEffect } from "react"
import axios from "axios"

const API = "https://web-production-b5851.up.railway.app"

const GRADE_COLOR = {
  "A+": "#22c55e", "A": "#22c55e", "A-": "#22c55e",
  "B+": "#84cc16", "B": "#84cc16", "B-": "#84cc16",
  "C+": "#f59e0b", "C": "#f59e0b", "C-": "#f59e0b",
  "D": "#ef4444", "F": "#ef4444",
}

export default function HalalAlternatives({ ticker }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ticker) return
    setLoading(true)
    axios.get(`${API}/alternatives/${ticker}`)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [ticker])

  if (loading) return (
    <div style={{ padding: "20px 0", color: "#64748b", fontSize: 13 }}>
      ⏳ Looking for halal alternatives...
    </div>
  )

  if (!data || data.total === 0) return (
    <div style={{ background: "#1e293b", borderRadius: 10, padding: "16px 20px", marginTop: 16, color: "#64748b", fontSize: 13 }}>
      No curated halal alternatives found for <strong style={{ color: "#f1f5f9" }}>{ticker}</strong> yet.
    </div>
  )

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>🌿</span>
        <div>
          <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>
            Halal Alternatives to {ticker}
          </div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {data.total} curated option{data.total !== 1 ? "s" : ""} — verified halal
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.alternatives.map((alt, i) => (
          <div key={i} style={{
            background: "#1e293b", borderRadius: 10, padding: "14px 18px",
            borderLeft: "3px solid #0A7C5C",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#f1f5f9" }}>{alt.ticker}</span>
                <span style={{ background: "#064E3B", color: "#22c55e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>✅ HALAL</span>
                {alt.grade && (
                  <span style={{ background: "#0f172a", color: GRADE_COLOR[alt.grade] || "#94a3b8", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                    {alt.grade}
                  </span>
                )}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 3 }}>{alt.name}</div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>💡 {alt.reason}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {alt.price && <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>${alt.price.toFixed(2)}</div>}
              {alt.upside != null && (
                <div style={{ fontSize: 12, marginTop: 2, color: alt.upside >= 0 ? "#22c55e" : "#ef4444" }}>
                  {alt.upside >= 0 ? "▲" : "▼"} {Math.abs(alt.upside).toFixed(1)}% upside
                </div>
              )}
              {alt.score && <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>Score: {alt.score}/100</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}