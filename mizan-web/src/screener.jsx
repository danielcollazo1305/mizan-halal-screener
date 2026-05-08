import { useState, useEffect } from "react"
import axios from "axios"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, LineChart, Line } from "recharts"
import HalalAlternatives from "./HalalAlternatives"

const API = "https://web-production-b5851.up.railway.app"

const C = {
  bg:     "#080f0b",
  card:   "#0C1F17",
  card2:  "#0a1a10",
  border: "rgba(255,255,255,0.06)",
  green:  "#0A7C5C",
  gold:   "#C9A84C",
  red:    "#ef4444",
  amber:  "#f59e0b",
  text:   "#f0f4f1",
  muted:  "#5a6a60",
  muted2: "#7a8a80",
}

const fmtB = (v) => {
  if (v == null) return "N/A"
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return `$${v.toFixed(2)}`
}
const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : "N/A"

const statusConfig = {
  HALAL:        { color: "#0A7C5C", bg: "rgba(10,124,92,0.15)",  label: "Halal" },
  QUESTIONABLE: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", label: "Questionable" },
  HARAM:        { color: "#ef4444", bg: "rgba(239,68,68,0.15)",  label: "Haram" },
}

const EXCHANGES = [
  { key: "sp500",   label: "S&P 500",  flag: "🇺🇸" },
  { key: "nasdaq",  label: "NASDAQ",   flag: "🇺🇸" },
  { key: "lse",     label: "LSE",      flag: "🇬🇧" },
  { key: "cac40",   label: "CAC 40",   flag: "🇫🇷" },
  { key: "dax",     label: "DAX",      flag: "🇩🇪" },
  { key: "uae",     label: "UAE",      flag: "🇦🇪" },
  { key: "tadawul", label: "Tadawul",  flag: "🇸🇦" },
]

const STOCKS = {
  sp500:   ["AAPL","MSFT","NVDA","GOOGL","META","AMZN","BRK-B","JPM","JNJ","V","PG","UNH","HD","MA","MRK","AVGO","CVX","COST","ADBE","PEP","LLY","TMO","ABBV","ACN","MCD","NKE","TXN","NEE","PM","RTX","HON","UPS","IBM","QCOM","SPGI","GS","BLK","AXP","BA","CAT","DE","MMM","GE","SBUX","AMGN","GILD","ISRG","MDT","SYK","ZTS","ADI","LRCX","KLAC","AMAT","MU","SNPS","CDNS","MRVL","NXPI","TER","SWKS","MPWR","ENPH","FSLR","DUK","SO","AEP","EXC","XEL","SRE","D","ED","PCG","FE","ETR","AES","NRG","EIX","WEC","ES","CMS","NI","OGE","AVA","PNM","IDACORP","OGS","NWE","ARTNA","MSEX","YORW","SJW","AWR","CWT","GWRS","CTWS","PESI","PZZA","WEN","QSR","DRI","EAT","TXRH","BLMN","CAKE","RRGB","BJRI","DINE"],
  nasdaq:  ["TSLA","AMD","INTC","QCOM","TXN","MU","AMAT","LRCX","KLAC","MRVL","PANW","CRWD","ZS","SNOW","DDOG","NET","TEAM","WDAY","OKTA","ZM","ABNB","COIN","RBLX","HOOD","SOFI","LCID","RIVN","NKLA","BLNK","CHPT","PLUG","FCEL","BE","BLDP","HYLN","IDEX","SOLO","KNDI","AYRO","HYZN","GOEV","ARVL","MULN","RIDE","FFIE","NKLAW","NAKD","CTRM","EXPR","BBBY","AMC","GME","BB","NOK","SNDL","TLRY","CGC","ACB","APHA","OGI","HEXO","CRON","MJ","YOLO","MSOS","THCX","POTX","CNBS","TPVG","GLAD","GAIN","CSWC","HTGC","ARCC","MAIN","PSEC","ORCC","FSK","GBDC","SLRC","PFLT","TRIN","OBDC","BXSL","CGBD","TCPC","GSBD","MFIC","KCAP","TICC"],
  lse:     ["SHEL.L","AZN.L","HSBA.L","ULVR.L","BP.L","RIO.L","GSK.L","VOD.L","BATS.L","LSEG.L","BT-A.L","LLOY.L","BARC.L","NWG.L","STAN.L","HSBA.L","PRU.L","LGEN.L","AV.L","ADM.L"],
  cac40:   ["AIR.PA","TTE.PA","SAN.PA","BNP.PA","MC.PA","OR.PA","SU.PA","DG.PA","RI.PA","KER.PA","SGO.PA","VIE.PA","CAP.PA","ACA.PA","GLE.PA","BN.PA","ENGI.PA","ORA.PA","STM.PA","RNO.PA"],
  dax:     ["SAP.DE","SIE.DE","ALV.DE","MUV2.DE","BMW.DE","BAS.DE","BAYN.DE","DTE.DE","RWE.DE","VOW3.DE","ADS.DE","DBK.DE","CB.DE","HEN3.DE","MRK.DE","EOAN.DE","HEI.DE","FRE.DE","SHL.DE","ZAL.DE"],
  uae:     ["EMAAR.AE","ETISALAT.AE","DAMAC.AE","ALDAR.AE","TAQA.AE","DU.AE","DEWA.AE","ADIB.AE","MARKA.AE","SALIK.AE"],
  tadawul: ["2222.SR","4001.SR","1182.SR","4002.SR","2110.SR","2290.SR","3030.SR","7010.SR","6001.SR","4030.SR"],
}

function getUser() {
  try { return JSON.parse(localStorage.getItem("mizan_user")) } catch { return null }
}
function getToken() {
  const u = getUser()
  return u?.token || u?.access_token || ""
}
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` })

// ─── WATCHLIST TAB ───────────────────────────────────────────────────────────
function WatchlistTab() {
  const user   = getUser()
  const userId = user?.id || 1

  const [watchlist,   setWatchlist]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [adding,      setAdding]      = useState(false)
  const [ticker,      setTicker]      = useState("")
  const [targetPrice, setTargetPrice] = useState("")
  const [message,     setMessage]     = useState("")

  const cardStyle = { background: C.card, borderRadius: 12, padding: "20px 24px", border: `0.5px solid ${C.border}` }

  const fetchWatchlist = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/watchlist/${userId}`, { headers: authHeaders() })
      const items = res.data || []
      const enriched = await Promise.all(items.map(async (item) => {
        try {
          const r = await axios.get(`${API}/analyze?ticker=${item.ticker}`)
          return { ...item, ...r.data }
        } catch { return item }
      }))
      setWatchlist(enriched)
    } catch {
      setMessage("Error loading watchlist.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWatchlist() }, [])

  const addToWatchlist = async () => {
    if (!ticker) return
    setAdding(true)
    setMessage("")
    try {
      await axios.post(`${API}/watchlist/add`, {
        user_id:      userId,
        ticker:       ticker.toUpperCase(),
        target_price: parseFloat(targetPrice) || 0,
      }, { headers: authHeaders() })
      setTicker("")
      setTargetPrice("")
      setMessage("Added to watchlist!")
      fetchWatchlist()
    } catch {
      setMessage("Error adding to watchlist.")
    } finally {
      setAdding(false)
    }
  }

  const removeFromWatchlist = async (t) => {
    try {
      await axios.delete(`${API}/watchlist/${t}`, { headers: authHeaders() })
      fetchWatchlist()
    } catch {
      setMessage("Error removing.")
    }
  }

  return (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Add Stock</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && addToWatchlist()}
            placeholder="Ticker (e.g. AAPL)"
            style={{ flex: 1, minWidth: 140, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: "inherit" }} />
          <input value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
            placeholder="Alert price (optional)" type="number"
            style={{ width: 180, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: "inherit" }} />
          <button onClick={addToWatchlist} disabled={adding}
            style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            {adding ? "..." : "+ Add"}
          </button>
        </div>
        {message && <div style={{ marginTop: 10, fontSize: 13, color: message.includes("Error") ? C.red : C.green }}>{message}</div>}
      </div>

      {loading ? (
        <div style={{ ...cardStyle, textAlign: "center", color: C.muted, padding: 40 }}>Loading watchlist...</div>
      ) : watchlist.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>Your watchlist is empty</div>
          <div style={{ fontSize: 12, color: C.muted }}>Add stocks above to start monitoring</div>
        </div>
      ) : (
        <div style={cardStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
            {watchlist.length} stock{watchlist.length !== 1 ? "s" : ""} tracked
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Ticker", "Name", "Price", "Status", "Grade", "Upside", "Alert Price", ""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: h === "Ticker" || h === "Name" ? "left" : "right", color: C.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `0.5px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item, i) => {
                const sc     = statusConfig[item.status] || statusConfig.HARAM
                const upside = item.fair_value?.upside_pct
                return (
                  <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                    <td style={{ padding: "14px 12px" }}><div style={{ fontWeight: 700, color: C.text }}>{item.ticker}</div></td>
                    <td style={{ padding: "14px 12px", color: C.muted2, fontSize: 12 }}>{item.name?.slice(0, 24) || "—"}</td>
                    <td style={{ padding: "14px 12px", textAlign: "right", fontWeight: 700, color: C.text }}>{item.price ? `$${item.price.toFixed(2)}` : "—"}</td>
                    <td style={{ padding: "14px 12px", textAlign: "right" }}>
                      {item.status && <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{sc.label}</span>}
                    </td>
                    <td style={{ padding: "14px 12px", textAlign: "right", fontWeight: 700, color: C.green }}>{item.grade || "—"}</td>
                    <td style={{ padding: "14px 12px", textAlign: "right", fontWeight: 600, color: upside > 0 ? C.green : C.red }}>
                      {upside != null ? `${upside > 0 ? "+" : ""}${upside.toFixed(1)}%` : "—"}
                    </td>
                    <td style={{ padding: "14px 12px", textAlign: "right", color: C.gold }}>{item.target_price ? `$${item.target_price.toFixed(2)}` : "—"}</td>
                    <td style={{ padding: "14px 12px", textAlign: "right" }}>
                      <button onClick={() => removeFromWatchlist(item.ticker)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontSize: 11, marginTop: 8 }}>
        Status changes trigger automatic compliance alerts. Not financial advice.
      </div>
    </div>
  )
}

// ─── STOCK CARD ──────────────────────────────────────────────────────────────
function StockCard({ ticker, onClick }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    axios.get(`${API}/analyze?ticker=${ticker}`)
      .then(r => setData(r.data))
      .catch(() => {})
  }, [ticker])

  const sc = data?.status ? (statusConfig[data.status] || statusConfig.HARAM) : null

  return (
    <div onClick={() => data && onClick(ticker, data)} style={{
      background: C.card, borderRadius: 10, padding: "14px 16px",
      border: `0.5px solid ${C.border}`, cursor: data ? "pointer" : "default",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      transition: "border-color 0.2s",
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = C.green}
    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      <div>
        <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{ticker}</div>
        {data  && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{data.name?.slice(0, 24)}</div>}
        {!data && <div style={{ fontSize: 11, color: C.muted }}>Loading...</div>}
      </div>
      <div style={{ textAlign: "right" }}>
        {data && (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>${data.price?.toFixed(2)}</div>
            {sc && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: sc.bg, color: sc.color }}>{sc.label}</span>}
          </>
        )}
      </div>
    </div>
  )
}

// ─── STOCK DETAIL ────────────────────────────────────────────────────────────
function StockDetail({ ticker, initialData, onBack }) {
  const [result, setResult]         = useState(initialData)
  const [history, setHistory]       = useState([])
  const [profile, setProfile]       = useState(null)
  const [financials, setFinancials] = useState(null)
  const [dividends, setDividends]   = useState([])
  const [news, setNews]             = useState([])
  const [period, setPeriod]         = useState("1y")
  const [loadingExtra, setLoadingExtra] = useState(true)
  const [activeTab, setActiveTab]   = useState("overview")
  const [showAlert, setShowAlert]   = useState(false)
  const [alertPrice, setAlertPrice] = useState("")
  const [alertMsg, setAlertMsg]     = useState("")
  const [compareTicker, setCompareTicker] = useState("")
  const [compareData, setCompareData] = useState(null)
  const [wlMsg, setWlMsg]           = useState("")

  useEffect(() => {
    axios.get(`${API}/history?ticker=${ticker}&period=${period}`)
      .then(r => setHistory(r.data.history || []))
      .catch(() => {})

    axios.get(`${API}/news/${ticker}`, { timeout: 20000 })
      .then(r => setNews(r.data.news || []))
      .catch(() => {})

    setLoadingExtra(true)
    Promise.all([
      axios.get(`${API}/company/${ticker}`, { timeout: 30000 }).catch(() => null),
      axios.get(`${API}/financials/${ticker}`, { timeout: 60000 }).catch(() => null),
      axios.get(`${API}/dividends/${ticker}`, { timeout: 30000 }).catch(() => null),
    ]).then(([prof, fin, div]) => {
      if (prof?.data) setProfile(prof.data)
      if (fin?.data)  setFinancials(fin.data)
      if (div?.data)  setDividends(div.data.dividends || [])
    }).finally(() => setLoadingExtra(false))
  }, [ticker, period])

  const fetchCompare = async () => {
    if (!compareTicker) return
    try {
      const r = await axios.get(`${API}/analyze?ticker=${compareTicker.toUpperCase()}`)
      setCompareData(r.data)
    } catch {}
  }

  const setAlert = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("mizan_user"))
      await axios.post(`${API}/alerts`, {
        user_id: user?.id,
        ticker: result?.ticker,
        target_price: parseFloat(alertPrice),
        condition: "price_drops_below"
      })
      setAlertMsg("Alert set successfully!")
      setShowAlert(false)
      setAlertPrice("")
    } catch { setAlertMsg("Error setting alert.") }
  }

  const addToWatchlist = async () => {
    try {
      const user   = getUser()
      const userId = user?.id || 1
      await axios.post(`${API}/watchlist/add`, {
        user_id:      userId,
        ticker:       ticker,
        target_price: 0,
      }, { headers: authHeaders() })
      setWlMsg("Added to Watchlist!")
      setTimeout(() => setWlMsg(""), 3000)
    } catch {
      setWlMsg("Already in watchlist.")
      setTimeout(() => setWlMsg(""), 3000)
    }
  }

  const sc = statusConfig[result?.status] || statusConfig.HARAM
  const chartColor = history.length > 1
    ? history[history.length - 1].close >= history[0].close ? C.green : C.red
    : C.green

  const card = { background: C.card, borderRadius: 12, padding: 20, border: `0.5px solid ${C.border}`, marginBottom: 16 }

  const fundamentalItems = result ? [
    { label: "ROE",             value: fmtPct(result.roe),            hint: "Return on Equity" },
    { label: "Profit Margin",   value: fmtPct(result.profit_margin),  hint: "Net profit margin" },
    { label: "P/E Ratio",       value: result.pe_ratio?.toFixed(1) ?? "N/A", hint: "Price / Earnings" },
    { label: "P/B Ratio",       value: result.pb_ratio?.toFixed(1) ?? "N/A", hint: "Price / Book Value" },
    { label: "Revenue Growth",  value: fmtPct(result.revenue_growth), hint: "YoY revenue growth" },
    { label: "Earnings Growth", value: fmtPct(result.earnings_growth),hint: "YoY earnings growth" },
    { label: "Debt Ratio",      value: result.debt_ratio ? `${(result.debt_ratio * 100).toFixed(1)}%` : "N/A", hint: "Debt / Market Cap" },
    { label: "Dividend Yield",  value: result.dividend_yield ? `${result.dividend_yield.toFixed(2)}%` : "N/A", hint: "Annual dividend yield" },
    { label: "Market Cap",      value: fmtB(result.market_cap),       hint: "Total market value" },
    { label: "EPS",             value: result.eps ? `$${result.eps.toFixed(2)}` : "N/A", hint: "Earnings per share" },
    { label: "Book Value",      value: result.book_value ? `$${result.book_value.toFixed(2)}` : "N/A", hint: "Book value per share" },
    { label: "EV/EBITDA",       value: profile?.ev_ebitda?.toFixed(1) ?? "N/A", hint: "Enterprise Value / EBITDA" },
  ] : []

  const incomeData = Array.isArray(financials?.income) ? financials.income.map(i => ({
    year: i.year,
    Revenue:      i.revenue    ? +(i.revenue    / 1e9).toFixed(1) : 0,
    "Net Income": i.net_income ? +(i.net_income / 1e9).toFixed(1) : 0,
    EBITDA:       i.ebitda     ? +(i.ebitda     / 1e9).toFixed(1) : 0,
  })).reverse() : []

  const historicalData = Array.isArray(financials?.metrics) ? financials.metrics.map(m => ({
    year: m.year,
    ROE:           m.roe          ? +(m.roe          * 100).toFixed(1) : null,
    "Net Margin":  m.net_margin   ? +(m.net_margin   * 100).toFixed(1) : null,
    "Gross Margin":m.gross_margin ? +(m.gross_margin * 100).toFixed(1) : null,
    FCF:           m.fcf          ? +(m.fcf          / 1e9).toFixed(1) : null,
  })).reverse() : []

  const tabs = ["overview", "fundamentals", "financials", "historical", "dividends", "compare", "compliance"]

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px" }}>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.muted2, cursor: "pointer", fontSize: 13, marginBottom: 20, fontFamily: "inherit" }}>
        ← Back to Screener
      </button>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, color: C.text }}>{result?.name}</h2>
            <p style={{ margin: "4px 0 0", color: C.muted2, fontSize: 13 }}>{result?.sector} · {result?.industry}</p>
            <p style={{ margin: "2px 0 0", color: C.muted, fontSize: 12 }}>{result?.country}{profile?.exchange && ` · ${profile.exchange}`}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.text }}>${result?.price?.toFixed(2)}</div>
            <span style={{ padding: "4px 12px", borderRadius: 6, fontWeight: 700, fontSize: 14, background: sc.bg, color: sc.color }}>{sc.label}</span>
            <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAlert(!showAlert)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.green}`, background: "transparent", color: C.green, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Set Alert</button>
              <button onClick={addToWatchlist} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.gold}`, background: "transparent", color: C.gold, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Watchlist</button>
              <a href={`${API}/export/pdf/${result?.ticker}`} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted2, fontWeight: 600, fontSize: 12, textDecoration: "none" }}>Export PDF</a>
            </div>
            {wlMsg && <div style={{ fontSize: 12, color: C.gold, marginTop: 6, textAlign: "right" }}>{wlMsg}</div>}
          </div>
        </div>

        {showAlert && (
          <div style={{ display: "flex", gap: 10, marginBottom: 12, padding: 14, background: C.card2, borderRadius: 8 }}>
            <input value={alertPrice} onChange={e => setAlertPrice(e.target.value)} placeholder="Target price" type="number"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: "inherit" }} />
            <button onClick={setAlert} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: C.green, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Confirm</button>
          </div>
        )}
        {alertMsg && <div style={{ fontSize: 13, color: C.green, marginBottom: 8 }}>{alertMsg}</div>}

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { label: "52W High",       value: result?.["52w_high"] ? `$${result["52w_high"].toFixed(2)}` : "N/A" },
            { label: "52W Low",        value: result?.["52w_low"]  ? `$${result["52w_low"].toFixed(2)}`  : "N/A" },
            { label: "Current",        value: result?.price ? `$${result.price.toFixed(2)}` : "N/A" },
            { label: "Analyst Target", value: profile?.analyst_target ? `$${profile.analyst_target.toFixed(2)}` : "N/A" },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, background: C.card2, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.value}</div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "Grade",            value: result?.grade, color: C.green },
            { label: "Investment Score", value: result?.investment_score },
            { label: "Potential Upside", value: result?.fair_value?.upside_pct != null ? `${result.fair_value.upside_pct > 0 ? "+" : ""}${result.fair_value.upside_pct.toFixed(1)}%` : "N/A", color: result?.fair_value?.upside_pct > 0 ? C.green : C.red },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, background: C.card2, borderRadius: 8, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: item.color || C.text }}>{item.value}</div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
        <p style={{ color: C.muted, fontSize: 11, textAlign: "center", margin: "10px 0 0" }}>Based on Graham & DCF models. Not financial advice.</p>
      </div>

      {history.length > 0 && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 600, color: C.text }}>Price History</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["1mo", "3mo", "6mo", "1y", "2y"].map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: period === p ? chartColor : C.card2, color: period === p ? "#fff" : C.muted, fontFamily: "inherit" }}>{p}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" stroke={C.muted} tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis stroke={C.muted} tick={{ fontSize: 11 }} domain={["auto", "auto"]} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }} formatter={v => [`$${v.toFixed(2)}`, "Price"]} />
              <Area type="monotone" dataKey="close" stroke={chartColor} fill="url(#colorPrice)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            background: activeTab === t ? C.green : C.card,
            color: activeTab === t ? "#fff" : C.muted2,
            fontFamily: "inherit", textTransform: "capitalize",
          }}>{t}</button>
        ))}
        {loadingExtra && <span style={{ color: C.muted, fontSize: 12, alignSelf: "center", marginLeft: 8 }}>Loading extra data...</span>}
      </div>

      {activeTab === "overview" && (
        <div>
          {profile?.description && (
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 10, color: C.text }}>About</div>
              <p style={{ margin: 0, color: C.muted2, fontSize: 13, lineHeight: 1.6 }}>{profile.description.slice(0, 400)}...</p>
              {profile.employees && <div style={{ marginTop: 10, color: C.muted, fontSize: 12 }}>{parseInt(profile.employees).toLocaleString()} employees</div>}
            </div>
          )}
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: C.text }}>Halal Status</div>
            <p style={{ margin: 0, color: C.muted2, fontSize: 13 }}>{result?.reason}</p>
          </div>
          {result?.fair_value && (
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 10, color: C.text }}>Fair Value</div>
              <div style={{ display: "flex", justifyContent: "space-between", color: C.muted2, fontSize: 13 }}>
                <span>Graham: <b style={{ color: C.text }}>${result.fair_value.graham_value?.toFixed(2) ?? "N/A"}</b></span>
                <span>DCF: <b style={{ color: C.text }}>${result.fair_value.dcf_value?.toFixed(2) ?? "N/A"}</b></span>
                <span>Valuation: <b style={{ color: C.gold }}>{result.fair_value.valuation}</b></span>
              </div>
            </div>
          )}
          {news.length > 0 && (
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 14, color: C.text }}>Latest News</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {news.slice(0, 5).map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", gap: 12, textDecoration: "none", background: C.card2, borderRadius: 8, padding: 12, border: `0.5px solid ${C.border}` }}>
                    {item.thumbnail && <img src={item.thumbnail} alt="" style={{ width: 72, height: 54, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                    <div>
                      <div style={{ color: C.text, fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ color: C.muted, fontSize: 11 }}>{item.source} · {item.published ? new Date(item.published).toLocaleDateString("en-GB") : ""}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "fundamentals" && (
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 16, color: C.text }}>Key Fundamentals</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {fundamentalItems.map(item => (
              <div key={item.label} style={{ background: C.card2, borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.hint}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "financials" && (
        <div>
          {incomeData.length > 0 ? (
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 16, color: C.text }}>Revenue & Profit History (USD Billions)</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={incomeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="year" stroke={C.muted} tick={{ fontSize: 12 }} />
                  <YAxis stroke={C.muted} tick={{ fontSize: 12 }} tickFormatter={v => `$${v}B`} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }} formatter={v => [`$${v}B`]} />
                  <Bar dataKey="Revenue"    fill={C.green}  radius={[4,4,0,0]} />
                  <Bar dataKey="Net Income" fill={C.gold}   radius={[4,4,0,0]} />
                  <Bar dataKey="EBITDA"     fill={C.muted2} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ ...card, textAlign: "center", color: C.muted }}>
              {loadingExtra ? "Loading financial data..." : "No financial data available."}
            </div>
          )}
        </div>
      )}

      {activeTab === "historical" && (
        <div>
          {historicalData.length > 0 ? (
            <>
              <div style={card}>
                <div style={{ fontWeight: 600, marginBottom: 16, color: C.text }}>Margins & ROE History (%)</div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="year" stroke={C.muted} tick={{ fontSize: 12 }} />
                    <YAxis stroke={C.muted} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }} formatter={v => [`${v}%`]} />
                    <Line type="monotone" dataKey="ROE"          stroke={C.green}  strokeWidth={2} dot={{ fill: C.green }} />
                    <Line type="monotone" dataKey="Net Margin"   stroke={C.gold}   strokeWidth={2} dot={{ fill: C.gold }} />
                    <Line type="monotone" dataKey="Gross Margin" stroke={C.muted2} strokeWidth={2} dot={{ fill: C.muted2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={card}>
                <div style={{ fontWeight: 600, marginBottom: 16, color: C.text }}>Free Cash Flow (USD Billions)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="year" stroke={C.muted} tick={{ fontSize: 12 }} />
                    <YAxis stroke={C.muted} tick={{ fontSize: 12 }} tickFormatter={v => `$${v}B`} />
                    <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }} formatter={v => [`$${v}B`]} />
                    <Bar dataKey="FCF" fill={C.green} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div style={{ ...card, textAlign: "center", color: C.muted }}>
              {loadingExtra ? "Loading historical data..." : "No historical data available."}
            </div>
          )}
        </div>
      )}

      {activeTab === "dividends" && (
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 16, color: C.text }}>Dividend History</div>
          {dividends.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Ex-Date", "Amount", "Frequency"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", borderBottom: `0.5px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dividends.slice(0, 12).map((d, i) => (
                  <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                    <td style={{ padding: "10px 12px", color: C.muted2 }}>{d.ex_date}</td>
                    <td style={{ padding: "10px 12px", color: C.gold, fontWeight: 600 }}>${d.amount?.toFixed(4)}</td>
                    <td style={{ padding: "10px 12px", color: C.muted }}>{d.frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: C.muted, textAlign: "center", padding: 20 }}>
              {loadingExtra ? "Loading dividend history..." : "No dividends for this stock."}
            </p>
          )}
        </div>
      )}

      {activeTab === "compare" && (
        <div>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 14, color: C.text }}>Compare with another stock</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={compareTicker} onChange={e => setCompareTicker(e.target.value.toUpperCase())}
                placeholder="Enter ticker (e.g. MSFT)" style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: "inherit" }} />
              <button onClick={fetchCompare} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Compare</button>
            </div>
          </div>
          {compareData && (
            <div style={card}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[result, compareData].map((s, idx) => {
                  const scc = statusConfig[s?.status] || statusConfig.HARAM
                  return (
                    <div key={idx}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4 }}>{s?.ticker} — {s?.name}</div>
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: scc.bg, color: scc.color }}>{scc.label}</span>
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { label: "Price",         value: `$${s?.price?.toFixed(2)}` },
                          { label: "Grade",         value: s?.grade },
                          { label: "Score",         value: s?.investment_score },
                          { label: "P/E",           value: s?.pe_ratio?.toFixed(1) ?? "N/A" },
                          { label: "P/B",           value: s?.pb_ratio?.toFixed(1) ?? "N/A" },
                          { label: "ROE",           value: fmtPct(s?.roe) },
                          { label: "Profit Margin", value: fmtPct(s?.profit_margin) },
                          { label: "Market Cap",    value: fmtB(s?.market_cap) },
                          { label: "Upside",        value: s?.fair_value?.upside_pct != null ? `${s.fair_value.upside_pct > 0 ? "+" : ""}${s.fair_value.upside_pct.toFixed(1)}%` : "N/A" },
                        ].map(item => (
                          <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: C.card2, borderRadius: 6 }}>
                            <span style={{ color: C.muted, fontSize: 12 }}>{item.label}</span>
                            <span style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "compliance" && (
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 16, color: C.text }}>Compliance Details</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: "16px 20px", background: C.card2, borderRadius: 10 }}>
            <span style={{ padding: "6px 16px", borderRadius: 8, fontWeight: 700, fontSize: 16, background: sc.bg, color: sc.color }}>{sc.label}</span>
            <p style={{ margin: 0, color: C.muted2, fontSize: 13, lineHeight: 1.5 }}>{result?.reason}</p>
          </div>
          {(result?.status === "HARAM" || result?.status === "QUESTIONABLE") && (
            <HalalAlternatives ticker={result?.ticker} />
          )}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: C.text, fontSize: 13 }}>Compliance Checklist</div>
            {[
              { label: "No interest-based revenue (Riba)", pass: result?.status !== "HARAM" },
              { label: "Debt ratio below 33%",             pass: result?.debt_ratio != null && result.debt_ratio < 0.33 },
              { label: "No haram business activities",     pass: result?.status === "HALAL" },
              { label: "Revenue from permissible sources", pass: result?.status !== "HARAM" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `0.5px solid ${C.border}` }}>
                <span style={{ color: item.pass ? C.green : C.red, fontSize: 16 }}>{item.pass ? "✓" : "✗"}</span>
                <span style={{ color: C.muted2, fontSize: 13 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN SCREENER ───────────────────────────────────────────────────────────
export default function Screener() {
  const [activeView, setActiveView]             = useState("screener")
  const [selectedExchange, setSelectedExchange] = useState("sp500")
  const [searchTicker, setSearchTicker]         = useState("")
  const [searching, setSearching]               = useState(false)
  const [selectedStock, setSelectedStock]       = useState(null)
  const [selectedData, setSelectedData]         = useState(null)

  const handleSearch = async () => {
    if (!searchTicker) return
    setSearching(true)
    try {
      const r = await axios.get(`${API}/analyze?ticker=${searchTicker.toUpperCase()}`)
      setSelectedData(r.data)
      setSelectedStock(searchTicker.toUpperCase())
    } catch {}
    setSearching(false)
  }

  if (selectedStock && selectedData) {
    return <StockDetail ticker={selectedStock} initialData={selectedData} onBack={() => { setSelectedStock(null); setSelectedData(null) }} />
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>

      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {[
          { key: "screener",  label: "Screener" },
          { key: "watchlist", label: "Watchlist" },
        ].map(v => (
          <button key={v.key} onClick={() => setActiveView(v.key)} style={{
            padding: "9px 22px", borderRadius: 8, border: "none", cursor: "pointer",
            background: activeView === v.key ? C.green : C.card,
            color: activeView === v.key ? "#fff" : C.muted2,
            fontWeight: 700, fontSize: 14, fontFamily: "inherit",
            borderBottom: activeView === v.key ? `2px solid ${C.gold}` : "2px solid transparent",
          }}>{v.label}</button>
        ))}
      </div>

      {activeView === "watchlist" && <WatchlistTab />}

      {activeView === "screener" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
            <input value={searchTicker} onChange={e => setSearchTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Search any stock by ticker (e.g. AAPL, MSFT, NVDA)"
              style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 14, fontFamily: "inherit" }} />
            <button onClick={handleSearch} style={{ padding: "12px 24px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              {searching ? "..." : "Analyze"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
            {EXCHANGES.map(ex => (
              <button key={ex.key} onClick={() => setSelectedExchange(ex.key)} style={{
                padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                background: selectedExchange === ex.key ? C.green : C.card,
                color: selectedExchange === ex.key ? "#fff" : C.muted2,
                fontWeight: 600, fontSize: 13, fontFamily: "inherit",
              }}>{ex.flag} {ex.label}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {(STOCKS[selectedExchange] || []).map(ticker => (
              <StockCard key={ticker} ticker={ticker} onClick={(t, d) => { setSelectedStock(t); setSelectedData(d) }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
