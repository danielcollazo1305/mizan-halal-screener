import { useState, useEffect } from "react"
import axios from "axios"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const API = "https://web-production-b5851.up.railway.app"
const USER_ID = 1

const COLORS = {
  green: "#16a34a",
  greenLight: "#dcfce7",
  greenMid: "#22c55e",
  red: "#ef4444",
  redLight: "#fee2e2",
  amber: "#f59e0b",
  amberLight: "#fef3c7",
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  muted: "#94a3b8",
}

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState([])
  const [summary, setSummary] = useState(null)
  const [form, setForm] = useState({ ticker: "", shares: "", buy_price: "" })
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState("")
  const [evolution, setEvolution] = useState([])
  const [showForm, setShowForm] = useState(false)

  const fetchPortfolio = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/portfolio/${USER_ID}`)
      setPortfolio(res.data.portfolio)
      setSummary(res.data.summary)
    } catch {
      setMessage("Error loading portfolio.")
    } finally {
      setLoading(false)
    }
  }

  const fetchEvolution = async () => {
    try {
      const res = await axios.get(`${API}/portfolio/${USER_ID}/evolution`)
      setEvolution(res.data.evolution)
    } catch {
      setEvolution([])
    }
  }

  const saveSnapshot = async () => {
    try {
      await axios.post(`${API}/portfolio/${USER_ID}/snapshot`)
      fetchEvolution()
      setMessage("✅ Snapshot saved!")
      setTimeout(() => setMessage(""), 3000)
    } catch {
      setMessage("❌ Error saving snapshot.")
    }
  }

  useEffect(() => {
    fetchPortfolio()
    fetchEvolution()
  }, [])

  const addStock = async () => {
    if (!form.ticker || !form.shares || !form.buy_price) return
    setAdding(true)
    setMessage("")
    try {
      await axios.post(`${API}/portfolio/add`, {
        user_id:   USER_ID,
        ticker:    form.ticker.toUpperCase(),
        shares:    parseFloat(form.shares),
        buy_price: parseFloat(form.buy_price),
      })
      setForm({ ticker: "", shares: "", buy_price: "" })
      setMessage("✅ Stock added!")
      setShowForm(false)
      fetchPortfolio()
      fetchEvolution()
    } catch {
      setMessage("❌ Invalid ticker or error adding stock.")
    } finally {
      setAdding(false)
    }
  }

  const removeStock = async (id) => {
    try {
      await axios.delete(`${API}/portfolio/${id}`)
      fetchPortfolio()
    } catch {
      setMessage("❌ Error removing stock.")
    }
  }

  const statusConfig = {
    HALAL:        { label: "Halal",     bg: "#dcfce7", color: "#15803d" },
    QUESTIONABLE: { label: "Doubtful",  bg: "#fef3c7", color: "#92400e" },
    HARAM:        { label: "Haram",     bg: "#fee2e2", color: "#991b1b" },
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px", color: COLORS.text, fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: COLORS.text }}>💼 Halal Portfolio</h2>
          <p style={{ color: COLORS.muted, fontSize: 13, margin: "4px 0 0" }}>Semana 14 · Updated today</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={saveSnapshot}
            style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", color: COLORS.greenMid, border: `1px solid ${COLORS.greenMid}`, fontWeight: 600, cursor: "pointer", fontSize: 13 }}
          >
            Save Snapshot
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding: "8px 14px", borderRadius: 8, background: COLORS.greenMid, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
          >
            + Add Stock
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: "10px 16px", borderRadius: 8, background: message.includes("✅") ? "#dcfce7" : "#fee2e2", color: message.includes("✅") ? "#15803d" : "#991b1b", fontSize: 13, marginBottom: 16 }}>
          {message}
        </div>
      )}

      {/* Add Stock Form */}
      {showForm && (
        <div style={{ background: COLORS.card, borderRadius: 12, padding: 20, marginBottom: 20, border: `1px solid ${COLORS.border}` }}>
          <p style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Add Stock</p>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { key: "ticker", placeholder: "Ticker (AAPL)" },
              { key: "shares", placeholder: "Shares (10)" },
              { key: "buy_price", placeholder: "Buy Price (150)" },
            ].map(f => (
              <input
                key={f.key}
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.text, fontSize: 14 }}
              />
            ))}
            <button
              onClick={addStock}
              style={{ padding: "10px 20px", borderRadius: 8, background: COLORS.greenMid, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
            >
              {adding ? "..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Metrics */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total Value",  value: `$${summary.total_value?.toFixed(2)}` },
            { label: "Invested",     value: `$${summary.total_invested?.toFixed(2)}` },
            { label: "Return",       value: `${summary.return_pct >= 0 ? "+" : ""}${summary.return_pct?.toFixed(2)}%`, color: summary.return_pct >= 0 ? COLORS.greenMid : COLORS.red },
            { label: "Positions",    value: summary.positions },
          ].map(item => (
            <div key={item.label} style={{ background: COLORS.card, borderRadius: 10, padding: "16px", border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: item.color || COLORS.text }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Evolution Chart */}
      {evolution.length > 0 && (
        <div style={{ background: COLORS.card, borderRadius: 12, padding: 20, marginBottom: 20, border: `1px solid ${COLORS.border}` }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Portfolio Evolution</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="date" stroke={COLORS.muted} tick={{ fontSize: 11 }} />
              <YAxis stroke={COLORS.muted} tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}
                formatter={(value) => [`$${value.toFixed(2)}`, ""]}
              />
              <Line type="monotone" dataKey="total_value" stroke={COLORS.greenMid} strokeWidth={2} dot={{ r: 4, fill: COLORS.greenMid }} name="Portfolio" />
              <Line type="monotone" dataKey="total_invested" stroke={COLORS.muted} strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Invested" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Holdings */}
      <div style={{ background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          {["Asset", "Buy Price", "Current", "P&L", "Status"].map(h => (
            <span key={h} style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: h !== "Asset" ? "right" : "left" }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <p style={{ color: COLORS.muted, textAlign: "center", padding: 32 }}>Loading...</p>
        ) : portfolio.length === 0 ? (
          <p style={{ color: COLORS.muted, textAlign: "center", padding: 32 }}>No stocks yet. Add your first halal stock!</p>
        ) : (
          portfolio.map(item => {
            const sc = statusConfig[item.halal_status] || statusConfig.HARAM
            return (
              <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}`, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.ticker} <span style={{ color: COLORS.muted, fontWeight: 400, fontSize: 13 }}>{item.name}</span></div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{item.shares} shares</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 14 }}>${item.buy_price?.toFixed(2)}</div>
                <div style={{ textAlign: "right", fontSize: 14 }}>${item.current_price?.toFixed(2)}</div>
                <div style={{ textAlign: "right", fontSize: 14, fontWeight: 600, color: item.return_pct >= 0 ? COLORS.greenMid : COLORS.red }}>
                  {item.return_pct >= 0 ? "+" : ""}{item.return_pct?.toFixed(2)}%
                </div>
                <div style={{ textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                  <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
                  <button
                    onClick={() => removeStock(item.id)}
                    style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                  >×</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <p style={{ color: "#475569", fontSize: 11, textAlign: "center", marginTop: 16 }}>
        📊 Return based on current market price. Not financial advice.
      </p>
    </div>
  )
}