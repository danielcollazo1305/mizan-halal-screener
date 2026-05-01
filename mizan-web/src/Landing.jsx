import { useEffect } from "react";

const COLORS = {
  greenDark:  "#0C1F17",
  greenMid:   "#064E3B",
  greenMain:  "#0A7C5C",
  greenLight: "#D1FAE5",
  goldMain:   "#C9A84C",
  goldLight:  "#E8C97A",
  white:      "#F0FDF4",
  muted:      "#6EE7B7",
};

const s = {
  page: { background: COLORS.greenDark, minHeight: "100vh", color: COLORS.white, fontFamily: "inherit", position: "relative", overflow: "hidden" },
  pattern: { position: "fixed", inset: 0, opacity: 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M40 0 L80 40 L40 80 L0 40Z' fill='none' stroke='%23C9A84C' stroke-width='1'/%3E%3Cpath d='M40 10 L70 40 L40 70 L10 40Z' fill='none' stroke='%23C9A84C' stroke-width='0.5'/%3E%3Cpath d='M0 0 L40 40 M80 0 L40 40 M0 80 L40 40 M80 80 L40 40' stroke='%23C9A84C' stroke-width='0.5'/%3E%3C/svg%3E")`, pointerEvents: "none", zIndex: 0 },
  content: { position: "relative", zIndex: 1 },
  nav: { background: COLORS.greenMid, borderBottom: `1px solid rgba(201,168,76,0.2)`, padding: "0 2rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoWrap: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: { width: 36, height: 36, background: `linear-gradient(135deg, ${COLORS.goldMain}, ${COLORS.goldLight})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  logoEn: { fontSize: 18, fontWeight: 700, color: COLORS.goldMain, letterSpacing: "0.02em", display: "block" },
  logoAr: { fontSize: 11, color: COLORS.muted, letterSpacing: "0.05em", display: "block" },
  navRight: { display: "flex", gap: 8, alignItems: "center" },
  navLink: { background: "transparent", border: "none", color: COLORS.muted, fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "6px 12px", borderRadius: 7, fontFamily: "inherit" },
  btnGold: { background: `linear-gradient(135deg, ${COLORS.goldMain}, ${COLORS.goldLight})`, border: "none", color: COLORS.greenDark, fontSize: 14, fontWeight: 700, padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" },
  hero: { padding: "5rem 2rem 4rem", textAlign: "center", maxWidth: 700, margin: "0 auto" },
  heroBadge: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", color: COLORS.goldMain, fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 20, marginBottom: "1.5rem", letterSpacing: "0.05em" },
  heroH1: { fontSize: 42, fontWeight: 800, lineHeight: 1.15, marginBottom: "1rem", color: COLORS.white },
  heroSpan: { background: `linear-gradient(135deg, ${COLORS.goldMain}, ${COLORS.goldLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  heroP: { fontSize: 16, color: COLORS.muted, lineHeight: 1.7, marginBottom: "2rem" },
  heroBtns: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  btnPrimary: { background: `linear-gradient(135deg, ${COLORS.goldMain}, ${COLORS.goldLight})`, color: COLORS.greenDark, border: "none", padding: "13px 32px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  btnSecondary: { background: "transparent", color: COLORS.white, border: "1px solid rgba(255,255,255,0.2)", padding: "13px 32px", borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  section: { maxWidth: 900, margin: "0 auto", padding: "0 2rem 4rem" },
  sectionTitle: { textAlign: "center", fontSize: 26, fontWeight: 700, marginBottom: 8, color: COLORS.white },
  sectionSub: { textAlign: "center", color: COLORS.muted, fontSize: 14, marginBottom: "2rem" },
  featuresGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 },
  featureCard: { background: COLORS.greenMid, border: "1px solid rgba(201,168,76,0.12)", borderRadius: 14, padding: "20px 18px" },
  featureIcon: { fontSize: 28, marginBottom: 10 },
  featureTitle: { fontSize: 14, fontWeight: 600, marginBottom: 6, color: COLORS.white },
  featureDesc: { fontSize: 12, color: COLORS.muted, lineHeight: 1.6 },
  plans: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 680, margin: "0 auto" },
  plan: { background: COLORS.greenMid, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 24 },
  planPro: { background: `linear-gradient(160deg, #0C3326, ${COLORS.greenMid})`, border: `1px solid ${COLORS.goldMain}`, borderRadius: 14, padding: 24, position: "relative", overflow: "hidden" },
  planBadge: { position: "absolute", top: 14, right: -22, background: COLORS.goldMain, color: COLORS.greenDark, fontSize: 9, fontWeight: 700, padding: "3px 28px", transform: "rotate(35deg)", letterSpacing: "0.05em" },
  planName: { fontSize: 13, fontWeight: 600, color: COLORS.muted, marginBottom: 4 },
  planPrice: { fontSize: 32, fontWeight: 800, marginBottom: 4, color: COLORS.white },
  planPriceGold: { fontSize: 32, fontWeight: 800, marginBottom: 4, color: COLORS.goldMain },
  planPeriod: { fontSize: 12, color: COLORS.muted, marginBottom: 20 },
  planFeature: { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: COLORS.white, padding: "4px 0" },
  planFeatureMuted: { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#475569", padding: "4px 0" },
  checkGold: { color: COLORS.goldMain, flexShrink: 0 },
  cross: { color: "#475569", flexShrink: 0 },
  planBtnFree: { width: "100%", marginTop: 20, padding: 11, borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.07)", color: COLORS.white, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  planBtnGold: { width: "100%", marginTop: 20, padding: 11, borderRadius: 9, border: "none", background: `linear-gradient(135deg, ${COLORS.goldMain}, ${COLORS.goldLight})`, color: COLORS.greenDark, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  zakatBox: { background: `linear-gradient(135deg, ${COLORS.greenMid}, #0C3326)`, border: "1px solid rgba(201,168,76,0.3)", borderRadius: 16, padding: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" },
  zakatTitle: { fontSize: 20, fontWeight: 700, marginBottom: 8, color: COLORS.white },
  zakatDesc: { fontSize: 13, color: COLORS.muted, lineHeight: 1.6 },
  zakatCalc: { background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 16 },
  zakatRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  ctaBox: { background: `linear-gradient(135deg, ${COLORS.greenMid}, #0C3326)`, border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 16, padding: "3rem 2rem", textAlign: "center", maxWidth: 600, margin: "0 auto 4rem" },
  footer: { background: COLORS.greenMid, borderTop: "1px solid rgba(201,168,76,0.15)", padding: "20px 2rem", textAlign: "center", fontSize: 12, color: COLORS.muted },
};

const features = [
  { icon: "⚖️", title: "Halal Screening", desc: "Screens thousands of stocks for Shariah compliance — business activity, debt ratio, interest income." },
  { icon: "📊", title: "Fair Value Analysis", desc: "DCF + Graham formula weighted by sector. Know if a halal stock is actually worth buying." },
  { icon: "💼", title: "Portfolio Tracker", desc: "Track your halal portfolio with real-time compliance monitoring and performance analysis." },
  { icon: "🕌", title: "Zakat Calculator", desc: "Automatically calculates your Zakat obligation based on your portfolio. Export the full report." },
  { icon: "🔔", title: "Compliance Alerts", desc: "Get notified when a stock in your watchlist changes compliance status." },
  { icon: "📈", title: "Monthly Picks", desc: "Curated halal stock recommendations updated monthly with fundamental analysis." },
];

export default function Landing({ onGetStarted }) {
  return (
    <div style={s.page}>
      <div style={s.pattern} />
      <div style={s.content}>

        {/* Navbar */}
        <nav style={s.nav}>
          <div style={s.logoWrap}>
            <div style={s.logoIcon}>⚖️</div>
            <div>
              <span style={s.logoEn}>Mizan</span>
              <span style={s.logoAr}>ميزان · Halal Investing</span>
            </div>
          </div>
          <div style={s.navRight}>
            <button style={s.navLink}>Features</button>
            <button style={s.navLink}>Pricing</button>
            <button style={{ ...s.navLink, color: COLORS.white }} onClick={onGetStarted}>Login</button>
            <button style={s.btnGold} onClick={onGetStarted}>Get Started Free →</button>
          </div>
        </nav>

        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroBadge}>✦ Halal Investing · Fair Value Analysis</div>
          <h1 style={s.heroH1}>
            Know what's halal.<br />
            <span style={s.heroSpan}>Know what's worth buying.</span>
          </h1>
          <p style={s.heroP}>
            Mizan screens thousands of stocks for Shariah compliance and calculates their true fair value using DCF + Graham models — weighted by sector. Free forever. Pro when you're ready.
          </p>
          <div style={s.heroBtns}>
            <button style={s.btnPrimary} onClick={onGetStarted}>Start for Free →</button>
            <button style={s.btnSecondary}>See how it works</button>
          </div>
        </div>

        {/* Features */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Everything you need for halal investing</div>
          <div style={s.sectionSub}>Built for Muslim investors who want more than just compliance</div>
          <div style={s.featuresGrid}>
            {features.map((f, i) => (
              <div key={i} style={s.featureCard}>
                <div style={s.featureIcon}>{f.icon}</div>
                <div style={s.featureTitle}>{f.title}</div>
                <div style={s.featureDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Zakat */}
        <div style={s.section}>
          <div style={s.zakatBox}>
            <div>
              <div style={s.zakatTitle}>🕌 Zakat Calculator</div>
              <div style={s.zakatDesc}>
                Automatically calculates your Zakat obligation based on your halal portfolio. 2.5% on eligible assets above the nisab threshold. Export the full report in PDF.
              </div>
            </div>
            <div style={s.zakatCalc}>
              {[
                ["Portfolio value", "$24,850.00"],
                ["Nisab threshold", "$5,200.00"],
                ["Eligible assets", "$19,650.00"],
                ["Zakat rate", "2.5%"],
              ].map(([label, val]) => (
                <div key={label} style={s.zakatRow}>
                  <span style={{ color: COLORS.muted }}>{label}</span>
                  <span style={{ fontWeight: 600, color: COLORS.white }}>{val}</span>
                </div>
              ))}
              <div style={{ ...s.zakatRow, borderBottom: "none" }}>
                <span style={{ color: COLORS.muted }}>Zakat due</span>
                <span style={{ fontWeight: 700, color: COLORS.goldMain, fontSize: 15 }}>$491.25</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div style={{ ...s.section, maxWidth: 720 }}>
          <div style={s.sectionTitle}>Simple, honest pricing</div>
          <div style={s.sectionSub}>Screening is free forever. Pay only for deep analysis.</div>
          <div style={s.plans}>
            <div style={s.plan}>
              <div style={s.planName}>FREE</div>
              <div style={s.planPrice}>$0</div>
              <div style={s.planPeriod}>forever · no credit card</div>
              {["Halal/Haram screening", "Zakat calculator", "Watchlist (5 stocks)", "Compliance alerts", "Halal alternatives"].map(f => (
                <div key={f} style={s.planFeature}><span style={s.checkGold}>✦</span>{f}</div>
              ))}
              {["Fair Value DCF + Graham", "Portfolio tracker", "Monthly picks", "Export PDF/Excel"].map(f => (
                <div key={f} style={s.planFeatureMuted}><span style={s.cross}>✗</span>{f}</div>
              ))}
              <button style={s.planBtnFree} onClick={onGetStarted}>Get Started Free</button>
            </div>
            <div style={s.planPro}>
              <div style={s.planBadge}>MOST POPULAR</div>
              <div style={s.planName}>PRO</div>
              <div style={s.planPriceGold}>$9.99</div>
              <div style={s.planPeriod}>per month · $79/year (save 34%)</div>
              {["Everything in Free", "Fair Value DCF + Graham", "Full fundamental analysis", "Portfolio tracker", "Monthly halal picks", "Halal baskets", "Export PDF + Excel", "Unlimited watchlist"].map(f => (
                <div key={f} style={s.planFeature}><span style={s.checkGold}>✦</span>{f}</div>
              ))}
              <button style={s.planBtnGold} onClick={onGetStarted}>Start Pro Trial →</button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={s.section}>
          <div style={s.ctaBox}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚖️</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              Balance your faith.<br />
              <span style={{ color: COLORS.goldMain }}>Balance your wealth.</span>
            </div>
            <p style={{ fontSize: 14, color: COLORS.muted, marginBottom: 24, lineHeight: 1.6 }}>
              Join thousands of Muslim investors making informed, Shariah-compliant investment decisions.
            </p>
            <button style={s.btnPrimary} onClick={onGetStarted}>Get Started for Free →</button>
          </div>
        </div>

        {/* Footer */}
        <footer style={s.footer}>
          <span style={{ color: COLORS.goldMain }}>⚖️ Mizan · ميزان</span> · Halal Stock Screener · Balance your faith. Balance your wealth.
          <br />
          <span style={{ color: "#475569", marginTop: 4, display: "block" }}>
            Not financial advice. Always do your own research. · {new Date().getFullYear()}
          </span>
        </footer>

      </div>
    </div>
  );
}