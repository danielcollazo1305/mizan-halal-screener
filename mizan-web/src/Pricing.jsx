const FEATURES_FREE = [
  "Halal screener — unlimited searches",
  "Compliance alerts",
  "Halal alternatives",
  "Halal baskets",
  "Zakat calculator",
  "Watchlist — up to 5 stocks",
  "Price alerts",
]

const FEATURES_PRO = [
  "Everything in Free",
  "Fair Value analysis (DCF + Graham)",
  "Fundamental analysis",
  "Portfolio tracker — unlimited stocks",
  "Monthly recommendations",
  "International benchmarks",
  "Export PDF & Excel",
  "Watchlist — unlimited stocks",
  "Priority support",
]

export default function Pricing({ user, onUpgrade }) {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h2 style={{ margin: 0, fontSize: 28, color: "#f1f5f9" }}>Simple, honest pricing</h2>
        <p style={{ color: "#64748b", fontSize: 15, marginTop: 10 }}>Start free. Upgrade when you're ready.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 32, border: "1px solid #334155" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, letterSpacing: 2, marginBottom: 8 }}>FREE</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: "#f1f5f9" }}>$0</div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Forever free</div>
          </div>
          <div style={{ marginBottom: 28 }}>
            {FEATURES_FREE.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ color: "#22c55e", fontSize: 14 }}>✓</span>
                <span style={{ color: "#94a3b8", fontSize: 14 }}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "#0f172a", borderRadius: 8, padding: "12px 20px", textAlign: "center", color: "#64748b", fontSize: 14, fontWeight: 600 }}>
            Current plan
          </div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #0C1F17 0%, #064E3B 100%)", borderRadius: 16, padding: 32, border: "2px solid #C9A84C", position: "relative" }}>
          <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#C9A84C", color: "#0C1F17", fontSize: 11, fontWeight: 800, padding: "4px 16px", borderRadius: 20, letterSpacing: 1 }}>
            MOST POPULAR
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: "#C9A84C", fontWeight: 600, letterSpacing: 2, marginBottom: 8 }}>PRO</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: "#f1f5f9" }}>$9.99</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>/month</div>
            </div>
            <div style={{ color: "#C9A84C", fontSize: 13, marginTop: 4 }}>or $79.99/year — save 33% 🎉</div>
          </div>
          <div style={{ marginBottom: 28 }}>
            {FEATURES_PRO.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ color: "#C9A84C", fontSize: 14 }}>✓</span>
                <span style={{ color: "#e2e8f0", fontSize: 14 }}>{f}</span>
              </div>
            ))}
          </div>
          <button onClick={() => onUpgrade && onUpgrade("monthly")} style={{ width: "100%", padding: "14px 20px", borderRadius: 10, background: "#C9A84C", color: "#0C1F17", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer", marginBottom: 10 }}>
            Upgrade to Pro — $9.99/mo
          </button>
          <button onClick={() => onUpgrade && onUpgrade("yearly")} style={{ width: "100%", padding: "12px 20px", borderRadius: 10, background: "transparent", color: "#C9A84C", fontWeight: 600, fontSize: 13, border: "1px solid #C9A84C", cursor: "pointer" }}>
            Get annual plan — $79.99/year
          </button>
        </div>
      </div>
      <p style={{ textAlign: "center", color: "#334155", fontSize: 12, marginTop: 32 }}>
        Payments processed securely by Stripe. Cancel anytime. No hidden fees.
      </p>
    </div>
  )
}