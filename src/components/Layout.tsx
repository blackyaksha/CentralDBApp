import { Outlet, NavLink, useNavigate, Navigate, useLocation } from "react-router";
import { Home, FolderOpen, Activity, LogOut, History } from "lucide-react";
import { useState } from "react";

import { PD_LOGO } from "../assets/logoBase64";
import { logActivity } from "../services/activityLogger";

// ── Logo ──────────────────────────────────────────────────────────────────────
function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <img
      src={PD_LOGO}
      alt="Logo"
      title="File Manager"
      style={{
        width: collapsed ? 60 : "100%",
        maxWidth: collapsed ? 60 : 280,
        height: "auto",
        objectFit: "contain",
        flexShrink: 0,
        transition: "width 0.25s ease, max-width 0.25s ease",
      }}
    />
  );
}

// ── Role Guard ────────────────────────────────────────────────────────────────
const VIEWER_ALLOWED = ["/app/documents-monitor"]

function RoleGuard({ children }: { children: React.ReactNode }) {
  const role = sessionStorage.getItem("role") ?? "viewer"
  const { pathname } = useLocation()
  if (role === "viewer" && !VIEWER_ALLOWED.some(p => pathname.startsWith(p))) {
    return <Navigate to="/app/documents-monitor" replace />
  }
  return <>{children}</>
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function Layout() {
  const navigate = useNavigate();
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const role = sessionStorage.getItem("role") ?? "viewer"

  const handleLogout = () => {
    const displayName = sessionStorage.getItem("displayName") || "User";
    logActivity('session', 'Logged out', displayName);
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("displayName");
    sessionStorage.removeItem("role");
    navigate("/");
  };

  const allNavItems = [
    { path: "/app/home", icon: Home, label: "Home", roles: ["staff"] },
    { path: "/app/current-files", icon: FolderOpen, label: "Current Files", roles: ["staff"] },
    { path: "/app/monitoring", icon: Activity, label: "Monitoring", roles: ["staff"] },
    { path: "/app/documents-monitor", icon: FolderOpen, label: "Outgoing and Incoming Docs", roles: ["staff", "viewer"] },
  ]

  const navItems = allNavItems.filter(item => item.roles.includes(role))
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
        onClick={() => setCollapsed((prev) => !prev)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
          cursor: "pointer",
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

        {/* Activity Log — staff only */}
        {role === 'staff' && (
          <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            <NavLink
              to="/app/activity-log"
              onClick={(e) => e.stopPropagation()}
              title={collapsed ? "Activity Log" : undefined}
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
                background: isActive ? "#2d4a7c" : "transparent",
                color: isActive ? "#fff" : "#a3b8d9",
                border: "1px solid transparent",
                overflow: "hidden",
                whiteSpace: "nowrap",
              })}
            >
              {({ isActive }) => (
                <>
                  <History size={16} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ flex: 1 }}>Activity Log</span>}
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
          </div>
        )}

        {/* Logout */}
        <div style={{ padding: 8, borderTop: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
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

      </aside>

      {/* ── MAIN CONTENT ── */}
      <main
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
          background: "#0f1f3d",
        }}
      >
        <RoleGuard>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Outlet />
          </div>
        </RoleGuard>
      </main>
    </div>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────
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
      onClick={(e) => e.stopPropagation()}
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