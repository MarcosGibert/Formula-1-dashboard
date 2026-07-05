import { useApi, CURRENT_YEAR } from '../api'

const selectCls =
  'bg-carbon border border-gray-600 rounded px-3 py-2 text-sm text-gray-100'

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-400">
      {label}
      {children}
    </label>
  )
}

export function SeasonSelect({ value, onChange, from = 1950, label = 'Season' }) {
  const years = []
  for (let y = CURRENT_YEAR; y >= from; y--) years.push(y)
  return (
    <Field label={label}>
      <select className={selectCls} value={value}
              onChange={(e) => onChange(Number(e.target.value))}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </Field>
  )
}

export function RangeSelect({ start, end, onStart, onEnd, from = 1950 }) {
  return (
    <>
      <SeasonSelect label="From" value={start} onChange={onStart} from={from} />
      <SeasonSelect label="To" value={end} onChange={onEnd} from={from} />
    </>
  )
}

export function TeamSelect({ value, onChange, season = 'current' }) {
  const { data } = useApi(`/api/meta/constructors?season=${season}`)
  return (
    <Field label="Team">
      <select className={selectCls} value={value}
              onChange={(e) => onChange(e.target.value)}>
        {(data ?? [{ id: value, name: value }]).map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </Field>
  )
}

/** Multi-season checkbox picker (chart 5), capped at 10 selections. */
export function MultiSeasonSelect({ values, onChange, from = 2000, max = 10 }) {
  const years = []
  for (let y = CURRENT_YEAR; y >= from; y--) years.push(y)
  const toggle = (y) => {
    if (values.includes(y)) onChange(values.filter((v) => v !== y))
    else if (values.length < max) onChange([...values, y].sort())
  }
  return (
    <Field label={`Seasons (max ${max})`}>
      <div className="flex flex-wrap gap-1 max-w-xl">
        {years.map((y) => (
          <button key={y} type="button" onClick={() => toggle(y)}
            className={`px-2 py-1 rounded text-xs border ${
              values.includes(y)
                ? 'bg-f1red border-f1red text-white'
                : 'border-gray-600 text-gray-300 hover:border-gray-400'
            }`}>
            {y}
          </button>
        ))}
      </div>
    </Field>
  )
}
