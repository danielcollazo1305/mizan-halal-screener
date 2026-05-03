const ALTERNATIVES = {
  "V":    [{ ticker: "AAPL", name: "Apple Inc", reason: "Apple Pay — tech payments, no interest income", grade: "A" }],
  "MA":   [{ ticker: "AAPL", name: "Apple Inc", reason: "Apple Pay — tech payments, no interest income", grade: "A" }],
  "PYPL": [{ ticker: "AAPL", name: "Apple Inc", reason: "Apple Pay — tech payments, no interest income", grade: "A" }],
  "JPM":  [{ ticker: "MSFT", name: "Microsoft", reason: "Tech, no interest-based revenue", grade: "A" }],
  "BAC":  [{ ticker: "NVDA", name: "NVIDIA", reason: "Semiconductors, no haram activities", grade: "A" }],
  "GS":   [{ ticker: "AAPL", name: "Apple Inc", reason: "Tech, no interest-based revenue", grade: "A" }],
  "MO":   [{ ticker: "COST", name: "Costco", reason: "Retail, halal consumer goods", grade: "B+" }],
  "PM":   [{ ticker: "WMT",  name: "Walmart", reason: "Retail, halal consumer goods", grade: "B+" }],
  "BUD":  [{ ticker: "PEP",  name: "PepsiCo", reason: "Beverages without alcohol", grade: "B+" }],
  "LVS":  [{ ticker: "ABNB", name: "Airbnb", reason: "Halal hospitality and travel", grade: "B" }],
  "MGM":  [{ ticker: "ABNB", name: "Airbnb", reason: "Halal hospitality and travel", grade: "B" }],
  "LMT":  [{ ticker: "HON",  name: "Honeywell", reason: "Industrial tech, minimal weapons exposure", grade: "B+" }],
  "RTX":  [{ ticker: "HON",  name: "Honeywell", reason: "Industrial tech, minimal weapons exposure", grade: "B+" }],
}

export default function HalalAlternatives({ ticker }) {
  const alts = ALTERNATIVES[ticker] || []
  if (alts.length === 0) return null

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>🌿</span>
        <div>
          <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>Halal Alternatives to {ticker}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>{alts.length} curated option{alts.length !== 1 ? "s" : ""} — verified halal</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {alts.map((alt, i) => (
          <div key={i} style={{ background: "#1e293b", borderRadius: 10, padding: "14px 18px", borderLeft: "3px solid #0A7C5C" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#f1f5f9" }}>{alt.ticker}</span>
              <span style={{ background: "#064E3B", color: "#22c55e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>✅ HALAL</span>
              <span style={{ background: "#0f172a", color: "#22c55e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{alt.grade}</span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 3 }}>{alt.name}</div>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>💡 {alt.reason}</div>
          </div>
        ))}
      </div>
    </div>
  )
}