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

export default function Ranking() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState("HALAL")
  const [error, setError] = useState("")

  const fetchRanking = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await axios.get(`${API}/ranking?tickers=AAPL,MSFT,NVDA,GOOGL,TSLA,AMZN,META,AVGO,JNJ,WMT,V,MA,PG,KO,MCD,NKE,ADBE,AMD,QCOM,TXN`)
      setData(res.data)
    } catch {
      setError("Error loading ranking. Try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRanking() }, [])

  const tabs = ["HALAL", "QUESTIONABLE", "HARAM"]
  const tabColor = { HALAL: "#22c55e", QUESTIONABLE: "#f59e0b", HARAM: "#ef4444" }

  const companies = data
    ? (data[tab.toLowerCase()] || data[tab] || [])
    : []

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", color: "#f1f5f9", fontFamily: "sans-serif" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ color: "#22c55e", margin: 0 }}>🏆 Halal Stock Ranking</h2>
        <button
          onClick={fetchRanking}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}
        >
          🔄 Refresh
        </button>
      </div>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 14 }}>
        Ranked by Investment Score — fundamentals + fair value upside
      </p>

      {/* Summary */}
      {data && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total", value: data.summary.total },
            { label: "Halal", value: data.summary.halal, color: "#22c55e" },
            { label: "Questionable", value: data.summary.questionable, color: "#f59e0b" },
            { label: "Haram", value: data.summary.haram, color: "#ef4444" },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, background: "#1e293b", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: item.color || "#f1f5f9" }}>{item.value}</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              background: tab === t ? tabColor[t] : "#1e293b",
              color: tab === t ? "#fff" : "#94a3b8",
              fontWeight: 600, fontSize: 14,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#94a3b8" }}>⏳ Analyzing stocks in real time... This may take 30-60 seconds.</p>
        </div>
      )}

      {/* Error */}
      {error && <p style={{ color: "#ef4444", textAlign: "center" }}>{error}</p>}

      {/* List */}
      {!loading && companies.map((company, i) => (
        <div key={company.ticker} style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#475569", minWidth: 28 }}>#{i + 1}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>
                  {company.ticker}
                  <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 14, marginLeft: 8 }}>{company.name}</span>
                </div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{company.sector}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: gradeColor(company.grade) }}>{company.grade}</div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>Score: {company.investment_score}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 12, color: "#64748b", fontSize: 13 }}>
            <span>💰 ${company.price?.toFixed(2)}</span>
            <span>📊 Fundamental: {company.fundamental_score}</span>
            {company.fair_value?.upside_pct != null && (
              <span style={{ color: company.fair_value.upside_pct > 0 ? "#22c55e" : "#ef4444" }}>
                {company.fair_value.upside_pct > 0 ? "▲" : "▼"} {Math.abs(company.fair_value.upside_pct).toFixed(1)}% upside
              </span>
            )}
          </div>
        </div>
      ))}

      {!loading && !error && companies.length === 0 && data && (
        <p style={{ color: "#94a3b8", textAlign: "center" }}>No stocks in this category.</p>
      )}

      <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginTop: 24 }}>
        ⚠️ Rankings are based on financial models. Not financial advice. Do your own research.
      </p>
    </div>
  )
}