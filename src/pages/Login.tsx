import { useState } from "react";
import { useNavigate } from "react-router";
import { Database } from "lucide-react";
import { ADMIN_PASS, ADMIN_USER, CLIENT_PASSWORD } from "../config";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

const PASSWORD = CLIENT_PASSWORD

const ADMIN = { username: ADMIN_USER, password: ADMIN_PASS }

const [users, setUsers] =  useState<Record<string, string>>({
  "ECC": "Elvie",
  "VAGR": "Vi-Ann",
  "DJLS": "Daniel",
  "MDE": "Mon",
  "METT": "Emman",
})

const [showAdminModal, setShowAdminModal] = useState(false)
const [adminCreds, setAdminCreds] = useState({username: "", password: ""}) 
const [adminAuthed, setAdminAuthed] = useState(false)
const [newUser, setNewUser] = useState({username: "", displayName: ""})
const [adminError, setAdminError] = useState("")

const handleAdminAuth = () => {
  if (adminCreds.username === ADMIN.username && adminCreds.password === ADMIN.password) {
    setAdminAuthed(true)
    setAdminError("")
  } else {
    setAdminError("Invalid admin credentials")
  }
}

const handleAddUser = () => {
  if (!newUser.username.trim() || !newUser.displayName.trim()) {
    setAdminError("Both fields are required")
    return
  }
  if (users[newUser.username.toUpperCase()]) {
    setAdminError("Username already exists")
    return
  }
  setUsers(prev => ({ ...prev, [newUser.username.toUpperCase()]: newUser.displayName }))
  setNewUser({ username: "", displayName: "" })
  setAdminError("")
  alert(`User "${newUser.username.toUpperCase()}" added successfully`)
}

const closeAdminModal = () => {
  setShowAdminModal(false)
  setAdminAuthed(false)
  setAdminCreds({ username: "", password: "" })
  setNewUser({ username: "", displayName: "" })
  setAdminError("")
}

const handleLogin = (e: React.FormEvent) => {
  e.preventDefault()
  const displayName = users[username]
  if (displayName && password === PASSWORD) {
    sessionStorage.setItem("username", username)
    sessionStorage.setItem("displayName", displayName)
    navigate("/app/home")
  } else {
    alert("Invalid username or password")
  }
}
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Icon + Title */}
        <div style={styles.header}>
          <div style={styles.iconBox}>
            <Database size={48} color="white" />
          </div>
          <h1 style={styles.title}>Central Database</h1>
          <p style={styles.subtitle}>PPIS - Planning Division</p>
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
          
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button
            onClick={() => setShowAdminModal(true)}
            style={{
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.25)", fontSize: "0.75rem",
              cursor: "pointer", fontFamily: "inherit",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}
          >
            Admin
          </button>
        </div>
        </div>
      </div>
      {showAdminModal && (
        <div
          onClick={closeAdminModal}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 380, borderRadius: 16,
              background: "#1a2f52",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
              padding: "24px",
              fontFamily: "inherit",
            }}
          >
            <h2 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700, color: "#fff" }}>
              {adminAuthed ? "Add New User" : "Admin Login"}
            </h2>
            <p style={{ margin: "0 0 20px 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              {adminAuthed ? "Fill in the new user's credentials" : "Enter admin credentials to continue"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {!adminAuthed ? (
                <>
                  <input
                    type="text" placeholder="Admin username"
                    value={adminCreds.username}
                    onChange={e => setAdminCreds(p => ({ ...p, username: e.target.value }))}
                    style={styles.input}
                  />
                  <input
                    type="password" placeholder="Admin password"
                    value={adminCreds.password}
                    onChange={e => setAdminCreds(p => ({ ...p, password: e.target.value }))}
                    style={styles.input}
                  />
                </>
              ) : (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                      Username
                    </label>
                    <input
                      type="text" placeholder="e.g. JDOE"
                      value={newUser.username}
                      onChange={e => setNewUser(p => ({ ...p, username: e.target.value.toUpperCase() }))}
                      style={{ ...styles.input, marginTop: 6, marginLeft: 30 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                      Display Name
                    </label>
                    <input
                      type="text" placeholder="e.g. John Doe"
                      value={newUser.displayName}
                      onChange={e => setNewUser(p => ({ ...p, displayName: e.target.value }))}
                      style={{ ...styles.input, marginTop: 6, marginLeft: 7 }}
                    />
                  </div>

                  {/* Current users list */}
                  <div style={{ marginTop: 4 }}>
                    <p style={{ margin: "0 0 6px 0", fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Current Users
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto" }}>
                      {Object.entries(users).map(([uname, dname]) => (
                        <div key={uname} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "6px 10px", borderRadius: 7,
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{uname}</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{dname}</span>
                          <button
                            onClick={() => setUsers(prev => {
                              const next = { ...prev }
                              delete next[uname]
                              return next
                            })}
                            style={{
                              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                              borderRadius: 5, color: "#f87171", fontSize: 11, cursor: "pointer",
                              padding: "2px 8px", fontFamily: "inherit",
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {adminError && (
                <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{adminError}</p>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  onClick={closeAdminModal}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 13,
                    border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                    color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={adminAuthed ? handleAddUser : handleAdminAuth}
                  style={{
                    padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: "none", background: "#3b5bdb",
                    color: "#fff", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {adminAuthed ? "Add User" : "Verify"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f1f3d",
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
    color: "#ffffff",
    textAlign: "center",
  },
  subtitle: {
    margin: 0,
    fontSize: "0.95rem",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  card: {
    background: "#1a2f52",
    padding: "2rem",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.15)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
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
    color: "rgba(255,255,255,0.6)",
  },
  input: {
    padding: "0.6rem 0.85rem",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.15)",
    fontSize: "1rem",
    color: "#ffffff",
    background: "rgba(255,255,255,0.08)",
    outline: "none",
    transition: "border-color 0.2s",
  },
  button: {
    marginTop: "0.5rem",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "none",
    background: "#3b5bdb",
    color: "white",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },
};
