import { Outlet, NavLink, useNavigate } from "react-router";
import { Home, FolderOpen, Activity, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import logo from "../assets/Icons/PD Logo.png";

// ── Logo ──────────────────────────────────────────────────────────────────────
function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <img
      src={logo}
      alt="Logo"
      title="File Manager"
      style={{
        width: collapsed ? 66 : 350,
        height: collapsed ? 66 : 350,
        objectFit: "contain",
        flexShrink: 0,
        transition: "width 0.25s ease, height 0.25s ease",
      }}
    />
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("username");
    navigate("/");
  };

  const navItems = [
    { path: "/app/home", icon: Home, label: "Home" },
    { path: "/app/current-files", icon: FolderOpen, label: "Current Files" },
    { path: "/app/monitoring", icon: Activity, label: "Monitoring" },
  ];

  const sidebarWidth = collapsed ? 64 : 240;

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
          width: sidebarWidth,
          minWidth: sidebarWidth,
          maxWidth: sidebarWidth,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#1a2f52",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
          transition: "width 0.25s ease, min-width 0.25s ease, max-width 0.25s ease",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Brand / Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "16px 14px" : "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            flexShrink: 0,
            transition: "padding 0.25s ease",
          }}
        >
          <SidebarLogo collapsed={collapsed} />
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
            overflowX: "hidden",
          }}
        >
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              path={item.path}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: 8, borderTop: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
          <button
            onClick={handleLogout}
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
            title={collapsed ? "Logout" : undefined}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 10,
              padding: collapsed ? "10px" : "10px 14px",
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
            <LogOut size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            position: "absolute",
            top: "50%",
            right: 3,
            transform: "translateY(-50%)",
            width: 24,
            height: 40,
            borderRadius: "50%",
            background: "#2d4a7c",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            zIndex: 10,
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#3d5f9c")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#2d4a7c")}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
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

function NavItem({
  path,
  icon: Icon,
  label,
  collapsed,
}: {
  path: string;
  icon: any;
  label: string;
  collapsed: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <NavLink
      to={path}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? label : undefined}
      style={({ isActive }) => ({
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 10,
        padding: collapsed ? "10px" : "10px 14px",
        borderRadius: 8,
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 500,
        transition: "all 0.15s ease",
        background: isActive ? "#2d4a7c" : hovered ? "#253853" : "transparent",
        color: isActive ? "#fff" : hovered ? "#fff" : "#a3b8d9",
        border: "1px solid transparent",
        overflow: "hidden",
        whiteSpace: "nowrap",
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
          {!collapsed && isActive && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#60a5fa",
                flexShrink: 0,
              }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}