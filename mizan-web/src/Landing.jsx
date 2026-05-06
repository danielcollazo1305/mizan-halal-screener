const FEATURES = [
  { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A7C5C" stroke-width="1.5" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`, title: "Halal Screening", desc: "Thousands of stocks screened for Shariah compliance — sector, debt ratio, interest income." },
  { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A7C5C" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`, title: "Fair Value Analysis", desc: "DCF + Graham formula weighted by sector. Know if a halal stock is actually worth buying." },
  { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A7C5C" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`, title: "Portfolio Tracker", desc: "Track your halal portfolio with real-time compliance monitoring and performance analysis." },
  { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A7C5C" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`, title: "Zakat Calculator", desc: "Automatically calculates your Zakat obligation based on your portfolio. Export PDF." },
  { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A7C5C" stroke-width="1.5" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`, title: "Compliance Alerts", desc: "Get notified when a stock in your watchlist changes halal status automatically." },
  { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A7C5C" stroke-width="1.5" stroke-linecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`, title: "Monthly Picks", desc: "Curated halal stock recommendations updated monthly with fundamental analysis." },
  { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A7C5C" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`, title: "Global Markets", desc: "Real-time indices, forex and commodities — S&P 500, FTSE, DAX, Gold, Oil and more." },
  { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A7C5C" stroke-width="1.5" stroke-linecap="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4"/><path d="M2 13h10"/><path d="M9 18H2"/><path d="M2 9h3"/></svg>`, title: "News per Ticker", desc: "Latest news for any stock directly in the screener. Stay informed instantly." },
  { icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A7C5C" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`, title: "Halal Baskets", desc: "Curated themed collections — Top Tech Halal, Healthcare, Dividends and more." },
]

const FREE_FEATURES = [
  "Halal screener — unlimited searches",
  "Compliance alerts",
  "Halal alternatives",
  "Halal baskets",
  "Zakat calculator",
  "Watchlist — up to 5 stocks",
  "Global markets dashboard",
]

const PRO_FEATURES = [
  "Everything in Free",
  "Fair Value analysis (DCF + Graham)",
  "Fundamental analysis",
  "Portfolio tracker — unlimited",
  "Monthly recommendations",
  "Export PDF & Excel",
  "Unlimited watchlist",
  "Priority support",
]

function MizanLogo({ size = 36 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width={size} height={size}>
      <defs>
        <radialGradient id="bgGradL" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{stopColor:"#0C3020",stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:"#0C1F17",stopOpacity:1}} />
        </radialGradient>
        <filter id="glowL">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="200" cy="200" r="200" fill="url(#bgGradL)"/>
      <circle cx="200" cy="200" r="172" fill="none" stroke="#C9A84C" strokeWidth="1" strokeDasharray="4 6" opacity="0.35"/>
      <line x1="200" y1="122" x2="200" y2="265" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round" filter="url(#glowL)"/>
      <rect x="172" y="263" width="56" height="6" rx="3" fill="#C9A84C"/>
      <circle cx="200" cy="122" r="6" fill="#E8C97A"/>
      <line x1="105" y1="152" x2="295" y2="146" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="116" y1="154" x2="116" y2="192" stroke="#C9A84C" strokeWidth="1.5" strokeDasharray="2.5 3" opacity="0.75"/>
      <line x1="284" y1="148" x2="284" y2="186" stroke="#C9A84C" strokeWidth="1.5" strokeDasharray="2.5 3" opacity="0.75"/>
      <path d="M93 194 Q116 208 139 194" stroke="#C9A84C" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M261 188 Q284 202 307 188" stroke="#C9A84C" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <g transform="translate(292, 104) rotate(25)">
        <circle cx="0" cy="0" r="17" fill="#C9A84C" opacity="0.95"/>
        <circle cx="9" cy="-5" r="13.5" fill="#0C1F17"/>
      </g>
      <polygon transform="translate(319, 90)" points="0,-6 1.8,-1.8 6,-1.8 3,1.2 4.2,5.4 0,3 -4.2,5.4 -3,1.2 -6,-1.8 -1.8,-1.8" fill="#E8C97A" opacity="0.95"/>
    </svg>
  )
}

export default function Landing({ onGetStarted }) {
  return (
    <div style={{ background: "#080f0b", minHeight: "100vh", color: "#f0f4f1", fontFamily: "inherit" }}>

      {/* ── Nav ── */}
      <nav style={{
        background: "#0a0f0c",
        borderBottom: "0.5px solid rgba(255,255,255,0.07)",
        padding: "0 32px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MizanLogo size={56} />
          <div style={{ marginLeft: -4 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#C9A84C", letterSpacing: "0.02em" }}>Mizan</div>
            <div style={{ fontSize: 11, color: "#5a6a60", letterSpacing: "0.05em" }}>Islamic Investment Intelligence</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button style={{ background: "transparent", border: "none", color: "#7a8a80", fontSize: 12, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}>Features</button>
          <button style={{ background: "transparent", border: "none", color: "#7a8a80", fontSize: 12, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}>Pricing</button>
          <button onClick={onGetStarted} style={{ background: "transparent", border: "none", color: "#d1d8d3", fontSize: 12, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}>Login</button>
          <button onClick={onGetStarted} style={{ background: "#0A7C5C", border: "none", color: "#fff", fontSize: 12, fontWeight: 500, padding: "7px 18px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>
            Get started free
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ padding: "72px 24px 56px", textAlign: "center", background: "#080f0b" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(10,124,92,0.1)", border: "0.5px solid rgba(10,124,92,0.25)",
          color: "#0A7C5C", fontSize: 11, fontWeight: 500, padding: "4px 14px",
          borderRadius: 20, marginBottom: 28, letterSpacing: "0.05em"
        }}>
          Halal investing · Fair value analysis · Islamic finance
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 500, color: "#f0f4f1", lineHeight: 1.2, margin: "0 0 14px", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          Know what's halal.<br />
          <span style={{ color: "#C9A84C" }}>Know what's worth buying.</span>
        </h1>
        <p style={{ fontSize: 14, color: "#7a8a80", lineHeight: 1.8, maxWidth: 440, margin: "0 auto 32px" }}>
          Mizan screens thousands of stocks for Shariah compliance and calculates their true fair value using DCF + Graham models — weighted by sector. Free forever. Pro when you're ready.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onGetStarted} style={{ background: "#0A7C5C", border: "none", color: "#fff", padding: "12px 32px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            Start for free →
          </button>
          <button style={{ background: "transparent", color: "#7a8a80", border: "0.5px solid rgba(255,255,255,0.12)", padding: "12px 32px", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            See how it works
          </button>
        </div>
      </div>

      {/* ── Ticker preview ── */}
      <div style={{ background: "#0a0f0c", borderTop: "0.5px solid rgba(255,255,255,0.05)", borderBottom: "0.5px solid rgba(255,255,255,0.05)", padding: "10px 24px", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 0, whiteSpace: "nowrap" }}>
          {[["S&P 500", "+0.3%", true], ["NASDAQ", "+0.5%", true], ["FTSE 100", "-0.1%", false], ["Gold", "+0.8%", true], ["Oil (WTI)", "-0.4%", false], ["USD/SAR", "3.75", true], ["Tadawul", "+1.2%", true]].map(([name, val, up]) => (
            <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 20px", borderRight: "0.5px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: 11, color: "#5a6a60" }}>{name}</span>
              <span style={{ fontSize: 11, color: up ? "#10b981" : "#ef4444", fontWeight: 600 }}>{val}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ background: "#0c120e", padding: "56px 24px", borderTop: "0.5px solid rgba(255,255,255,0.04)" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 20, fontWeight: 500, color: "#e8ede9", marginBottom: 8 }}>Everything you need for halal investing</div>
          <div style={{ fontSize: 13, color: "#5a6a60" }}>Built for Muslim investors who want more than just compliance</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 720, margin: "0 auto" }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: "#111a13", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "18px 16px" }}>
              <div style={{ marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: f.icon }} />
              <div style={{ fontSize: 13, fontWeight: 500, color: "#e8ede9", marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: "#5a6a60", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Zakat ── */}
      <div style={{ background: "#080f0b", padding: "56px 24px", borderTop: "0.5px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#0A7C5C", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12 }}>BUILT-IN</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: "#e8ede9", marginBottom: 12 }}>Zakat Calculator</div>
            <p style={{ fontSize: 13, color: "#7a8a80", lineHeight: 1.8, margin: 0 }}>
              Automatically calculates your Zakat obligation based on your halal portfolio. 2.5% on eligible assets above the nisab threshold. Export the full report in PDF.
            </p>
          </div>
          <div style={{ background: "#0c120e", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20 }}>
            {[["Portfolio value", "$24,850.00", false], ["Nisab threshold", "$5,200.00", false], ["Eligible assets", "$19,650.00", false], ["Zakat rate", "2.5%", false], ["Zakat due", "$491.25", true]].map(([label, val, gold]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: gold ? "none" : "0.5px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 12, color: "#5a6a60" }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: gold ? "#C9A84C" : "#e8ede9" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pricing ── */}
      <div style={{ background: "#0c120e", padding: "56px 24px", borderTop: "0.5px solid rgba(255,255,255,0.04)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 20, fontWeight: 500, color: "#e8ede9", marginBottom: 8 }}>Simple, honest pricing</div>
          <div style={{ fontSize: 13, color: "#5a6a60" }}>Screening is free forever. Pay only for deep analysis.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 540, margin: "0 auto" }}>
          <div style={{ background: "#0a0f0c", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 11, color: "#5a6a60", letterSpacing: "0.08em", marginBottom: 6 }}>FREE</div>
            <div style={{ fontSize: 32, fontWeight: 500, color: "#e8ede9", marginBottom: 2 }}>$0</div>
            <div style={{ fontSize: 11, color: "#3a4a40", marginBottom: 20 }}>forever · no credit card</div>
            {FREE_FEATURES.map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#7a8a80", padding: "3px 0" }}>
                <span style={{ color: "#0A7C5C", fontSize: 10 }}>✓</span>{f}
              </div>
            ))}
            <button onClick={onGetStarted} style={{ width: "100%", marginTop: 20, padding: "10px", borderRadius: 8, border: "0.5px solid rgba(255,255,255,0.1)", background: "transparent", color: "#7a8a80", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Get started free
            </button>
          </div>
          <div style={{ background: "#0a0f0c", border: "1px solid #C9A84C", borderRadius: 14, padding: 24, position: "relative" }}>
            <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#C9A84C", color: "#080f0b", fontSize: 9, fontWeight: 600, padding: "2px 12px", borderRadius: 10, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
              MOST POPULAR
            </div>
            <div style={{ fontSize: 11, color: "#C9A84C", letterSpacing: "0.08em", marginBottom: 6 }}>PRO</div>
            <div style={{ fontSize: 32, fontWeight: 500, color: "#C9A84C", marginBottom: 2 }}>$9.99</div>
            <div style={{ fontSize: 11, color: "#3a4a40", marginBottom: 20 }}>per month · $79/year</div>
            {PRO_FEATURES.map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#7a8a80", padding: "3px 0" }}>
                <span style={{ color: "#C9A84C", fontSize: 10 }}>✓</span>{f}
              </div>
            ))}
            <button onClick={onGetStarted} style={{ width: "100%", marginTop: 20, padding: "10px", borderRadius: 8, border: "none", background: "#C9A84C", color: "#080f0b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Start Pro trial →
            </button>
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ background: "#080f0b", padding: "56px 24px", borderTop: "0.5px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <MizanLogo size={60} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, color: "#e8ede9", marginBottom: 6 }}>Balance your faith.</div>
          <div style={{ fontSize: 28, fontWeight: 500, color: "#C9A84C", marginBottom: 16 }}>Balance your wealth.</div>
          <p style={{ fontSize: 13, color: "#5a6a60", marginBottom: 28, lineHeight: 1.8 }}>
            Join thousands of Muslim investors making informed, Shariah-compliant investment decisions with Mizan.
          </p>
          <button onClick={onGetStarted} style={{ background: "#0A7C5C", border: "none", color: "#fff", padding: "12px 36px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            Get started for free →
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ background: "#0a0f0c", borderTop: "0.5px solid rgba(255,255,255,0.05)", padding: "20px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <MizanLogo size={32} />
          <span style={{ fontSize: 12, color: "#C9A84C", fontWeight: 500 }}>Mizan</span>
          <span style={{ fontSize: 12, color: "#3a4a40" }}>· Islamic Investment Intelligence · Balance your faith. Balance your wealth.</span>
        </div>
        <div style={{ fontSize: 11, color: "#2a3a30" }}>
          Not financial advice. Always do your own research. · {new Date().getFullYear()}
        </div>
      </footer>

    </div>
  )
}
