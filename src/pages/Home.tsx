import { useEffect, useState } from "react";
import { FileText, FileSpreadsheet } from "lucide-react";

const shortcutFiles = [
  {
    id: 1,
    title: "Q4 Report.docx",
    type: "DOCX",
    icon: FileText,
    accent: {
      text: "#93c5fd",
      bg: "rgba(37,99,235,0.12)",
      border: "rgba(59,130,246,0.2)",
      dot: "#3b82f6",
    },
    url: "https://energyregcomm-my.sharepoint.com/:w:/g/personal/ppis_pd_erc_ph/IQBtb1x9no4NS67kd5wvgo-9ATxXBwOvHeN2JaapAwXwA5c",
  },
  {
    id: 2,
    title: "Budget 2026.xlsx",
    type: "XLSX",
    icon: FileSpreadsheet,
    accent: {
      text: "#86efac",
      bg: "rgba(22,163,74,0.12)",
      border: "rgba(34,197,94,0.2)",
      dot: "#22c55e",
    },
    url: "https://energyregcomm-my.sharepoint.com/:x:/g/personal/ppis_pd_erc_ph/IQDi88TwO0rtSouG2f5r_DUxAXcP4gSD2pwXa9WURX3HO5g?e=vFGT8i",
  },
];

export default function Home() {
  const [username, setUsername] = useState("User");
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("username");
    if (stored) setUsername(stored);
  }, []);

  return (
    <div style={styles.page}>
      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={styles.greeting}>
          Welcome back,{" "}
          <span style={{ color: "#818cf8" }}>{username}</span>
        </h1>
        <p style={styles.greetingSub}>Quick access to your frequently used documents</p>
      </div>

      {/* Section label */}
      <p style={styles.sectionLabel}>Pinned Files</p>

      {/* Cards */}
      <div style={styles.grid}>
        {shortcutFiles.map((file) => {
          const Icon = file.icon;
          const isHovered = hovered === file.id;

          return (
            <a
              key={file.id}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHovered(file.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                ...styles.card,
                background: isHovered ? file.accent.bg : "rgba(255,255,255,0.03)",
                borderColor: isHovered ? file.accent.border : "rgba(255,255,255,0.07)",
                transform: isHovered ? "translateY(-2px)" : "none",
                boxShadow: isHovered ? "0 8px 24px rgba(0,0,0,0.25)" : "none",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  ...styles.iconBox,
                  background: file.accent.bg,
                  border: `1px solid ${file.accent.border}`,
                }}
              >
                <Icon size={18} color={file.accent.text} />
              </div>

              {/* Text */}
              <div style={styles.cardText}>
                <span style={styles.cardTitle}>{file.title}</span>
                <span style={{ ...styles.cardType, color: file.accent.text }}>{file.type}</span>
              </div>

              {/* Active dot */}
              {isHovered && (
                <span
                  style={{
                    marginLeft: "auto",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: file.accent.dot,
                    flexShrink: 0,
                  }}
                />
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "36px 32px",
    minHeight: "100%",
    background: "#0f1117",
    fontFamily: "'Geist', 'DM Sans', system-ui, sans-serif",
  },
  greeting: {
    margin: "0 0 6px 0",
    fontSize: 22,
    fontWeight: 600,
    color: "#fff",
    letterSpacing: "-0.02em",
  },
  greetingSub: {
    margin: 0,
    fontSize: 13.5,
    color: "rgba(255,255,255,0.38)",
  },
  sectionLabel: {
    margin: "0 0 10px 0",
    fontSize: 10,
    fontWeight: 600,
    color: "rgba(255,255,255,0.22)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
    gap: 12,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.07)",
    textDecoration: "none",
    transition: "all 0.18s ease",
    cursor: "pointer",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardText: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: 500,
    color: "rgba(255,255,255,0.85)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardType: {
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
};