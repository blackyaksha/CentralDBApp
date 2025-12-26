import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import './App.css'

import Home from './pages/Home'
import Monitoring from './pages/Monitoring'
import CurrentFiles from './pages/CurrentFiles'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)

  return (
    <div className="App app-layout">
      {/* SIDEBAR */}
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

      {/* MAIN CONTENT */}
      <div className={`app-content ${sidebarOpen ? 'shifted' : ''}`}>
        <header className="app-header">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen((v: boolean) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <h1>Planning Division Central Database</h1>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/current" element={<CurrentFiles />} />
            <Route path="/monitoring" element={<Monitoring />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
