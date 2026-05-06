import { useState, useEffect } from "react"
import axios from "axios"

const API = "https://web-production-b5851.up.railway.app"

const C = {
  bg:     "#080f0b",
  card:   "#111827",
  card2:  "#1a2235",
  border: "#1f2d45",
  green:  "#10b981",
  red:    "#ef4444",
  text:   "#f1f5f9",
  muted:  "#64748b",
  muted2: "#94a3b8",
  gold:   "#C9A84C",
}

function ChangeBadge({ value }) {
  if (value == null) return <span style={{ color: C.muted }}>—</span>
  const positive = value >= 0
  return (
    <span style={{ color: positive ? C.green : C.red, fontWeight: 700, fontSize: 13 }}>
      {positive ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  )
}

function MarketCard({ title, emoji, data }) {
  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
        {emoji} {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(data).map(([name, quote]) => (
          <div key={name} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: C.card2, borderRadius: 8, padding: "10px 14px"
          }}>
            <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 16, textAlign: "right" }}>
              <span style={{ color: C.muted2, fontSize: 13 }}>
                {quote.price != null ? quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "—"}
              </span>
              <ChangeBadge value={quote.change_pct} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Markets() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchMarkets = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/markets`, { timeout: 30000 })
      setData(res.data)
      setLastUpdate(new Date().toLocaleTimeString("en-US"))
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarkets()
    const interval = setInterval(fetchMarkets, 60000) // auto-refresh a cada minuto
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", color: C.text }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>🌍 Global Markets</h2>
          <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 13 }}>
            Real-time indices, forex and commodities
            {lastUpdate && <span style={{ marginLeft: 8, color: C.muted }}>· Updated {lastUpdate}</span>}
          </p>
        </div>
        <button
          onClick={fetchMarkets}
          disabled={loading}
          style={{
            padding: "8px 18px", borderRadius: 8, border: `1px solid ${C.border}`,
            background: "transparent", color: loading ? C.muted : C.text,
            fontSize: 13, cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "⏳ Loading..." : "🔄 Refresh"}
        </button>
      </div>

      {loading && !data && (
        <div style={{ textAlign: "center", padding: 80, color: C.muted }}>
          ⏳ Loading market data... this may take up to 30 seconds.
        </div>
      )}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MarketCard title="Stock Indices" emoji="📈" data={data.indices} />
          <MarketCard title="Forex" emoji="💱" data={data.forex} />
          <MarketCard title="Commodities" emoji="🥇" data={data.commodities} />
        </div>
      )}

      <p style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 28 }}>
        Data provided by Yahoo Finance. Delayed up to 15 minutes. Not financial advice.
      </p>
    </div>
  )
}