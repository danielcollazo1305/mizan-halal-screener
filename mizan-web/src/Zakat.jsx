import { useState, useEffect } from "react";
import axios from "axios";

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
  n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const COLORS = {
  greenDark: "#0C1F17",
  greenMid:  "#064E3B",
  greenMain: "#0A7C5C",
  goldMain:  "#C9A84C",
  goldLight: "#E8C97A",
  white:     "#F0FDF4",
  muted:     "#6EE7B7",
};

export default function Zakat() {
  const user   = getUser();
  const userId = user?.id || 1;

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/zakat/${userId}`, { headers: headers() })
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={s.page}><p style={{ color: COLORS.muted }}>Calculating Zakat...</p></div>;
  if (error)   return <div style={s.page}><p style={{ color: "#FCA5A5" }}>{error}</p></div>;
  if (!data)   return null;

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <p style={s.title}>🕌 Zakat Calculator</p>
          <p style={s.subtitle}>2.5% on eligible halal assets above nisab</p>
        </div>
        {data.above_nisab
          ? <span style={{ ...s.badge, background: "rgba(201,168,76,0.15)", color: COLORS.goldMain, border: `1px solid ${COLORS.goldMain}` }}>Above Nisab ✦</span>
          : <span style={{ ...s.badge, background: "rgba(100,116,139,0.15)", color: "#94a3b8", border: "1px solid #334155" }}>Below Nisab</span>
        }
      </div>

      {/* Métricas principais */}
      <div style={s.metricGrid}>
        <MetricCard label="Portfolio Value"  value={fmt(data.portfolio_value)} />
        <MetricCard label="Eligible (Halal)" value={fmt(data.eligible_value)} />
        <MetricCard label="Nisab Threshold"  value={fmt(data.nisab_usd)} />
        <MetricCard
          label="Zakat Due"
          value={fmt(data.zakat_due)}
          highlight={data.above_nisab}
        />
      </div>

      {/* Explicação */}
      <div style={s.infoBox}>
        <p style={s.infoText}>
          ✦ Zakat is calculated at <strong style={{ color: COLORS.goldMain }}>2.5%</strong> on all halal assets above the nisab threshold
          (equivalent to 85g of gold, ~$5,200 USD). Only Shariah-compliant holdings are included.
        </p>
      </div>

      {/* Breakdown por ativo */}
      {data.breakdown?.length > 0 && (
        <div style={s.section}>
          <p style={s.sectionTitle}>Asset Breakdown</p>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Ticker", "Status", "Value", "Eligible", "Zakat"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.breakdown.map((item, i) => (
                  <tr key={i} style={s.tr}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{item.ticker}</td>
                    <td style={s.td}>
                      <span style={{
                        ...s.pill,
                        color: item.halal_status === "halal" ? COLORS.muted : "#FCA5A5",
                        background: item.halal_status === "halal" ? "rgba(10,124,92,0.2)" : "rgba(220,38,38,0.15)",
                      }}>
                        {item.halal_status}
                      </span>
                    </td>
                    <td style={s.td}>{fmt(item.value)}</td>
                    <td style={s.td}>
                      {item.eligible
                        ? <span style={{ color: COLORS.muted }}>✓</span>
                        : <span style={{ color: "#475569" }}>✗</span>
                      }
                    </td>
                    <td style={{ ...s.td, color: item.zakat > 0 ? COLORS.goldMain : "#475569", fontWeight: item.zakat > 0 ? 600 : 400 }}>
                      {item.zakat > 0 ? fmt(item.zakat) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid rgba(201,168,76,0.3)` }}>
                  <td colSpan={4} style={{ ...s.td, fontWeight: 700, color: COLORS.white }}>Total Zakat Due</td>
                  <td style={{ ...s.td, fontWeight: 700, color: COLORS.goldMain, fontSize: 16 }}>{fmt(data.zakat_due)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* CTA doação */}
      {data.above_nisab && data.zakat_due > 0 && (
        <div style={s.ctaBox}>
          <p style={{ fontSize: 14, color: COLORS.muted, margin: 0 }}>
            Your Zakat obligation for this portfolio is{" "}
            <strong style={{ color: COLORS.goldMain }}>{fmt(data.zakat_due)}</strong>.
            May Allah accept it. 🤲
          </p>
        </div>
      )}

    </div>
  );
}

function MetricCard({ label, value, highlight }) {
  return (
    <div style={{
      ...s.metricCard,
      border: highlight ? `1px solid rgba(201,168,76,0.4)` : "1px solid rgba(255,255,255,0.06)",
    }}>
      <p style={s.metricLabel}>{label}</p>
      <p style={{ ...s.metricValue, color: highlight ? COLORS.goldMain : COLORS.white }}>{value}</p>
    </div>
  );
}

const s = {
  page:        { padding: "1.5rem", maxWidth: 700, margin: "0 auto", fontFamily: "inherit", color: COLORS.white },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" },
  title:       { fontSize: 20, fontWeight: 700, margin: 0, color: COLORS.white },
  subtitle:    { fontSize: 12, color: COLORS.muted, margin: "4px 0 0" },
  badge:       { fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6 },
  metricGrid:  { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: "1rem" },
  metricCard:  { background: COLORS.greenMid, borderRadius: 10, padding: "14px 16px" },
  metricLabel: { fontSize: 11, color: COLORS.muted, margin: 0 },
  metricValue: { fontSize: 20, fontWeight: 600, margin: "4px 0 0" },
  infoBox:     { background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: "1.25rem" },
  infoText:    { fontSize: 13, color: COLORS.muted, margin: 0, lineHeight: 1.6 },
  section:     { marginBottom: "1.25rem" },
  sectionTitle:{ fontSize: 13, fontWeight: 600, color: COLORS.muted, marginBottom: 10 },
  tableWrap:   { overflowX: "auto" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:          { textAlign: "left", padding: "8px 10px", color: COLORS.muted, fontWeight: 500, borderBottom: `1px solid rgba(255,255,255,0.07)`, fontSize: 12 },
  tr:          { borderBottom: "1px solid rgba(255,255,255,0.04)" },
  td:          { padding: "10px 10px", color: COLORS.white },
  pill:        { fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5 },
  ctaBox:      { background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 10, padding: "14px 16px" },
};