import { useState, useEffect } from "react";
import axios from "axios";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

const API = "https://web-production-b5851.up.railway.app";

function getUser() {
  try { return JSON.parse(localStorage.getItem("mizan_user")); }
  catch { return null; }
}

function getToken() {
  const u = getUser();
  return u?.token || u?.access_token || "";
}

const headers = () => ({ Authorization: `Bearer ${getToken()}` });

const fmt = (n) =>
  n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const pct = (n) =>
  n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

export default function Dashboard() {
  const user = getUser();
  const userId = user?.id || 1;

  const [portfolio, setPortfolio]           = useState([]);
  const [evolution, setEvolution]           = useState([]);
  const [watchlist, setWatchlist]           = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/portfolio/${userId}`, { headers: headers() }),
      axios.get(`${API}/portfolio/${userId}/evolution`, { headers: headers() }),
      axios.get(`${API}/watchlist`, { headers: headers() }),
      axios.get(`${API}/recommendations`, { headers: headers() }),
    ])
      .then(([p, e, w, r]) => {
        setPortfolio(p.data || []);
        setEvolution(e.data || []);
        setWatchlist((w.data || []).slice(0, 4));
        setRecommendations((r.data || []).slice(0, 3));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Métricas do portfólio
  const totalValue  = portfolio.reduce((s, a) => s + (a.current_value || 0), 0);
  const totalCost   = portfolio.reduce((s, a) => s + (a.total_cost   || 0), 0);
  const totalGain   = totalValue - totalCost;
  const gainPct     = totalCost > 0 ? (totalGain / totalCost) * 100 : null;
  const halalCount  = portfolio.filter(a => a.halal_status === "halal").length;

  if (loading) return (
    <div style={s.page}>
      <p style={{ color: "#888", fontSize: 14 }}>Carregando dashboard...</p>
    </div>
  );

  return (
    <div style={s.page}>

      {/* Cabeçalho */}
      <div style={s.pageHeader}>
        <div>
          <p style={s.greeting}>Minha carteira</p>
          <p style={s.totalValue}>{fmt(totalValue)}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ ...s.gainBadge, color: gainPct >= 0 ? "#3B6D11" : "#A32D2D",
                      background: gainPct >= 0 ? "#EAF3DE" : "#FCEBEB" }}>
            {pct(gainPct)}
          </p>
          <p style={s.subText}>{halalCount}/{portfolio.length} ativos halal</p>
        </div>
      </div>

      {/* Cards de métricas */}
      <div style={s.metricGrid}>
        <MetricCard label="Custo total"      value={fmt(totalCost)} />
        <MetricCard label="Ganho / perda"    value={fmt(totalGain)}
          valueColor={totalGain >= 0 ? "#3B6D11" : "#A32D2D"} />
        <MetricCard label="Ativos"           value={portfolio.length} />
        <MetricCard label="Ativos halal"     value={halalCount} />
      </div>

      {/* Gráfico de evolução */}
      {evolution.length > 0 && (
        <Section title="Evolução do portfólio">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={evolution} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#185FA5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#185FA5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} labelStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="total_value" stroke="#185FA5"
                strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* Portfólio — ativos */}
      {portfolio.length > 0 && (
        <Section title="Meus ativos">
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Ticker","Status","Preço atual","Valor","Ganho %"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolio.map((a, i) => {
                  const g = a.total_cost > 0
                    ? ((a.current_value - a.total_cost) / a.total_cost) * 100
                    : null;
                  return (
                    <tr key={i} style={s.tr}>
                      <td style={{ ...s.td, fontWeight: 500 }}>{a.ticker}</td>
                      <td style={s.td}>
                        <span style={{
                          ...s.pill,
                          color: a.halal_status === "halal" ? "#3B6D11" : "#854F0B",
                          background: a.halal_status === "halal" ? "#EAF3DE" : "#FAEEDA",
                        }}>{a.halal_status || "—"}</span>
                      </td>
                      <td style={s.td}>{fmt(a.current_price)}</td>
                      <td style={s.td}>{fmt(a.current_value)}</td>
                      <td style={{ ...s.td, color: g >= 0 ? "#3B6D11" : "#A32D2D" }}>
                        {pct(g)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Recomendações */}
      {recommendations.length > 0 && (
        <Section title="Top recomendações halal">
          <div style={s.cardGrid}>
            {recommendations.map((r, i) => (
              <div key={i} style={s.recCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <p style={s.recTicker}>{r.ticker}</p>
                  <span style={{ ...s.pill, color: "#3B6D11", background: "#EAF3DE" }}>halal</span>
                </div>
                <p style={s.recName}>{r.name || r.company_name || ""}</p>
                {r.upside_pct != null && (
                  <p style={{ fontSize: 13, color: r.upside_pct > 0 ? "#3B6D11" : "#A32D2D", marginTop: 6 }}>
                    Upside: {pct(r.upside_pct)}
                  </p>
                )}
                {r.fair_value != null && (
                  <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    Fair value: {fmt(r.fair_value)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <Section title="Watchlist">
          <div style={s.cardGrid}>
            {watchlist.map((w, i) => (
              <div key={i} style={s.recCard}>
                <p style={s.recTicker}>{w.ticker}</p>
                <p style={s.recName}>{w.name || ""}</p>
                {w.current_price != null && (
                  <p style={{ fontSize: 13, marginTop: 6 }}>{fmt(w.current_price)}</p>
                )}
                {w.halal_status && (
                  <span style={{
                    ...s.pill, marginTop: 6, display: "inline-block",
                    color: w.halal_status === "halal" ? "#3B6D11" : "#854F0B",
                    background: w.halal_status === "halal" ? "#EAF3DE" : "#FAEEDA",
                  }}>{w.halal_status}</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: "#555", marginBottom: 10 }}>{title}</p>
      {children}
    </div>
  );
}

function MetricCard({ label, value, valueColor = "inherit" }) {
  return (
    <div style={s.metricCard}>
      <p style={s.metricLabel}>{label}</p>
      <p style={{ ...s.metricValue, color: valueColor }}>{value}</p>
    </div>
  );
}

const s = {
  page:       { padding: "1.25rem", maxWidth: 680, margin: "0 auto", fontFamily: "inherit" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" },
  greeting:   { fontSize: 13, color: "#888", margin: 0 },
  totalValue: { fontSize: 28, fontWeight: 500, margin: "4px 0 0", color: "#1a1a1a" },
  gainBadge:  { fontSize: 13, fontWeight: 500, padding: "3px 10px", borderRadius: 6, margin: 0 },
  subText:    { fontSize: 11, color: "#aaa", margin: "4px 0 0" },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: "1.5rem" },
  metricCard: { background: "#f7f7f7", borderRadius: 10, padding: "12px 14px" },
  metricLabel:{ fontSize: 11, color: "#888", margin: 0 },
  metricValue:{ fontSize: 18, fontWeight: 500, margin: "4px 0 0" },
  tableWrap:  { overflowX: "auto" },
  table:      { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:         { textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 400,
                borderBottom: "0.5px solid rgba(0,0,0,0.08)" },
  tr:         { borderBottom: "0.5px solid rgba(0,0,0,0.06)" },
  td:         { padding: "8px 8px", color: "#1a1a1a" },
  pill:       { fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 5 },
  cardGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 },
  recCard:    { background: "#f7f7f7", borderRadius: 10, padding: "12px 14px" },
  recTicker:  { fontSize: 15, fontWeight: 500, margin: 0, color: "#1a1a1a" },
  recName:    { fontSize: 11, color: "#888", margin: "3px 0 0" },
};