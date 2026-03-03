import { useState } from "react";
import { useNavigate } from "react-router";
import { Database } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      sessionStorage.setItem("username", username);
      navigate("/app/home");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Icon + Title */}
        <div style={styles.header}>
          <div style={styles.iconBox}>
            <Database size={48} color="white" />
          </div>
          <h1 style={styles.title}>Database File Manager</h1>
          <p style={styles.subtitle}>Internal Management System</p>
        </div>

        {/* Card */}
        <div style={styles.card}>
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.field}>
              <label htmlFor="username" style={styles.label}>Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="password" style={styles.label}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={styles.input}
              />
            </div>

            <button type="submit" style={styles.button}
              onMouseEnter={e => (e.currentTarget.style.background = "#1d4ed8")}
              onMouseLeave={e => (e.currentTarget.style.background = "#2563eb")}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f9ff",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  container: {
    width: "100%",
    maxWidth: "420px",
    padding: "0 1.5rem",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "2rem",
  },
  iconBox: {
    background: "#2563eb",
    padding: "1rem",
    borderRadius: "16px",
    marginBottom: "1rem",
    boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
  },
  title: {
    margin: "0 0 0.4rem 0",
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    margin: 0,
    fontSize: "0.95rem",
    color: "#6b7280",
    textAlign: "center",
  },
  card: {
    background: "white",
    padding: "2rem",
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  label: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#374151",
  },
  input: {
    padding: "0.6rem 0.85rem",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "1rem",
    color: "#111827",
    background: "#f9fafb",
    outline: "none",
    transition: "border-color 0.2s",
  },
  button: {
    marginTop: "0.5rem",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "white",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },
};
