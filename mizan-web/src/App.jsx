import { useState } from "react"
import axios from "axios"
import Portfolio from "./Portfolio"
import Ranking from "./Ranking"
import Recommendations from "./Recommendations"
import Compare from "./Compare"
import Watchlist from "./Watchlist"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, LineChart, Line } from "recharts"
import Auth from "./Auth"
import Alerts from "./Alerts"
import Dashboard from "./Dashboard"
import Landing from "./Landing"
import Zakat from "./Zakat"
import ComplianceAlerts from "./ComplianceAlerts"

const API = "https://web-production-b5851.up.railway.app"

const fmtB = (v) => {
  if (v == null) return "N/A"
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return `$${v.toFixed(2)}`
}

const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : "N/A"

function Screener() {
  const [ticker, setTicker] = useState("")
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [profile, setProfile] = useState(null)
  const [financials, setFinancials] = useState(null)
  const [dividends, setDividends] = useState([])
  const [period, setPeriod] = useState("1y")
  const [loading, setLoading] = useState(false)
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  const analyze = async (t = ticker, p = period) => {
    if (!t) return
    setLoading(true)
    setLoadingExtra(true)
    setError("")
    setResult(null)
    setHistory([])
    setProfile(null)
    setFinancials(null)
    setDividends([])
    setActiveTab("overview")
    try {
      const [res, hist] = await Promise.all([
        axios.get(`${API}/analyze?ticker=${t.toUpperCase()}`),
        axios.get(`${API}/history?ticker=${t.toUpperCase()}&period=${p}`)
      ])
      setResult(res.data)
      setHistory(hist.data.history || [])
    } catch {
      setError("Stock not found. Check the ticker and try again.")
      setLoading(false)
      setLoadingExtra(false)
      return
    } finally {
      setLoading(false)
    }

    Promise.all([
      axios.get(`${API}/company/${t.toUpperCase()}`, { timeout: 30000 }).catch(() => null),
      axios.get(`${API}/financials/${t.toUpperCase()}`, { timeout: 60000 }).catch(() => null),
      axios.get(`${API}/dividends/${t.toUpperCase()}`, { timeout: 30000 }).catch(() => null),
    ]).then(([prof, fin, div]) => {
      if (prof?.data) setProfile(prof.data)
      if (fin?.data) setFinancials(fin.data)
      if (div?.data) setDividends(div.data.dividends || [])
    }).finally(() => {
      setLoadingExtra(false)
    })
  }

  const changePeriod = async (p) => {
    setPeriod(p)
    if (result) {
      try {
        const hist = await axios.get(`${API}/history?ticker=${ticker.toUpperCase()}&period=${p}`)
        setHistory(hist.data.history || [])
      } catch {}
    }
  }

  const statusColor = { HALAL: "#22c55e", QUESTIONABLE: "#f59e0b", HARAM: "#ef4444" }
  const periods = ["1mo", "3mo", "6mo", "1y", "2y"]
  const chartColor = history.length > 1
    ? history[history.length - 1].close >= history[0].close ? "#22c55e" : "#ef4444"
    : "#22c55e"

  const tabs = ["overview", "fundamentals", "financials", "historical", "dividends"]
  const tabLabel = { overview: "Overview", fundamentals: "Fundamentals", financials: "Financials", historical: "Historical", dividends: "Dividends" }

  const fundamentalItems = result ? [
    { label: "ROE", value: fmtPct(result.roe), hint: "Return on Equity" },
    { label: "Profit Margin", value: fmtPct(result.profit_margin), hint: "Net profit margin" },
    { label: "P/E Ratio", value: result.pe_ratio?.toFixed(1) ?? "N/A", hint: "Price / Earnings" },
    { label: "P/B Ratio", value: result.pb_ratio?.toFixed(1) ?? "N/A", hint: "Price / Book Value" },
    { label: "Revenue Growth", value: fmtPct(result.revenue_growth), hint: "YoY revenue growth" },
    { label: "Earnings Growth", value: fmtPct(result.earnings_growth), hint: "YoY earnings growth" },
    { label: "Debt Ratio", value: result.debt_ratio ? `${(result.debt_ratio * 100).toFixed(1)}%` : "N/A", hint: "Debt / Market Cap" },
    { label: "Dividend Yield", value: result.dividend_yield ? `${result.dividend_yield.toFixed(2)}%` : "N/A", hint: "Annual dividend yield" },
    { label: "Market Cap", value: fmtB(result.market_cap), hint: "Total market value" },
    { label: "EPS", value: result.eps ? `$${result.eps.toFixed(2)}` : "N/A", hint: "Earnings per share" },
    { label: "Book Value", value: result.book_value ? `$${result.book_value.toFixed(2)}` : "N/A", hint: "Book value per share" },
    { label: "EV/EBITDA", value: profile?.ev_ebitda?.toFixed(1) ?? "N/A", hint: "Enterprise Value / EBITDA" },
  ] : []

  const priceItems = result ? [
    { label: "52W High", value: result["52w_high"] ? `$${result["52w_high"].toFixed(2)}` : "N/A" },
    { label: "52W Low", value: result["52w_low"] ? `$${result["52w_low"].toFixed(2)}` : "N/A" },
    { label: "Current", value: result.price ? `$${result.price.toFixed(2)}` : "N/A" },
    { label: "Analyst Target", value: profile?.analyst_target ? `$${profile.analyst_target.toFixed(2)}` : result.target_price ? `$${result.target_price.toFixed(2)}` : "N/A" },
  ] : []

  const incomeData = Array.isArray(financials?.income) ? financials.income.map(i => ({
    year: i.year,
    Revenue: i.revenue ? +(i.revenue / 1e9).toFixed(1) : 0,
    "Net Income": i.net_income ? +(i.net_income / 1e9).toFixed(1) : 0,
    EBITDA: i.ebitda ? +(i.ebitda / 1e9).toFixed(1) : 0,
  })).reverse() : []

  const historicalData = Array.isArray(financials?.metrics) ? financials.metrics.map(m => ({
    year: m.year,
    ROE: m.roe ? +(m.roe * 100).toFixed(1) : null,
    "Net Margin": m.net_margin ? +(m.net_margin * 100).toFixed(1) : null,
    "Gross Margin": m.gross_margin ? +(m.gross_margin * 100).toFixed(1) : null,
    FCF: m.fcf ? +(m.fcf / 1e9).toFixed(1) : null,
  })).reverse() : []

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        <input
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          onKeyDown={e => e.key === "Enter" && analyze()}
          placeholder="Enter ticker (e.g. AAPL, MSFT, NVDA)"
          style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 16 }}
        />
        <button onClick={() => analyze()} style={{ padding: "12px 24px", borderRadius: 8, background: "#22c55e", color: "#fff", border: "none", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
          {loading ? "..." : "Analyze"}
        </button>
      </div>

      {error && <p style={{ color: "#ef4444", textAlign: "center" }}>{error}</p>}

      {result && (
        <div>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>{result.name}</h2>
                <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>{result.sector} · {result.industry}</p>
                <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 13 }}>
                  {result.country}
                  {profile?.exchange && ` · ${profile.exchange}`}
                  {profile?.ipo_date && ` · IPO: ${profile.ipo_date}`}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>${result.price?.toFixed(2)}</div>
                <div style={{ color: statusColor[result.status], fontWeight: 700, fontSize: 18 }}>{result.status}</div>
                <a href={`${API}/export/pdf/${result.ticker}`} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, padding: "6px 12px", borderRadius: 6, background: "#0f172a", color: "#22c55e", border: "1px solid #22c55e44", fontWeight: 600, fontSize: 12, textDecoration: "none", display: "inline-block" }}>📄 Export PDF</a>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {priceItems.map(item => (
                <div key={item.label} style={{ flex: 1, background: "#0f172a", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{item.value}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              {[
                { label: "Grade", value: result.grade, color: "#22c55e" },
                { label: "Investment Score", value: result.investment_score },
                { label: "Potential Upside (fair value)", value: `${result.fair_value?.upside_pct > 0 ? "+" : ""}${result.fair_value?.upside_pct?.toFixed(1)}%`, color: result.fair_value?.upside_pct > 0 ? "#22c55e" : "#ef4444" },
              ].map(item => (
                <div key={item.label} style={{ flex: 1, background: "#0f172a", borderRadius: 8, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: item.color || "#f1f5f9" }}>{item.value}</div>
                  <div style={{ color: "#94a3b8", fontSize: 11 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <p style={{ color: "#475569", fontSize: 12, textAlign: "center", margin: "8px 0 0" }}>
              ⚠️ Potential upside is based on Graham & DCF fair value models. Not financial advice.
            </p>
          </div>

          {history.length > 0 && (
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>Price History</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {periods.map(p => (
                    <button key={p} onClick={() => changePeriod(p)} style={{
                      padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                      background: period === p ? chartColor : "#0f172a",
                      color: period === p ? "#fff" : "#94a3b8",
                    }}>{p}</button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={["auto", "auto"]} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#94a3b8" }} formatter={v => [`$${v.toFixed(2)}`, "Price"]} />
                  <Area type="monotone" dataKey="close" stroke={chartColor} fill="url(#colorPrice)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: activeTab === t ? "#22c55e" : "#1e293b",
                color: activeTab === t ? "#fff" : "#94a3b8",
              }}>{tabLabel[t]}</button>
            ))}
            {loadingExtra && (
              <span style={{ color: "#475569", fontSize: 12, alignSelf: "center", marginLeft: 8 }}>
                ⏳ Loading extra data...
              </span>
            )}
          </div>

          {activeTab === "overview" && (
            <div>
              {profile?.description && (
                <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>About</div>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>
                    {profile.description.slice(0, 400)}...
                  </p>
                  {profile.employees && (
                    <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
                      👥 {parseInt(profile.employees).toLocaleString()} employees
                    </div>
                  )}
                </div>
              )}
              <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Halal Status</div>
                <p style={{ margin: 0, color: "#94a3b8" }}>{result.reason}</p>
              </div>
              {result.fair_value && (
                <div style={{ background: "#1e293b", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>Fair Value</div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                    <span>Graham: <b style={{ color: "#f1f5f9" }}>${result.fair_value.graham_value?.toFixed(2) ?? "N/A"}</b></span>
                    <span>DCF: <b style={{ color: "#f1f5f9" }}>${result.fair_value.dcf_value?.toFixed(2) ?? "N/A"}</b></span>
                    <span>Valuation: <b style={{ color: "#f1f5f9" }}>{result.fair_value.valuation}</b></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "fundamentals" && (
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 16 }}>📊 Key Fundamentals</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {fundamentalItems.map(item => (
                  <div key={item.label} style={{ background: "#0f172a", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{item.hint}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "financials" && (
            <div>
              {incomeData.length > 0 ? (
                <div style={{ background: "#1e293b", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 16 }}>📈 Revenue & Profit History (USD Billions)</div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={incomeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="year" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={v => `$${v}B`} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} formatter={v => [`$${v}B`]} />
                      <Bar dataKey="Revenue" fill="#3b82f6" radius={[4,4,0,0]} />
                      <Bar dataKey="Net Income" fill="#22c55e" radius={[4,4,0,0]} />
                      <Bar dataKey="EBITDA" fill="#f59e0b" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ overflowX: "auto", marginTop: 16 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ color: "#64748b" }}>
                          {["Year", "Revenue", "Gross Profit", "EBITDA", "Net Income", "Gross Margin", "Net Margin"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid #334155" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...financials.income].reverse().map(row => (
                          <tr key={row.year} style={{ borderBottom: "1px solid #1e293b" }}>
                            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{row.year}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8" }}>{fmtB(row.revenue)}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8" }}>{fmtB(row.gross_profit)}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8" }}>{fmtB(row.ebitda)}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", color: "#22c55e" }}>{fmtB(row.net_income)}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8" }}>{fmtPct(row.gross_margin)}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8" }}>{fmtPct(row.net_margin)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#1e293b", borderRadius: 12, padding: 40, textAlign: "center" }}>
                  <p style={{ color: "#94a3b8", margin: 0 }}>
                    {loadingExtra ? "⏳ Loading financial data... This may take up to 60 seconds." : "No financial data available."}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "historical" && (
            <div>
              {historicalData.length > 0 ? (
                <div>
                  <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 16 }}>📊 Margins & ROE History (%)</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="year" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} formatter={v => [`${v}%`]} />
                        <Line type="monotone" dataKey="ROE" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
                        <Line type="monotone" dataKey="Net Margin" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
                        <Line type="monotone" dataKey="Gross Margin" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 16 }}>💰 Free Cash Flow History (USD Billions)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="year" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={v => `$${v}B`} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} formatter={v => [`$${v}B`]} />
                        <Bar dataKey="FCF" fill="#22c55e" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ background: "#1e293b", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 600, marginBottom: 16 }}>📋 Historical Metrics Table</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ color: "#64748b" }}>
                            {["Year", "ROE", "Net Margin", "Gross Margin", "Op. Margin", "FCF", "Total Debt", "Cash"].map(h => (
                              <th key={h} style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid #334155" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {historicalData.map(row => (
                            <tr key={row.year} style={{ borderBottom: "1px solid #1e293b" }}>
                              <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{row.year}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: "#22c55e" }}>{row.ROE ? `${row.ROE}%` : "N/A"}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8" }}>{row["Net Margin"] ? `${row["Net Margin"]}%` : "N/A"}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8" }}>{row["Gross Margin"] ? `${row["Gross Margin"]}%` : "N/A"}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8" }}>N/A</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: "#22c55e" }}>{row.FCF ? `$${row.FCF}B` : "N/A"}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: "#ef4444" }}>N/A</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8" }}>N/A</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#1e293b", borderRadius: 12, padding: 40, textAlign: "center" }}>
                  <p style={{ color: "#94a3b8", margin: 0 }}>
                    {loadingExtra ? "⏳ Loading historical data... This may take up to 60 seconds." : "No historical data available."}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "dividends" && (
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 16 }}>💰 Dividend History</div>
              {dividends.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: "#64748b" }}>
                      {["Ex-Date", "Amount", "Frequency"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #334155" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dividends.slice(0, 12).map((d, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{d.ex_date}</td>
                        <td style={{ padding: "8px 12px", color: "#22c55e", fontWeight: 600 }}>${d.amount?.toFixed(4)}</td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{d.frequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>
                  {loadingExtra ? "⏳ Loading dividend history..." : result.dividend_yield ? "No dividend data available." : "No dividends for this stock."}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState("screener")
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("mizan_user")
    return u ? JSON.parse(u) : null
  })

  const logout = () => {
    localStorage.removeItem("mizan_token")
    localStorage.removeItem("mizan_user")
    setUser(null)
  }
  const [showLanding, setShowLanding] = useState(true)

  if (showLanding) return <Landing onGetStarted={() => setShowLanding(false)} />
  if (!user) return <Auth onLogin={setUser} />

  const navStyle = (p) => ({
    padding: "8px 16px", borderRadius: 8, border: "none",
    background: page === p ? "#22c55e" : "transparent",
    color: page === p ? "#fff" : "#94a3b8",
    fontWeight: 600, cursor: "pointer", fontSize: 14,
  })

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "sans-serif" }}>
      <div style={{ borderBottom: "1px solid #1e293b", padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>🕌 Mizan</span>
          <span style={{ color: "#94a3b8", marginLeft: 8, fontSize: 14 }}>Halal Stock Screener</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={navStyle("dashboard")} onClick={() => setPage("dashboard")}>Dashboard</button>
          <button style={navStyle("screener")} onClick={() => setPage("screener")}>Screener</button>
          <button style={navStyle("ranking")} onClick={() => setPage("ranking")}>Ranking</button>
          <button style={navStyle("picks")} onClick={() => setPage("picks")}>⭐ Picks</button>
          <button style={navStyle("compare")} onClick={() => setPage("compare")}>⚖️ Compare</button>
          <button style={navStyle("watchlist")} onClick={() => setPage("watchlist")}>👁️ Watchlist</button>
          <button style={navStyle("alerts")} onClick={() => setPage("alerts")}>🔔 Alerts</button>
          <button style={navStyle("portfolio")} onClick={() => setPage("portfolio")}>💼 Portfolio</button>
          <button style={navStyle("zakat")} onClick={() => setPage("zakat")}>🕌 Zakat</button>
          <button style={navStyle("compliance")} onClick={() => setPage("compliance")}>🛡️ Compliance</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#64748b", fontSize: 13 }}>👤 {user.name}</span>
          <button onClick={logout} style={{
            padding: "6px 14px", borderRadius: 8, border: "1px solid #334155",
            background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13,
          }}>Logout</button>
        </div>
      </div>

      {page === "dashboard" && <Dashboard />}
      {page === "screener"  && <Screener />}
      {page === "ranking"   && <Ranking />}
      {page === "picks"     && <Recommendations />}
      {page === "compare"   && <Compare />}
      {page === "watchlist" && <Watchlist />}
      {page === "alerts"    && <Alerts user={user} />}
      {page === "zakat" && <Zakat />}
      {page === "portfolio" && <Portfolio />}
      {page === "compliance" && <ComplianceAlerts user={user} />}

      <div style={{ textAlign: "center", padding: "20px 40px", color: "#475569", fontSize: 12, borderTop: "1px solid #1e293b", marginTop: 40 }}>
        📊 Mizan provides data-driven analysis for informational purposes only. This is not financial advice.
        Always do your own research before making investment decisions.
      </div>
    </div>
  )
}