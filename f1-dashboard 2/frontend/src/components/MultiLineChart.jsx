import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, ResponsiveContainer,
} from 'recharts'

const TEAM_COLORS = {
  red_bull: '#3671C6', ferrari: '#E8002D', mercedes: '#27F4D2',
  mclaren: '#FF8000', aston_martin: '#229971', alpine: '#FF87BC',
  williams: '#64C4FF', rb: '#6692FF', sauber: '#52E252',
  haas: '#B6BABD', alphatauri: '#5E8FAA', alfa: '#C92D4B',
  racing_point: '#F596C8', renault: '#FFF500', toro_rosso: '#469BFF',
  force_india: '#F596C8', lotus_f1: '#FFB800',
}

const PALETTE = [
  '#e10600', '#3671C6', '#27F4D2', '#FF8000', '#52E252', '#FF87BC',
  '#64C4FF', '#FFF500', '#B6BABD', '#229971', '#a78bfa', '#f472b6',
  '#fb923c', '#4ade80', '#38bdf8', '#facc15', '#f87171', '#c084fc',
  '#34d399', '#fbbf24', '#818cf8', '#e879f9', '#2dd4bf', '#a3e635',
]

export function seriesColor(id, index) {
  return TEAM_COLORS[id] || PALETTE[index % PALETTE.length]
}

/**
 * Generic multi-series line chart for backend blobs:
 *   { labels: [...], series: [{ id, label, data: [...] }] }
 */
export default function MultiLineChart({
  blob, yLabel, yReversed = false, connectNulls = false, height = 480,
}) {
  if (!blob?.series?.length) {
    return <p className="text-gray-400 py-12 text-center">No data for this selection.</p>
  }
  const rows = blob.labels.map((label, i) => {
    const row = { x: label }
    for (const s of blob.series) row[s.label] = s.data[i] ?? null
    return row
  })
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid stroke="#2e2e3d" strokeDasharray="3 3" />
        <XAxis dataKey="x" stroke="#9ca3af" tick={{ fontSize: 11 }} />
        <YAxis
          stroke="#9ca3af" tick={{ fontSize: 11 }} reversed={yReversed}
          allowDecimals={false}
          label={yLabel ? {
            value: yLabel, angle: -90, position: 'insideLeft', fill: '#9ca3af',
          } : undefined}
        />
        <Tooltip
          contentStyle={{ background: '#1f1f2b', border: '1px solid #2e2e3d' }}
          labelStyle={{ color: '#e5e7eb' }}
          itemSorter={(item) => -item.value}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {blob.series.map((s, i) => (
          <Line
            key={s.id ?? s.label} type="monotone" dataKey={s.label}
            stroke={seriesColor(s.id, i)} dot={false} strokeWidth={2}
            connectNulls={connectNulls}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
