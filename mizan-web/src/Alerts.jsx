import { useState, useEffect } from "react"
import axios from "axios"

const API = "https://web-production-b5851.up.railway.app"

export default function Alerts({ user }) {
  const userId = user?.id || 1
  const [alerts, setAlerts] = useState([])
  const [form, setForm] = useState({ ticker: "", target_price: "", condition: "below" })
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState("")

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/price-alerts/${userId}`)
      setAlerts(res.data.alerts || [])
    } catch {
      setMessage("Error loading alerts.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [])

  const addAlert = async () => {
    if (!form.ticker || !form.target_price) return
    setAdding(true)
    setMessage("")
    try {
      await axios.post(`${API}/price-alerts`, {
        user_id:      userId,
        ticker:       form.ticker.toUpperCase(),
        target_price: parseFloat(form.target_price),
        condition:    form.condition,
      })
      setForm({ ticker: "", target_price: "", condition: "below" })
      setMessage("✅ Alert created! You'll receive an email when the price is reached.")
      fetchAlerts()
    } catch {
      setMessage("❌ Invalid ticker or error creating alert.")
    } finally {
      setAdding(false)
    }
  }

  const deleteAlert = async (alertId) => {
    try {
      await axios.delete(`${API}/price-alerts/${alertId}`)
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch {
      setMessage("❌ Error deleting alert.")
    }
  }

  const checkAlerts = async () => {
    setChecking(true)
    setMessage("")
    try {
      const res = await axios.post(`${API}/price-alerts/check`)
      const { checked, triggered } = res.data
      if (triggered.length > 0) {
        setMessage(`✅ ${triggered.length} alert(s) triggered! Email sent for: ${triggered.join(", ")}`)
      } else {
        setMessage(`🔍 Checked ${checked} alert(s) — no targets reached yet.`)
      }
      fetchAlerts()
    } catch {
      setMessage("❌ Error checking alerts.")
    } finally {
      setChecking(false)
    }
  }

  const inp = {
    padding: "10px 12px", borderRadius: 8,
    border: "1px solid #334155", background: "#0f172a",
    color: "#f1f5f9", fontSize: 14, outline: "none",
  }

  return (
    <div style={{ maxWidth: 750, margin: "0 auto", padding: "40px 20px", color: "#f1f5f9", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ color: "#22c55e", margin: "0 0 8px" }}>🔔 Price Alerts</h2>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: 14 }}>
            Set a target price — receive an email when it's reached.
          </p>
        </div>
        <button
          onClick={checkAlerts}
          disabled={checking}
          style={{
            padding: "10px 18px", borderRadius: 8,
            background: checking ? "#1e293b" : "#0f172a",
            color: "#22c55e", border: "1px solid #22c55e44",
            fontWeight: 600, cursor: "pointer", fontSize: 13,
          }}
        >
          {checking ? "Checking..." : "⚡ Check Now"}
        </button>
      </div>

      {/* Form */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 32 }}>
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Add New Alert</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={form.ticker}
            onChange={e => setForm({ ...form, ticker: e.target.value })}
            placeholder="Ticker (e.g. AAPL)"
            style={{ ...inp, flex: 1, minWidth: 120 }}
          />
          <input
            value={form.target_price}
            onChange={e => setForm({ ...form, target_price: e.target.value })}
            placeholder="Target Price"
            type="number"
            style={{ ...inp, flex: 1, minWidth: 120 }}
          />
          <select
            value={form.condition}
            onChange={e => setForm({ ...form, condition: e.target.value })}
            style={{ ...inp, minWidth: 120 }}
          >
            <option value="below">Price drops below ↓</option>
            <option value="above">Price rises above ↑</option>
          </select>
          <button
            onClick={addAlert}
            disabled={adding}
            style={{
              padding: "10px 20px", borderRadius: 8,
              background: "#22c55e", color: "#fff",
              border: "none", fontWeight: 700,
              cursor: adding ? "not-allowed" : "pointer",
              opacity: adding ? 0.7 : 1,
            }}
          >
            {adding ? "..." : "Add"}
          </button>
        </div>
        {message && (
          <p style={{ marginTop: 12, color: message.includes("✅") ? "#22c55e" : message.includes("🔍") ? "#f59e0b" : "#ef4444", fontSize: 14 }}>
            {message}
          </p>
        )}
      </div>

      {/* Alerts list */}
      <div style={{ fontWeight: 600, marginBottom: 16 }}>
        Active Alerts
        <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
          ({alerts.length} active)
        </span>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8", textAlign: "center" }}>Loading...</p>
      ) : alerts.length === 0 ? (
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
          <p style={{ color: "#94a3b8", margin: 0 }}>No active alerts.</p>
          <p style={{ color: "#475569", fontSize: 13, marginTop: 8 }}>
            Add a stock above and set a target price to get notified by email.
          </p>
        </div>
      ) : (
        alerts.map((alert) => (
          <div key={alert.id} style={{
            background: "#1e293b", borderRadius: 12, padding: 20,
            marginBottom: 12, border: "1px solid #334155",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>
                {alert.ticker}
                <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                  {alert.name}
                </span>
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                {alert.condition === "below" ? "↓ Drops below" : "↑ Rises above"}{" "}
                <span style={{ color: "#f1f5f9", fontWeight: 600 }}>
                  ${parseFloat(alert.target_price).toFixed(2)}
                </span>
              </div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>
                Created {new Date(alert.created_at).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                background: "#0f172a", borderRadius: 8, padding: "6px 12px",
                color: "#22c55e", fontSize: 12, fontWeight: 600,
              }}>
                🟢 Active
              </div>
              <button
                onClick={() => deleteAlert(alert.id)}
                style={{
                  background: "transparent", border: "1px solid #ef444444",
                  color: "#ef4444", borderRadius: 8, padding: "6px 12px",
                  cursor: "pointer", fontSize: 12, fontWeight: 600,
                }}
              >
                Remove
              </button>
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