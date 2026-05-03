import { useState, useEffect } from "react"
import axios from "axios"

const API = "https://web-production-b5851.up.railway.app"

const STATUS_COLOR = {
  HALAL: "#22c55e",
  QUESTIONABLE: "#f59e0b",
  HARAM: "#ef4444",
}

export default function Baskets() {
  const [baskets, setBaskets] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    axios.get(`${API}/baskets`)
      .then(res => setBaskets(res.data.baskets || []))
      .catch(() => setBaskets([]))
      .finally(() => setLoading(false))
  }, [])

  const openBasket = async (basket) => {
    setSelected(basket)
    setDetail(null)
    setLoadingDetail(true)
    try {
      const res = await axios.get(`${API}/baskets/${basket.id}`, { timeout: 60000 })
      setDetail(res.data)
    } catch {
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 22, color: "#f1f5f9" }}>
          🧺 Halal Baskets
        </h2>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
          Curated collections of halal stocks by theme — ready to invest.
        </p>
      </div>

      {/* Basket Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
          ⏳ Loading baskets...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
          {baskets.map(basket => (
            <div
              key={basket.id}
              onClick={() => openBasket(basket)}
              style={{
                background: selected?.id === basket.id ? "#1e3a2e" : "#1e293b",
                borderRadius: 12, padding: "18px 20px",
                cursor: "pointer",
                border: selected?.id === basket.id ? "1px solid #0A7C5C" : "1px solid transparent",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{basket.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9", marginBottom: 4 }}>
                {basket.name}
              </div>
              <div style={{ color: "#64748b", fontSize: 12, marginBottom: 12 }}>
                {basket.description}
              </div>
              <div style={{ color: "#0A7C5C", fontSize: 12, fontWeight: 600 }}>
                {basket.ticker_count} stocks →
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Basket Detail */}
      {selected && (
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 28 }}>{selected.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#f1f5f9" }}>{selected.name}</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>{selected.description}</div>
            </div>
          </div>

          {loadingDetail ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              ⏳ Analysing {selected.ticker_count} stocks... this may take up to 30 seconds.
            </div>
          ) : detail ? (
            <>
              {/* Summary */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, background: "#0f172a", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>{detail.halal_count}</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>Halal stocks</div>
                </div>
                <div style={{ flex: 1, background: "#0f172a", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>{detail.total}</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>Total stocks</div>
                </div>
                <div style={{ flex: 1, background: "#0f172a", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#C9A84C" }}>
                    {Math.round((detail.halal_count / detail.total) * 100)}%
                  </div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>Halal rate</div>
                </div>
              </div>

              {/* Stock list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {detail.stocks.map((stock, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "#0f172a", borderRadius: 8, padding: "12px 16px",
                    borderLeft: `3px solid ${STATUS_COLOR[stock.status] || "#475569"}`
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div>
                        <span style={{ fontWeight: 700, color: "#f1f5f9" }}>{stock.ticker}</span>
                        <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>{stock.name}</span>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: `${STATUS_COLOR[stock.status]}22`,
                        color: STATUS_COLOR[stock.status]
                      }}>
                        {stock.status}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#f1f5f9", fontWeight: 600 }}>
                        {stock.price ? `$${stock.price.toFixed(2)}` : "N/A"}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        Grade: {stock.grade} · Score: {stock.score}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              Failed to load basket detail. Try again.
            </div>
          )}
        </div>
      )}
    </div>
  )
}