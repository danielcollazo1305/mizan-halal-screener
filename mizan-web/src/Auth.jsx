import { useState } from "react"
import axios from "axios"

const API = "https://web-production-b5851.up.railway.app"

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const submit = async () => {
    setError("")
    if (!email || !password) { setError("Email and password are required."); return }
    if (mode === "register" && !name) { setError("Name is required."); return }

    setLoading(true)
    try {
      const url = mode === "login" ? `${API}/auth/login` : `${API}/auth/register`
      const body = mode === "login" ? { email, password } : { name, email, password }
      const res = await axios.post(url, body)
      localStorage.setItem("mizan_token", res.data.token)
      localStorage.setItem("mizan_user", JSON.stringify(res.data.user))
      onLogin(res.data.user)
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 8,
    border: "1px solid #334155", background: "#1e293b",
    color: "#f1f5f9", fontSize: 15, boxSizing: "border-box",
  }

  const btnStyle = {
    width: "100%", padding: "13px", borderRadius: 8,
    background: "#22c55e", color: "#fff", border: "none",
    fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.7 : 1, marginTop: 8,
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0f172a", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#1e293b", borderRadius: 16, padding: "40px 36px",
        width: "100%", maxWidth: 420, boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🕌</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>Mizan</div>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Halal Stock Screener</div>
        </div>

        <div style={{ display: "flex", background: "#0f172a", borderRadius: 10, padding: 4, marginBottom: 28 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError("") }} style={{
              flex: 1, padding: "9px", borderRadius: 8, border: "none",
              background: mode === m ? "#22c55e" : "transparent",
              color: mode === m ? "#fff" : "#94a3b8",
              fontWeight: 600, cursor: "pointer", fontSize: 14,
            }}>
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <input style={inputStyle} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
          )}
          <input style={inputStyle} placeholder="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
          <input style={inputStyle} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />

          {error && (
            <div style={{ background: "#450a0a", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button style={btnStyle} onClick={submit} disabled={loading}>
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <p style={{ textAlign: "center", color: "#475569", fontSize: 12, marginTop: 24, marginBottom: 0 }}>
          📊 Screen stocks for halal compliance using AAOIFI standards.
        </p>
      </div>
    </div>
  )
}