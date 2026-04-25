import { useState, useEffect } from "react"
import axios from "axios"

const API = "https://web-production-b5851.up.railway.app"
const USER_ID = 1

const statusColor = { HALAL: "#22c55e", QUESTIONABLE: "#f59e0b", HARAM: "#ef4444" }

export default function Watchlist() {
  const [alerts, setAlerts] = useState([])
  const [form, setForm] = useState({ ticker: "", target_price: "" })
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState("")

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/alerts/${USER_ID}`)
      setAlerts(res.data.alerts || [])
    } catch {
      setMessage("Error loading alerts.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [])

  const addToWatchlist = async () => {
    if (!form.ticker || !form.target_price) return
    setAdding(true)
    setMessage("")
    try {
      await axios.post(`${API}/watchlist/add`, {
        user_id:      USER_ID,
        ticker:       form.ticker.toUpperCase(),
        target_price: parseFloat(form.target_price),
      })
      setForm({ ticker: "", target_price: "" })
      setMessage("✅ Added to watchlist!")
      fetchAlerts()
    } catch {
      setMessage("❌ Invalid ticker or error adding to watchlist.")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ maxWidth: 750, margin: "0 auto", padding: "40px 20px", color: "#f1f5f9", fontFamily: "sans-serif" }}>

      <h2 style={{ color: "#22c55e", marginBottom: 8 }}>🔔 Price Alerts</h2>
      <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 14 }}>
        Set a target price for any halal stock — get alerted when it reaches your target.
      </p>

      {/* Add to watchlist */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 32 }}>
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Add Price Alert</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={form.ticker}
            onChange={e => setForm({ ...form, ticker: e.target.value })}
            placeholder="Ticker (e.g. AAPL)"
            style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 14 }}
          />
          <input
            value={form.target_price}
            onChange={e => setForm({ ...form, target_price: e.target.value })}
            placeholder="Target Price (e.g. 200)"
            style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 14 }}
          />
          <button
            onClick={addToWatchlist}
            style={{ padding: "10px 20px", borderRadius: 8, background: "#22c55e", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
          >
            {adding ? "..." : "Add"}
          </button>
        </div>
        {message && (
          <p style={{ marginTop: 10, color: message.includes("✅") ? "#22c55e" : "#ef4444" }}>{message}</p>
        )}
      </div>

      {/* Alerts list */}
      <div style={{ fontWeight: 600, marginBottom: 16 }}>
        🔔 Triggered Alerts
        <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
          (stocks that reached your target price)
        </span>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8", textAlign: "center" }}>Loading...</p>
      ) : alerts.length === 0 ? (
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
          <p style={{ color: "#94a3b8", margin: 0 }}>No alerts triggered yet.</p>
          <p style={{ color: "#475569", fontSize: 13, marginTop: 8 }}>
            Add a stock above and set a target price below the current price to test.
          </p>
        </div>
      ) : (
        alerts.map((alert, i) => (
          <div key={i} style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 12, border: "1px solid #22c55e44" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>
                  🔔 {alert.ticker}
                  <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 14, marginLeft: 8 }}>{alert.name}</span>
                </div>
                <div style={{ color: statusColor[alert.halal_status], fontSize: 13, marginTop: 4 }}>
                  {alert.halal_status}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>
                  ${alert.current_price?.toFixed(2)}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>
                  Target: ${alert.target_price?.toFixed(2)}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, background: "#0f172a", borderRadius: 8, padding: 12 }}>
              <p style={{ margin: 0, color: "#22c55e", fontSize: 14 }}>{alert.message}</p>
            </div>
          </div>
        ))
      )}

      <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginTop: 24 }}>
        ⚠️ Alerts are based on real-time market data. Not financial advice.
      </p>
    </div>
  )
}