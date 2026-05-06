import { useState, useEffect, useRef } from "react"
import axios from "axios"

const API = "https://web-production-b5851.up.railway.app"

export default function TickerTape() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/markets`, { timeout: 30000 })
      .then(res => {
        const data = res.data
        const all = []

        Object.entries(data.indices || {}).forEach(([name, q]) => {
          if (q.price) all.push({ name, price: q.price, change: q.change_pct, type: "index" })
        })
        Object.entries(data.forex || {}).forEach(([name, q]) => {
          if (q.price) all.push({ name, price: q.price, change: q.change_pct, type: "forex" })
        })
        Object.entries(data.commodities || {}).forEach(([name, q]) => {
          if (q.price) all.push({ name, price: q.price, change: q.change_pct, type: "commodity" })
        })

        setItems(all)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading || items.length === 0) return null

  // Duplica os items para o loop contínuo
  const doubled = [...items, ...items]

  return (
    <div style={{
      background: "#0a0f0c",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      overflow: "hidden",
      height: 32,
      display: "flex",
      alignItems: "center",
    }}>
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-inner {
          display: flex;
          align-items: center;
          white-space: nowrap;
          animation: ticker ${items.length * 4}s linear infinite;
        }
        .ticker-inner:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="ticker-inner">
        {doubled.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 20px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 11, color: "#8a9a8f", fontWeight: 500 }}>{item.name}</span>
            <span style={{ fontSize: 11, color: "#e8ede9", fontWeight: 600 }}>
              {item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
            {item.change != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: item.change >= 0 ? "#10b981" : "#ef4444" }}>
                {item.change >= 0 ? "▲" : "▼"} {Math.abs(item.change).toFixed(2)}%
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}