import { useState, useEffect } from "react"
import axios from "axios"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const API = "https://web-production-b5851.up.railway.app"
const USER_ID = 1

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState([])
  const [summary, setSummary] = useState(null)
  const [form, setForm] = useState({ ticker: "", shares: "", buy_price: "" })
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState("")
  const [evolution, setEvolution] = useState([])

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
      alert("Snapshot saved!")
      fetchEvolution()
    } catch {
      alert("Error saving snapshot.")
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
      fetchPortfolio()
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

  const statusColor = { HALAL: "#22c55e", QUESTIONABLE: "#f59e0b", HARAM: "#ef4444" }

  const chartData = portfolio.map(item => ({
    name:     item.ticker,
    invested: item.invested,
    current:  item.current_value,
  }))

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", color: "#f1f5f9", fontFamily: "sans-serif" }}>

      <h2 style={{ color: "#22c55e", marginBottom: 24 }}>💼 My Halal Portfolio</h2>

      {summary && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            {[
              { label: "Invested", value: `$${summary.total_invested?.toFixed(2)}` },
              { label: "Current Value", value: `$${summary.total_value?.toFixed(2)}` },
              { label: "Return", value: `${summary.return_pct >= 0 ? "+" : ""}${summary.return_pct?.toFixed(2)}%`, color: summary.return_pct >= 0 ? "#22c55e" : "#ef4444" },
              { label: "Positions", value: summary.positions },
            ].map(item => (
              <div key={item.label} style={{ flex: 1, background: "#1e293b", borderRadius: 8, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: item.color || "#f1f5f9" }}>{item.value}</div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>{item.label}</div>
              </div>
            ))}
          </div>
          <p style={{ color: "#475569", fontSize: 12, textAlign: "center", margin: "8px 0 24px" }}>
            📊 Return is based on current market price. Past performance does not guarantee future results.
          </p>
        </>
      )}

      {/* Snapshot Button */}
      <div style={{ textAlign: "right", marginBottom: 12 }}>
        <button
          onClick={saveSnapshot}
          style={{ padding: "8px 16px", borderRadius: 8, background: "#22c55e", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
        >
          Save Today's Snapshot
        </button>
      </div>

      {/* Evolution Chart */}
      {evolution.length > 0 && (
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Portfolio Evolution</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "none" }}
                formatter={(value) => [`$${value.toFixed(2)}`, ""]}
              />
              <Line type="monotone" dataKey="total_value" stroke="#22c55e" name="Portfolio Value" dot={{ r: 4 }} strokeWidth={2} />
              <Line type="monotone" dataKey="total_invested" stroke="#94a3b8" name="Invested" dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Invested vs Current Chart */}
      {chartData.length > 0 && (
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 32 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Invested vs Current Value</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: "#0f172a", border: "none" }} />
              <Line type="monotone" dataKey="invested" stroke="#94a3b8" name="Invested" dot={false} />
              <Line type="monotone" dataKey="current" stroke="#22c55e" name="Current" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add stock form */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 32 }}>
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Add Stock</div>
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
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 14 }}
            />
          ))}
          <button
            onClick={addStock}
            style={{ padding: "10px 20px", borderRadius: 8, background: "#22c55e", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
          >
            {adding ? "..." : "Add"}
          </button>
        </div>
        {message && <p style={{ marginTop: 10, color: message.includes("✅") ? "#22c55e" : "#ef4444" }}>{message}</p>}
      </div>

      {/* Portfolio list */}
      {loading ? (
        <p style={{ color: "#94a3b8", textAlign: "center" }}>Loading...</p>
      ) : portfolio.length === 0 ? (
        <p style={{ color: "#94a3b8", textAlign: "center" }}>No stocks yet. Add your first halal stock!</p>
      ) : (
        portfolio.map(item => (
          <div key={item.id} style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{item.ticker} <span style={{ color: "#94a3b8", fontSize: 14 }}>{item.name}</span></div>
                <div style={{ color: statusColor[item.halal_status], fontSize: 13, marginTop: 4 }}>{item.halal_status}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: item.return_pct >= 0 ? "#22c55e" : "#ef4444" }}>
                  {item.return_pct >= 0 ? "+" : ""}{item.return_pct?.toFixed(2)}%
                </div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>${item.current_value?.toFixed(2)} / ${item.invested?.toFixed(2)}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, color: "#94a3b8", fontSize: 13 }}>
              <span>{item.shares} shares @ ${item.buy_price}</span>
              <span>Current: ${item.current_price?.toFixed(2)}</span>
              <button
                onClick={() => removeStock(item.id)}
                style={{ background: "none", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 6, padding: "2px 10px", cursor: "pointer", fontSize: 12 }}
              >
                Remove
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}