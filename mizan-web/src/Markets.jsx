import { useState, useEffect } from "react"
import axios from "axios"

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

const INDICES = [
  { key: "^GSPC",  label: "S&P 500",    region: "US" },
  { key: "^IXIC",  label: "NASDAQ",     region: "US" },
  { key: "^DJI",   label: "Dow Jones",  region: "US" },
  { key: "^FTSE",  label: "FTSE 100",   region: "UK" },
  { key: "^GDAXI", label: "DAX",        region: "DE" },
  { key: "^FCHI",  label: "CAC 40",     region: "FR" },
  { key: "^TASI",  label: "Tadawul",    region: "SA" },
  { key: "^ADX",   label: "Abu Dhabi",  region: "AE" },
]

const FOREX = [
  { key: "EURUSD=X", label: "EUR/USD" },
  { key: "GBPUSD=X", label: "GBP/USD" },
  { key: "USDJPY=X", label: "USD/JPY" },
  { key: "USDSAR=X", label: "USD/SAR" },
  { key: "USDAED=X", label: "USD/AED" },
]

const COMMODITIES = [
  { key: "GC=F",  label: "Gold" },
  { key: "SI=F",  label: "Silver" },
  { key: "CL=F",  label: "Crude Oil" },
  { key: "NG=F",  label: "Natural Gas" },
]

const NEWS_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "2222.SR", "EMAAR.AE"]

function PctBadge({ value }) {
  if (value == null) return <span style={{ color: C.muted }}>—</span>
  const pos = value >= 0
  return (
    <span style={{ color: pos ? C.green : C.red, fontWeight: 700, fontSize: 13 }}>
      {pos ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  )
}

function IndexRow({ label, region, quote }) {
  const pos = quote?.change_pct >= 0
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 16px", background: C.card2, borderRadius: 8,
      borderLeft: `3px solid ${quote ? (pos ? C.green : C.red) : C.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, background: C.card, padding: "2px 6px", borderRadius: 4, minWidth: 24, textAlign: "center" }}>{region}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: C.muted2 }}>
          {quote?.price != null ? quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
        </span>
        <PctBadge value={quote?.change_pct} />
      </div>
    </div>
  )
}

function NewsCard({ item }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
      display: "flex", gap: 14, textDecoration: "none",
      background: C.card2, borderRadius: 10, padding: 14,
      border: `0.5px solid ${C.border}`, transition: "border-color 0.2s",
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = C.green}
    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      {item.thumbnail && (
        <img src={item.thumbnail} alt="" style={{ width: 80, height: 60, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.4, marginBottom: 6 }}>{item.title}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.muted }}>{item.source}</span>
          {item.ticker && <span style={{ fontSize: 10, fontWeight: 700, color: C.green, background: "rgba(10,124,92,0.1)", padding: "1px 6px", borderRadius: 4 }}>{item.ticker}</span>}
          <span style={{ fontSize: 11, color: C.muted }}>{item.published ? new Date(item.published).toLocaleDateString("en-GB") : ""}</span>
        </div>
      </div>
    </a>
  )
}

export default function Markets() {
  const [markets,     setMarkets]     = useState(null)
  const [news,        setNews]        = useState([])
  const [loadMarkets, setLoadMarkets] = useState(true)
  const [loadNews,    setLoadNews]    = useState(true)
  const [lastUpdate,  setLastUpdate]  = useState(null)
  const [activeTab,   setActiveTab]   = useState("indices")

  const fetchMarkets = async () => {
    setLoadMarkets(true)
    try {
      const res = await axios.get(`${API}/markets`, { timeout: 30000 })
      setMarkets(res.data)
      setLastUpdate(new Date().toLocaleTimeString("en-US"))
    } catch {
      setMarkets(null)
    } finally {
      setLoadMarkets(false)
    }
  }

  const fetchNews = async () => {
    setLoadNews(true)
    try {
      const results = await Promise.all(
        NEWS_TICKERS.slice(0, 3).map(t =>
          axios.get(`${API}/news/${t}`, { timeout: 20000 })
            .then(r => (r.data.news || []).slice(0, 3).map(n => ({ ...n, ticker: t })))
            .catch(() => [])
        )
      )
      const seen = new Set()
      const all = results.flat()
        .filter(n => { if (seen.has(n.url)) return false; seen.add(n.url); return true })
        .sort((a, b) => new Date(b.published) - new Date(a.published))
      setNews(all)
    } catch {
      setNews([])
    } finally {
      setLoadNews(false)
    }
  }

  useEffect(() => {
    fetchMarkets()
    fetchNews()
    const interval = setInterval(fetchMarkets, 60000)
    return () => clearInterval(interval)
  }, [])

  const card = { background: C.card, borderRadius: 12, padding: 20, border: `0.5px solid ${C.border}` }

  // Build index/forex/commodity rows from backend data or show loading
  const indicesData = INDICES.map(i => ({ ...i, quote: markets?.indices?.[i.label] || markets?.indices?.[i.key] || null }))
  const forexData   = FOREX.map(f => ({ ...f, quote: markets?.forex?.[f.label] || markets?.forex?.[f.key] || null }))
  const commData    = COMMODITIES.map(c => ({ ...c, quote: markets?.commodities?.[c.label] || markets?.commodities?.[c.key] || null }))

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 4 }}>Market Pulse</div>
          <div style={{ fontSize: 13, color: C.muted2 }}>
            Global indices, forex, commodities and halal market news
            {lastUpdate && <span style={{ marginLeft: 8, color: C.muted }}>· {lastUpdate}</span>}
          </div>
        </div>
        <button onClick={fetchMarkets} disabled={loadMarkets} style={{
          padding: "8px 18px", borderRadius: 8, border: `1px solid ${C.border}`,
          background: "transparent", color: loadMarkets ? C.muted : C.text,
          fontSize: 12, cursor: loadMarkets ? "not-allowed" : "pointer", fontFamily: "inherit",
        }}>
          {loadMarkets ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[
          { key: "indices",     label: "Indices" },
          { key: "forex",       label: "Forex" },
          { key: "commodities", label: "Commodities" },
          { key: "news",        label: "News Feed" },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
            background: activeTab === t.key ? C.green : C.card,
            color: activeTab === t.key ? "#fff" : C.muted2,
            fontWeight: 600, fontSize: 13, fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Indices */}
      {activeTab === "indices" && (
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Global Stock Indices</div>
          {loadMarkets ? (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading indices...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {indicesData.map(i => <IndexRow key={i.key} {...i} />)}
            </div>
          )}
        </div>
      )}

      {/* Forex */}
      {activeTab === "forex" && (
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Forex Rates</div>
          {loadMarkets ? (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading forex...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {forexData.map(f => <IndexRow key={f.key} label={f.label} region="FX" quote={f.quote} />)}
            </div>
          )}
        </div>
      )}

      {/* Commodities */}
      {activeTab === "commodities" && (
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Commodities</div>
          {loadMarkets ? (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading commodities...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {commData.map(c => <IndexRow key={c.key} label={c.label} region="CMD" quote={c.quote} />)}
            </div>
          )}
        </div>
      )}

      {/* News Feed */}
      {activeTab === "news" && (
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Halal Market News</div>
          {loadNews ? (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading news feed...</div>
          ) : news.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No news available.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {news.map((item, i) => <NewsCard key={i} item={item} />)}
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: C.muted }}>
        Data via Yahoo Finance. Delayed up to 15 min. Not financial advice.
      </div>
    </div>
  )
}
