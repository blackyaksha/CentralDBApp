import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import './App.css'

import Home from './pages/Home'
import CurrentFiles from './pages/CurrentFiles'
import Monitoring from './pages/Monitoring'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="App app-layout">
      {/* ───────────── SIDEBAR ───────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          <NavLink to="/" end className="nav-item">
            Home
          </NavLink>

          <NavLink to="/current" className="nav-item">
            Current Files
          </NavLink>

          <NavLink to="/monitoring" className="nav-item">
            Monitoring
          </NavLink>
        </nav>
      </aside>

      {/* ───────────── MAIN CONTENT ───────────── */}
      <div className={`app-content ${sidebarOpen ? 'shifted' : ''}`}>
        {/* HEADER */}
        <header className="app-header">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            <span />
            <span />
            <span />
          </button>

          <h1>Planning Division</h1>
        </header>

        {/* ROUTES */}
        <main className="app-main">
          <Routes>
            {/* Landing page */}
            <Route path="/" element={<Home />} />

            <Route path="/current" element={<CurrentFiles />} />
            <Route path="/monitoring" element={<Monitoring />} />

            {/* Fallback */}
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
