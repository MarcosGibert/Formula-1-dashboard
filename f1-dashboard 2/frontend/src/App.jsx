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

export default function App() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-panel border-r border-gray-800 p-4">
        <div className="mb-6">
          <span className="text-f1red font-black text-xl italic">F1</span>
          <span className="font-bold text-lg ml-2">Analytics</span>
          <p className="text-xs text-gray-500 mt-1">Historical stats · 1950–today</p>
        </div>
        <nav className="flex flex-col gap-1">
          {CHARTS.map((c) => (
            <NavLink key={c.path} to={`/${c.path}`}
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
