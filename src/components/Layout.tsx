import { Outlet, NavLink, useNavigate } from "react-router";
import { Database, Home, FolderOpen, Activity, LogOut } from "lucide-react";
import { useState } from "react";

export default function Layout() {
  const navigate = useNavigate();
  const [logoutHovered, setLogoutHovered] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("username");
    navigate("/");
  };

  const navItems = [
    { path: "/app/home", icon: Home, label: "Home" },
    { path: "/app/current-files", icon: FolderOpen, label: "Current Files" },
    { path: "/app/monitoring", icon: Activity, label: "Monitoring" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
        background: "#0f1f3d",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* ── SIDEBAR ── */}
      <aside
        style={{
          width: 240,
          minWidth: 240,
          maxWidth: 240,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#1a2f52",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: "20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              minWidth: 36,
              borderRadius: 8,
              background: "#2d4a7c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(45,74,124,0.5)",
            }}
          >
            <Database size={18} color="#fff" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#fff" }}>
              File Manager
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#a3b8d9" }}>
              Internal System
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: "12px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflowY: "auto",
          }}
        >
          {navItems.map((item) => (
            <NavItem key={item.path} path={item.path} icon={item.icon} label={item.label} />
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: 8, borderTop: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
          <button
            onClick={handleLogout}
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.15s ease",
              background: logoutHovered ? "rgba(239,68,68,0.15)" : "transparent",
              color: logoutHovered ? "#f87171" : "#a3b8d9",
              fontFamily: "inherit",
            }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main
        style={{
          flex: 1,
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          minWidth: 0,
          background: "#0f1f3d",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ path, icon: Icon, label }: { path: string; icon: any; label: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <NavLink
      to={path}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={({ isActive }) => ({
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 8,
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 500,
        transition: "all 0.15s ease",
        background: isActive
          ? "#2d4a7c"
          : hovered
          ? "#253853"
          : "transparent",
        color: isActive ? "#fff" : hovered ? "#fff" : "#a3b8d9",
        border: "1px solid transparent",
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{label}</span>
          {isActive && (
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#60a5fa", flexShrink: 0 }} />
          )}
        </>
      )}
    </NavLink>
  );
}