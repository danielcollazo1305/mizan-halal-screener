import { useState } from "react"
import Portfolio from "./Portfolio"
import Screener from "./screener"
import Baskets from "./Baskets"
import Markets from "./Markets"
import Pricing from "./Pricing"
import Auth from "./Auth"
import Landing from "./Landing"
import TickerTape from "./TickerTape"

export default function App() {
  const [page, setPage] = useState("screener")
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mizan_user")) } catch { return null }
  })
  const [showLanding, setShowLanding] = useState(true)

  const logout = () => {
    localStorage.removeItem("mizan_token")
    localStorage.removeItem("mizan_user")
    setUser(null)
  }

  if (showLanding) return <Landing onGetStarted={() => setShowLanding(false)} />
  if (!user) return <Auth onLogin={setUser} />

  return (
    <div style={{ minHeight: "100vh", background: "#080f0b", color: "#f0f4f1", fontFamily: "sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200 }}>
        <TickerTape />
      </div>

      <div style={{ display: "flex", flex: 1, marginTop: 36 }}>
        {/* Sidebar */}
        <div style={{ width: 200, minHeight: "100vh", background: "#0a0f0c", borderRight: "0.5px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", position: "fixed", top: 36, left: 0, bottom: 0 }}>
          <div style={{ padding: "20px 20px 16px", borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#C9A84C" }}>Mizan</div>
            <div style={{ fontSize: 8, color: "#0A7C5C", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>Islamic Investment Intelligence</div>
          </div>
          <nav style={{ flex: 1, padding: "16px 0", overflowY: "auto" }}>
            {[
              { key: "dashboard", label: "Dashboard" },
              { key: "screener",  label: "Screener" },
              { key: "baskets",   label: "Baskets" },
              { key: "markets",   label: "Market Pulse" },
            ].map(item => (
              <button key={item.key} onClick={() => setPage(item.key)} style={{
                width: "100%", padding: "10px 20px", border: "none",
                background: page === item.key ? "rgba(10,124,92,0.15)" : "transparent",
                color: page === item.key ? "#0A7C5C" : "#7a8a80",
                fontWeight: page === item.key ? 700 : 400,
                fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                borderLeft: page === item.key ? "3px solid #0A7C5C" : "3px solid transparent",
              }}>{item.label}</button>
            ))}
          </nav>
          <div style={{ padding: "16px 20px", borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
            <div style={{ color: "#5a6a60", fontSize: 11, marginBottom: 4 }}>{user.name}</div>
            <button onClick={() => setPage("pricing")} style={{ width: "100%", padding: "6px 0", borderRadius: 6, border: "1px solid #C9A84C44", background: "transparent", color: "#C9A84C", cursor: "pointer", fontSize: 11, fontFamily: "inherit", marginBottom: 6 }}>Upgrade to Pro</button>
            <button onClick={logout} style={{ width: "100%", padding: "6px 0", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#5a6a60", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>Logout</button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ marginLeft: 200, flex: 1, padding: "0" }}>
          {page === "dashboard" && <Portfolio />}
          {page === "screener"  && <Screener />}
          {page === "baskets"   && <Baskets />}
          {page === "markets"   && <Markets />}
          {page === "pricing"   && <Pricing />}
        </div>
      </div>
    </div>
  )
}
