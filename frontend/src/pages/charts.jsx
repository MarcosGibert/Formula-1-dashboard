import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { useApi, CURRENT_YEAR } from '../api'
import ChartFrame from '../components/ChartFrame'
import MultiLineChart from '../components/MultiLineChart'
import {
  SeasonSelect, RangeSelect, TeamSelect, MultiSeasonSelect,
} from '../components/controls'

/* 1 — Cumulative points per driver */
export function DriverProgression() {
  const [season, setSeason] = useState(CURRENT_YEAR)
  const q = useApi(`/api/season/${season}/driver-progression`)
  return (
    <ChartFrame title="Driver points progression"
      description="Cumulative championship points per driver, round by round."
      filters={<SeasonSelect value={season} onChange={setSeason} />} query={q}>
      <MultiLineChart blob={q.data} yLabel="Points" />
    </ChartFrame>
  )
}

/* 2 — Cumulative points per team */
export function ConstructorProgression() {
  const [season, setSeason] = useState(CURRENT_YEAR)
  const q = useApi(`/api/season/${season}/constructor-progression`)
  return (
    <ChartFrame title="Team points progression"
      description="Cumulative constructor championship points, round by round."
      filters={<SeasonSelect value={season} onChange={setSeason} />} query={q}>
      <MultiLineChart blob={q.data} yLabel="Points" />
    </ChartFrame>
  )
}

/* 3 — Cumulative points per country */
export function CountryProgression() {
  const [season, setSeason] = useState(CURRENT_YEAR)
  const q = useApi(`/api/season/${season}/country-progression`)
  return (
    <ChartFrame title="Points by country"
      description="Cumulative points grouped by driver nationality."
      filters={<SeasonSelect value={season} onChange={setSeason} />} query={q}>
      <MultiLineChart blob={q.data} yLabel="Points" />
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
  const [team, setTeam] = useState('red_bull')
  const [start, setStart] = useState(CURRENT_YEAR - 4)
  const [end, setEnd] = useState(CURRENT_YEAR)
  const q = useApi(`/api/constructor/${team}/circuit-averages?start=${start}&end=${end}`)
  const rows = q.data?.rows ?? []
  return (
    <ChartFrame title="Average points per circuit"
      description="Team's average combined points per race weekend, by circuit."
      filters={<>
        <TeamSelect value={team} onChange={setTeam} />
        <RangeSelect start={start} end={end} onStart={setStart} onEnd={setEnd} />
      </>} query={q}>
      <ResponsiveContainer width="100%" height={Math.max(320, rows.length * 28)}>
        <BarChart data={rows} layout="vertical"
                  margin={{ top: 8, right: 24, bottom: 8, left: 140 }}>
          <CartesianGrid stroke="#2e2e3d" strokeDasharray="3 3" />
          <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="circuitName" stroke="#9ca3af"
                 tick={{ fontSize: 11 }} width={140} />
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
      description="Season-end championship points for every driver on the current grid, across their whole careers. Heavily cached server-side (this is the most expensive view)."
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
