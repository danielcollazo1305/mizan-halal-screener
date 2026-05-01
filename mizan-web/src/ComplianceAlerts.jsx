import { useState, useEffect } from "react"
import axios from "axios"

const API = "https://web-production-b5851.up.railway.app"

const STATUS_COLOR = {
  HALAL:        "#22c55e",
  QUESTIONABLE: "#f59e0b",
  HARAM:        "#ef4444",
}

const STATUS_ICON = {
  HALAL:        "✅",
  QUESTIONABLE: "⚠️",
  HARAM:        "🚫",
}

export default function ComplianceAlerts({ user }) {
  const [alerts, setAlerts]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [checking, setChecking] = useState(false)
  const [message, setMessage]   = useState("")

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/compliance-alerts/${user.id}`)
      setAlerts(res.data.alerts || [])
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  const runCheck = async () => {
    setChecking(true)
    setMessage("")
    try {
      const res = await axios.post(`${API}/compliance-check`)
      const { tickers_checked, alerts_fired } = res.data
      setMessage(
        alerts_fired > 0
          ? `⚠️ ${alerts_fired} status change(s) detected across ${tickers_checked} tickers. Emails sent!`
          : `✅ ${tickers_checked} tickers checked — no changes detected.`
      )
      fetchAlerts()
    } catch {
      setMessage("❌ Check failed. Try again.")
    } finally {
      setChecking(false)
    }
  }

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, color: "#f1f5f9" }}>
            🛡️ Compliance Alerts
          </h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
            Tracks halal status changes for your watchlist
          </p>
        </div>
        <button
          onClick={runCheck}
          disabled={checking}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: checking ? "#334155" : "#C9A84C",
            color: checking ? "#94a3b8" : "#0C1F17",
            fontWeight: 700, fontSize: 14, cursor: checking ? "not-allowed" : "pointer",
          }}
        >
          {checking ? "⏳ Checking..." : "🔍 Run Check Now"}
        </button>
      </div>

      {/* Feedback message */}
      {message && (
        <div style={{
          background: "#1e293b", borderRadius: 10, padding: "14px 18px",
          marginBottom: 20, color: "#f1f5f9", fontSize: 14,
          borderLeft: "4px solid #C9A84C"
        }}>
          {message}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
          ⏳ Loading compliance history...
        </div>
      )}

      {/* Empty state */}
      {!loading && alerts.length === 0 && (
        <div style={{
          background: "#1e293b", borderRadius: 12, padding: 48,
          textAlign: "center"
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🕌</div>
          <div style={{ color: "#f1f5f9", fontWeight: 600, marginBottom: 8 }}>
            No compliance changes yet
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            Add stocks to your watchlist and run a check to monitor their halal status.
          </div>
        </div>
      )}

      {/* Alert list */}
      {!loading && alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {alerts.map(alert => (
            <div key={alert.id} style={{
              background: "#1e293b", borderRadius: 12, padding: "18px 20px",
              borderLeft: `4px solid ${STATUS_COLOR[alert.new_status] || "#475569"}`,
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>

              {/* Left — ticker + name */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>
                  {alert.ticker}
                  <span style={{ color: "#64748b", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                    {alert.company_name}
                  </span>
                </div>
                <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>
                  {formatDate(alert.changed_at)}
                </div>
              </div>

              {/* Right — status change */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: "#0f172a", color: STATUS_COLOR[alert.prev_status] || "#94a3b8"
                }}>
                  {STATUS_ICON[alert.prev_status]} {alert.prev_status}
                </span>

                <span style={{ color: "#475569", fontSize: 16 }}>→</span>

                <span style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: `${STATUS_COLOR[alert.new_status]}22`,
                  color: STATUS_COLOR[alert.new_status] || "#94a3b8",
                  border: `1px solid ${STATUS_COLOR[alert.new_status]}44`
                }}>
                  {STATUS_ICON[alert.new_status]} {alert.new_status}
                </span>
              </div>

            </div>
          ))}
        </div>
      )}

      <p style={{ color: "#334155", fontSize: 11, textAlign: "center", marginTop: 32 }}>
        Compliance checks use real-time data. Status changes trigger automatic email notifications.
      </p>
    </div>
  )
}