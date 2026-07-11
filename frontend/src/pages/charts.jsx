import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { useApi, CURRENT_YEAR } from '../api'
import useIsMobile from '../useIsMobile'
import ChartFrame from '../components/ChartFrame'
import MultiLineChart from '../components/MultiLineChart'
import {
  SeasonSelect, RangeSelect, TeamSelect, MultiSeasonSelect,
} from '../components/controls'

/** Split a blob into top/bottom halves by final standing (series come
 *  pre-sorted by final points from the backend). */
function splitBlob(blob) {
  if (!blob?.series) return [null, null]
  const mid = Math.ceil(blob.series.length / 2)
  return [
    { ...blob, series: blob.series.slice(0, mid) },
    { ...blob, series: blob.series.slice(mid) },
  ]
}

function SplitCharts({ blob, yLabel }) {
  const [top, bottom] = splitBlob(blob)
  return (
    <>
      <h2 className="text-sm font-semibold text-gray-400 uppercase mb-2">Top half</h2>
      <MultiLineChart blob={top} yLabel={yLabel} height={380} />
      <h2 className="text-sm font-semibold text-gray-400 uppercase mt-8 mb-2">Bottom half</h2>
      <MultiLineChart blob={bottom} yLabel={yLabel} height={380} />
    </>
  )
}

/* 1 — Cumulative points per driver (team colors, split top/bottom) */
export function DriverProgression() {
  const [season, setSeason] = useState(CURRENT_YEAR)
  const q = useApi(`/api/season/${season}/driver-progression`)
  return (
    <ChartFrame title="Driver points progression"
      description="Cumulative championship points per driver, round by round. Lines are colored by the driver's team; teammates share a color."
      filters={<SeasonSelect value={season} onChange={setSeason} />} query={q}>
      <SplitCharts blob={q.data} yLabel="Points" />
    </ChartFrame>
  )
}

/* 2 — Cumulative points per team (split top/bottom) */
export function ConstructorProgression() {
  const [season, setSeason] = useState(CURRENT_YEAR)
  const q = useApi(`/api/season/${season}/constructor-progression`)
  return (
    <ChartFrame title="Team points progression"
      description="Cumulative constructor championship points, round by round."
      filters={<SeasonSelect value={season} onChange={setSeason} />} query={q}>
      <SplitCharts blob={q.data} yLabel="Points" />
    </ChartFrame>
  )
}

/* 3 — Cumulative points per country, with country filter */
export function CountryProgression() {
  const [season, setSeason] = useState(CURRENT_YEAR)
  const [hidden, setHidden] = useState([]) // empty = show all
  const q = useApi(`/api/season/${season}/country-progression`)
  const all = q.data?.series ?? []
  const toggle = (id) =>
    setHidden(hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id])
  const blob = q.data
    ? { ...q.data, series: all.filter((s) => !hidden.includes(s.id)) }
    : q.data
  return (
    <ChartFrame title="Points by country"
      description="Cumulative points grouped by driver nationality. Click a country to show/hide it."
      filters={<>
        <SeasonSelect value={season} onChange={(y) => { setSeason(y); setHidden([]) }} />
        <div className="flex flex-wrap gap-1 max-w-2xl">
          {all.map((s) => (
            <button key={s.id} type="button" onClick={() => toggle(s.id)}
              className={`px-2 py-1 rounded text-xs border ${
                hidden.includes(s.id)
                  ? 'border-gray-700 text-gray-600'
                  : 'bg-f1red border-f1red text-white'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </>} query={q}>
      <MultiLineChart blob={blob} yLabel="Points" />
    </ChartFrame>
  )
}

/* 4 — Team standings position across seasons */
export function TeamStandingsHistory() {
  const [team, setTeam] = useState('ferrari')
  const [start, setStart] = useState(2000)
  const [end, setEnd] = useState(CURRENT_YEAR)
  const q = useApi(`/api/constructor/${team}/standings-history?start=${start}&end=${end}`)
  return (
    <ChartFrame title="Team championship position over time"
      description="Season-end constructors' championship position (1 = champions)."
      filters={<>
        <TeamSelect value={team} onChange={setTeam} />
        <RangeSelect start={start} end={end} onStart={setStart} onEnd={setEnd} />
      </>} query={q}>
      <MultiLineChart blob={q.data} yLabel="Position" yReversed />
    </ChartFrame>
  )
}

/* 5 — One team's accumulation, overlaid across seasons */
export function TeamOverlay() {
  const [team, setTeam] = useState('mclaren')
  const [seasons, setSeasons] = useState([CURRENT_YEAR - 1, CURRENT_YEAR])
  const q = useApi(seasons.length
    ? `/api/constructor/${team}/progression-overlay?seasons=${seasons.join(',')}`
    : null)
  return (
    <ChartFrame title="Team season overlay"
      description="One team's cumulative points, one line per season (x = round)."
      filters={<>
        <TeamSelect value={team} onChange={setTeam} />
        <MultiSeasonSelect values={seasons} onChange={setSeasons} />
      </>} query={q}>
      <MultiLineChart blob={q.data} yLabel="Points" />
    </ChartFrame>
  )
}

/* 6 — Champions' accumulation across seasons */
export function ChampionsProgression() {
  const [start, setStart] = useState(CURRENT_YEAR - 5)
  const [end, setEnd] = useState(CURRENT_YEAR)
  const q = useApi(`/api/champions/progression?start=${start}&end=${end}`)
  return (
    <ChartFrame title="Champions' points accumulation"
      description="Each season's winning team, cumulative points per round. Ranges are capped at 15 seasons to respect the API rate limit."
      filters={<RangeSelect start={start} end={end} onStart={setStart} onEnd={setEnd} from={1958} />}
      query={q}>
      <MultiLineChart blob={q.data} yLabel="Points" />
    </ChartFrame>
  )
}

/* 7 — Gap between champion and a given team */
export function GapToChampion() {
  const [team, setTeam] = useState('ferrari')
  const [start, setStart] = useState(CURRENT_YEAR - 5)
  const [end, setEnd] = useState(CURRENT_YEAR)
  const q = useApi(`/api/champions/gap/${team}?start=${start}&end=${end}`)
  return (
    <ChartFrame title="Points gap to the champions"
      description="Per-round gap between the season-winning team and the selected team (0 = selected team is the champion)."
      filters={<>
        <TeamSelect value={team} onChange={setTeam} />
        <RangeSelect start={start} end={end} onStart={setStart} onEnd={setEnd} from={1958} />
      </>} query={q}>
      <MultiLineChart blob={q.data} yLabel="Points behind" />
    </ChartFrame>
  )
}

/* 8 — Average points per circuit for a team */
export function CircuitAverages() {
  const isMobile = useIsMobile()
  const [team, setTeam] = useState('red_bull')
  const [start, setStart] = useState(CURRENT_YEAR - 4)
  const [end, setEnd] = useState(CURRENT_YEAR)
  const q = useApi(`/api/constructor/${team}/circuit-averages?start=${start}&end=${end}`)
  const rows = q.data?.rows ?? []
  const axisWidth = isMobile ? 95 : 140
  return (
    <ChartFrame title="Average points per circuit"
      description="Team's average combined points per race weekend, by circuit. Only circuits on the current season's calendar are shown."
      filters={<>
        <TeamSelect value={team} onChange={setTeam} />
        <RangeSelect start={start} end={end} onStart={setStart} onEnd={setEnd} />
      </>} query={q}>
      <ResponsiveContainer width="100%" height={Math.max(320, rows.length * 28)}>
        <BarChart data={rows} layout="vertical"
                  margin={{ top: 8, right: isMobile ? 8 : 24, bottom: 8, left: axisWidth }}>
          <CartesianGrid stroke="#2e2e3d" strokeDasharray="3 3" />
          <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="circuitName" stroke="#9ca3af"
                 tick={{ fontSize: isMobile ? 9 : 11 }} width={axisWidth} />
          <Tooltip contentStyle={{ background: '#1f1f2b', border: '1px solid #2e2e3d' }}
                   labelStyle={{ color: '#e5e7eb' }} />
          <Bar dataKey="avgPoints" fill="#e10600" name="Avg points / weekend" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/* 9 — Current drivers' career season-end points */
export function DriverCareers() {
  const q = useApi('/api/drivers/current/career-points')
  return (
    <ChartFrame title="Current drivers — career points by season"
      description="Season-end championship points across their whole careers, for drivers who took part in the most recent race (excludes substitutes). Heavily cached server-side."
      query={q}>
      <MultiLineChart blob={q.data} yLabel="Season-end points" connectNulls />
    </ChartFrame>
  )
}

/* 10 — Top four teams, season-end points */
export function TopTeams() {
  const [start, setStart] = useState(2010)
  const [end, setEnd] = useState(CURRENT_YEAR)
  const q = useApi(`/api/constructors/season-points?ids=mercedes,ferrari,red_bull,mclaren&start=${start}&end=${end}`)
  return (
    <ChartFrame title="Top teams — season-end points"
      description="Mercedes, Ferrari, Red Bull and McLaren, season by season."
      filters={<RangeSelect start={start} end={end} onStart={setStart} onEnd={setEnd} />}
      query={q}>
      <MultiLineChart blob={q.data} yLabel="Points" connectNulls />
    </ChartFrame>
  )
}
