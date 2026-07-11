import { useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import * as C from './pages/charts'

const CHARTS = [
  { path: 'driver-progression', name: 'Driver points (season)', el: <C.DriverProgression /> },
  { path: 'team-progression', name: 'Team points (season)', el: <C.ConstructorProgression /> },
  { path: 'country-progression', name: 'Points by country', el: <C.CountryProgression /> },
  { path: 'team-history', name: 'Team position history', el: <C.TeamStandingsHistory /> },
  { path: 'team-overlay', name: 'Team season overlay', el: <C.TeamOverlay /> },
  { path: 'champions', name: "Champions' progression", el: <C.ChampionsProgression /> },
  { path: 'gap-to-champion', name: 'Gap to champions', el: <C.GapToChampion /> },
  { path: 'circuit-averages', name: 'Points per circuit', el: <C.CircuitAverages /> },
  { path: 'driver-careers', name: 'Driver careers', el: <C.DriverCareers /> },
  { path: 'top-teams', name: 'Top teams by season', el: <C.TopTeams /> },
]

function Logo() {
  return (
    <div>
      <span className="text-f1red font-black text-xl italic">F1</span>
      <span className="font-bold text-lg ml-2">Analytics</span>
    </div>
  )
}

export default function App() {
  const [navOpen, setNavOpen] = useState(false)
  return (
    <div className="md:flex min-h-screen">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-50 flex items-center justify-between
                         bg-panel border-b border-gray-800 px-4 py-3">
        <Logo />
        <button type="button" aria-label="Toggle menu"
                onClick={() => setNavOpen(!navOpen)}
                className="p-2 rounded border border-gray-700 text-gray-200">
          {/* hamburger / close */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {navOpen
              ? <path d="M6 6l12 12M18 6L6 18" />
              : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>

      {/* Overlay behind the mobile drawer */}
      {navOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60"
             onClick={() => setNavOpen(false)} />
      )}

      {/* Sidebar: drawer on mobile, static column on md+ */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-60 shrink-0
                         bg-panel border-r border-gray-800 p-4 overflow-y-auto
                         transform transition-transform duration-200 md:transform-none
                         ${navOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="mb-6 hidden md:block">
          <Logo />
          <p className="text-xs text-gray-500 mt-1">Historical stats · 1950–today</p>
        </div>
        <nav className="flex flex-col gap-1 mt-14 md:mt-0">
          {CHARTS.map((c) => (
            <NavLink key={c.path} to={`/${c.path}`}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm ${
                  isActive
                    ? 'bg-f1red text-white font-semibold'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}>
              {c.name}
            </NavLink>
          ))}
        </nav>
        <p className="text-[10px] text-gray-600 mt-8 leading-relaxed">
          Data: Jolpica-F1 API (Ergast successor).
          Unofficial — not associated with Formula 1.
        </p>
      </aside>

      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Navigate to={`/${CHARTS[0].path}`} replace />} />
          {CHARTS.map((c) => (
            <Route key={c.path} path={`/${c.path}`} element={c.el} />
          ))}
        </Routes>
      </main>
    </div>
  )
}
