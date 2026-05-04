import { useState, useEffect } from "react"
import axios from "axios"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend
} from "recharts"

const API = "https://web-production-b5851.up.railway.app"
const USER_ID = JSON.parse(localStorage.getItem("mizan_user"))?.id || 1

const C = {
  bg:       "#0a0f1e",
  card:     "#111827",
  card2:    "#1a2235",
  border:   "#1f2d45",
  green:    "#10b981",
  greenDim: "#064e3b",
  red:      "#ef4444",
  amber:    "#f59e0b",
  blue:     "#3b82f6",
  purple:   "#8b5cf6",
  text:     "#f1f5f9",
  muted:    "#64748b",
  muted2:   "#94a3b8",
}

const SECTOR_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#14b8a6"
]

const PERIOD_OPTIONS = [
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1A", value: "1y" },
]

const BENCHMARKS_META = [
  { key: "sp500",    label: "S&P 500",  color: "#3b82f6" },
  { key: "nasdaq",   label: "NASDAQ",   color: "#f59e0b" },
  { key: "djimi",    label: "DJIMI",    color: "#8b5cf6" },
  { key: "ftse100",  label: "FTSE 100", color: "#ec4899" },
  { key: "dax",      label: "DAX",      color: "#14b8a6" },
  { key: "emerging", label: "Emerging", color: "#f97316" },
  { key: "shanghai", label: "Shanghai", color: "#ef4444" },
]

const fmt = (v, prefix = "$") =>
  v == null ? "N/A" : `${prefix}${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtPct = (v, plus = true) => {
  if (v == null) return "N/A"
  const s = `${Math.abs(v).toFixed(2)}%`
  return v >= 0 ? (plus ? `+${s}` : s) : `-${s}`
}

const PctBadge = ({ value, size = 13 }) => (
  <span style={{ fontSize: size, fontWeight: 700, color: value >= 0 ? C.green : C.red }}>
    {fmtPct(value)}
  </span>
)

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, ...style }}>
    {children}
  </div>
)

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
    {children}
  </div>
)

export default function Portfolio() {
  const [portfolio, setPortfolio]   = useState([])
  const [summary, setSummary]       = useState(null)
  const [evolution, setEvolution]   = useState([])
  const [benchmarks, setBenchmarks] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [adding, setAdding]         = useState(false)
  const [message, setMessage]       = useState("")
  const [showForm, setShowForm]     = useState(false)
  const [period, setPeriod]         = useState("1y")
  const [form, setForm]             = useState({ ticker: "", shares: "", buy_price: "" })

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [portRes, evoRes, bmRes] = await Promise.all([
        axios.get(`${API}/portfolio/${USER_ID}`),
        axios.get(`${API}/portfolio/${USER_ID}/evolution`),
        axios.get(`${API}/benchmarks?period=${period}`),
      ])
      setPortfolio(portRes.data.portfolio || [])
      setSummary(portRes.data.summary)
      setEvolution(evoRes.data.evolution || [])
      setBenchmarks(bmRes.data)
    } catch {
      setMessage("❌ Error loading portfolio.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [period])

  const saveSnapshot = async () => {
    try {
      await axios.post(`${API}/portfolio/${USER_ID}/snapshot`)
      const res = await axios.get(`${API}/portfolio/${USER_ID}/evolution`)
      setEvolution(res.data.evolution || [])
      setMessage("✅ Snapshot saved!")
      setTimeout(() => setMessage(""), 3000)
    } catch {
      setMessage("❌ Error saving snapshot.")
    }
  }

  const addStock = async () => {
    if (!form.ticker || !form.shares || !form.buy_price) return
    setAdding(true)
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
      fetchAll()
    } catch {
      setMessage("❌ Invalid ticker or error adding stock.")
    } finally {
      setAdding(false)
    }
  }

  const removeStock = async (id) => {
    try {
      await axios.delete(`${API}/portfolio/${id}`)
      fetchAll()
    } catch {
      setMessage("❌ Error removing stock.")
    }
  }

  // Sector allocation for donut chart
  const sectorMap = {}
  portfolio.forEach(item => {
    const sector = item.sector || "Other"
    sectorMap[sector] = (sectorMap[sector] || 0) + (item.current_value || 0)
  })
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value: Math.round(value) }))

  // Halal score
  const halalCount = portfolio.filter(i => i.halal_status === "HALAL").length
  const halalScore = portfolio.length > 0 ? Math.round((halalCount / portfolio.length) * 100) : 0

  // Monthly return (approximate from evolution)
  const monthlyReturn = evolution.length >= 2
    ? ((evolution[evolution.length - 1]?.total_value - evolution[0]?.total_value) / evolution[0]?.total_value * 100)
    : null

  const statusConfig = {
    HALAL:        { label: "Halal",    bg: "#064e3b", color: "#10b981" },
    QUESTIONABLE: { label: "Doubtful", bg: "#451a03", color: "#f59e0b" },
    HARAM:        { label: "Haram",    bg: "#450a0a", color: "#ef4444" },
  }

  const inputStyle = {
    flex: 1, padding: "10px 14px", borderRadius: 10,
    border: `1px solid ${C.border}`, background: C.bg,
    color: C.text, fontSize: 14, outline: "none",
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", color: C.text, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>💼 Halal Portfolio</h2>
          <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={saveSnapshot} style={{ padding: "9px 16px", borderRadius: 10, background: "transparent", color: C.green, border: `1px solid ${C.green}`, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
            Save Snapshot
          </button>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: "9px 16px", borderRadius: 10, background: C.green, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
            + Add Stock
          </button>
        </div>
      </div>

      {/* ── Message ── */}
      {message && (
        <div style={{ padding: "10px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13,
          background: message.includes("✅") ? "#064e3b" : "#450a0a",
          color: message.includes("✅") ? C.green : C.red, border: `1px solid ${message.includes("✅") ? C.green : C.red}` }}>
          {message}
        </div>
      )}

      {/* ── Add Stock Form ── */}
      {showForm && (
        <Card style={{ marginBottom: 20 }}>
          <SectionTitle>Add Stock</SectionTitle>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { key: "ticker", placeholder: "Ticker (AAPL)" },
              { key: "shares", placeholder: "Shares (10)" },
              { key: "buy_price", placeholder: "Buy Price ($150)" },
            ].map(f => (
              <input key={f.key} value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder} style={inputStyle} />
            ))}
            <button onClick={addStock} style={{ padding: "10px 20px", borderRadius: 10, background: C.green, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              {adding ? "..." : "Add"}
            </button>
          </div>
        </Card>
      )}

      {/* ── KPI Cards ── */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
          {[
            { label: "Total Value",      value: fmt(summary.total_value),    sub: `${summary.positions} positions` },
            { label: "Total Invested",   value: fmt(summary.total_invested),  sub: "Cost basis" },
            { label: "Total Return",     value: fmtPct(summary.return_pct),   color: summary.return_pct >= 0 ? C.green : C.red, sub: fmt(summary.gain_loss) },
            { label: "Monthly Return",   value: monthlyReturn != null ? fmtPct(monthlyReturn) : "N/A", color: monthlyReturn >= 0 ? C.green : C.red, sub: "Based on snapshots" },
          ].map(item => (
            <Card key={item.label} style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: item.color || C.text }}>{item.value}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{item.sub}</div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Charts Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>

        {/* Donut Chart */}
        <Card>
          <SectionTitle>Allocation by Sector</SectionTitle>
          {sectorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sectorData} cx="40%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                  {sectorData.map((_, i) => (
                    <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8 }}
                  formatter={(v) => [fmt(v), "Value"]}
                />
                <Legend
                  layout="vertical" align="right" verticalAlign="middle"
                  formatter={(value) => <span style={{ color: C.muted2, fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
              No data yet
            </div>
          )}
        </Card>

        {/* Halal Score */}
        <Card>
          <SectionTitle>Halal Compliance Score</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ position: "relative", width: 100, height: 100 }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke={C.border} strokeWidth="10" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={C.green} strokeWidth="10"
                    strokeDasharray={`${(halalScore / 100) * 251.2} 251.2`}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{halalScore}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>/100</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {[
                  { label: "Halal assets",    value: `${halalCount}/${portfolio.length}`, color: C.green },
                  { label: "Questionable",    value: `${portfolio.filter(i => i.halal_status === "QUESTIONABLE").length}`, color: C.amber },
                  { label: "Non-compliant",   value: `${portfolio.filter(i => i.halal_status === "HARAM").length}`, color: C.red },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: C.muted }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Progress bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Compliance level</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{halalScore}%</span>
              </div>
              <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${halalScore}%`, background: `linear-gradient(90deg, ${C.green}, #34d399)`, borderRadius: 4, transition: "width 1s ease" }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Evolution Chart ── */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <SectionTitle>Portfolio Evolution</SectionTitle>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {PERIOD_OPTIONS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)} style={{
                padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                background: period === p.value ? C.green : C.border,
                color: period === p.value ? "#fff" : C.muted,
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        {evolution.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" stroke={C.muted} tick={{ fontSize: 11 }} />
              <YAxis stroke={C.muted} tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8 }}
                formatter={(v) => [`$${Number(v).toFixed(2)}`, ""]} />
              <Line type="monotone" dataKey="total_value" stroke={C.green} strokeWidth={2.5} dot={{ r: 4, fill: C.green }} name="💼 Portfolio" />
              <Line type="monotone" dataKey="total_invested" stroke={C.muted} strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="💰 Invested" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 32 }}>📊</span>
            <span>Save your first snapshot to see evolution</span>
          </div>
        )}

        {/* Benchmarks */}
        {benchmarks && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <SectionTitle>Benchmarks — 1Y Performance</SectionTitle>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {BENCHMARKS_META.map(b => {
                const data = benchmarks[b.key]
                if (!data || data.length === 0) return null
                const perf = data[data.length - 1]?.value - 100
                return (
                  <div key={b.key} style={{ background: C.card2, borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color }} />
                    <span style={{ fontSize: 12, color: C.muted2 }}>{b.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: perf >= 0 ? C.green : C.red }}>
                      {perf >= 0 ? "+" : ""}{perf.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* ── Holdings Table ── */}
      <Card>
        <SectionTitle>Holdings</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Asset", "Sector", "Allocation", "Buy Price", "Current", "P&L", "Return", "Dividend", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: h === "Asset" || h === "Sector" ? "left" : "right", color: C.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading...</td></tr>
              ) : portfolio.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: 40, color: C.muted }}>No stocks yet. Add your first halal stock!</td></tr>
              ) : (
                portfolio.map(item => {
                  const sc = statusConfig[item.halal_status] || statusConfig.HARAM
                  const allocation = summary?.total_value > 0
                    ? ((item.current_value / summary.total_value) * 100).toFixed(1)
                    : "0"
                  return (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "14px 12px" }}>
                        <div style={{ fontWeight: 700 }}>{item.ticker}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{item.shares} shares</div>
                      </td>
                      <td style={{ padding: "14px 12px", color: C.muted2, fontSize: 12 }}>{item.sector || "—"}</td>
                      <td style={{ padding: "14px 12px", textAlign: "right" }}>
                        <div style={{ fontWeight: 600 }}>{allocation}%</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{fmt(item.current_value)}</div>
                      </td>
                      <td style={{ padding: "14px 12px", textAlign: "right", color: C.muted2 }}>{fmt(item.buy_price)}</td>
                      <td style={{ padding: "14px 12px", textAlign: "right" }}>{fmt(item.current_price)}</td>
                      <td style={{ padding: "14px 12px", textAlign: "right" }}>
                        <PctBadge value={item.return_pct} />
                        <div style={{ fontSize: 11, color: item.gain_loss >= 0 ? C.green : C.red, marginTop: 2 }}>
                          {item.gain_loss >= 0 ? "+" : ""}{fmt(item.gain_loss)}
                        </div>
                      </td>
                      <td style={{ padding: "14px 12px", textAlign: "right" }}>
                        <PctBadge value={item.return_pct} />
                      </td>
                      <td style={{ padding: "14px 12px", textAlign: "right", color: C.muted2 }}>
                        {item.dividend_yield ? `${item.dividend_yield.toFixed(2)}%` : "—"}
                      </td>
                      <td style={{ padding: "14px 12px", textAlign: "right" }}>
                        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: sc.bg, color: sc.color, fontWeight: 600 }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 12px", textAlign: "right" }}>
                        <button onClick={() => removeStock(item.id)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {summary && portfolio.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: `2px solid ${C.border}` }}>
                  <td colSpan={2} style={{ padding: "12px 12px", fontWeight: 700, color: C.muted2, fontSize: 12 }}>TOTAL</td>
                  <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 700 }}>100%</td>
                  <td style={{ padding: "12px 12px", textAlign: "right", color: C.muted2 }}>{fmt(summary.total_invested)}</td>
                  <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 700 }}>{fmt(summary.total_value)}</td>
                  <td style={{ padding: "12px 12px", textAlign: "right" }}>
                    <PctBadge value={summary.return_pct} size={14} />
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <p style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 20 }}>
        📊 Return based on current market price. Not financial advice. Always do your own research.
      </p>
    </div>
  )
}
# ── Portfolio Advanced — Risk & Diversification ───────────────────────────────

@app.get("/portfolio/{user_id}/risk", tags=["Portfolio"])
def get_portfolio_risk(user_id: int, db: Session = Depends(get_db)):
    """
    Análise de risco do portfolio — volatilidade, diversificação, alertas.
    """
    positions = db.query(Portfolio).filter(Portfolio.user_id == user_id).all()
    if not positions:
        return {"user_id": user_id, "risk": None, "alerts": []}

    total_value = sum(p.current_price * p.shares for p in positions if p.current_price)
    alerts = []
    positions_data = []

    for p in positions:
        if not p.current_price:
            continue
        value = p.current_price * p.shares
        allocation = (value / total_value * 100) if total_value > 0 else 0

        # Alerta de concentração
        if allocation > 20:
            alerts.append({
                "type": "CONCENTRATION",
                "severity": "WARNING",
                "ticker": p.ticker,
                "message": f"{p.ticker} represents {allocation:.1f}% of your portfolio — consider reducing to below 20%",
            })

        # Alerta de posição HARAM
        if p.halal_status == "HARAM":
            alerts.append({
                "type": "COMPLIANCE",
                "severity": "CRITICAL",
                "ticker": p.ticker,
                "message": f"{p.ticker} is classified as HARAM — consider replacing with a halal alternative",
            })

        positions_data.append({
            "ticker": p.ticker,
            "allocation": round(allocation, 1),
            "value": round(value, 2),
            "shares": p.shares,
            "halal_status": p.halal_status,
        })

    # Diversificação por sector
    sector_map = {}
    for p in positions:
        sector = p.sector or "Unknown"
        value = (p.current_price or 0) * p.shares
        sector_map[sector] = sector_map.get(sector, 0) + value

    sector_allocation = [
        {"sector": k, "value": round(v, 2), "pct": round(v / total_value * 100, 1)}
        for k, v in sector_map.items()
    ]

    # Alerta de falta de diversificação
    if len(sector_map) < 3:
        alerts.append({
            "type": "DIVERSIFICATION",
            "severity": "INFO",
            "ticker": None,
            "message": f"Your portfolio only covers {len(sector_map)} sector(s) — consider diversifying across more sectors",
        })

    # Rebalanceamento sugerido
    rebalance = []
    target_pct = 100 / len(positions_data) if positions_data else 0
    for p in positions_data:
        diff = p["allocation"] - target_pct
        if abs(diff) > 5:
            action = "REDUCE" if diff > 0 else "INCREASE"
            rebalance.append({
                "ticker": p["ticker"],
                "current_pct": p["allocation"],
                "target_pct": round(target_pct, 1),
                "action": action,
                "diff": round(abs(diff), 1),
            })

    return {
        "user_id": user_id,
        "total_value": round(total_value, 2),
        "positions": len(positions_data),
        "alerts": alerts,
        "sector_allocation": sector_allocation,
        "rebalance_suggestions": rebalance,
        "diversification_score": min(100, len(sector_map) * 20),
    }