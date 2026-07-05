import { useQuery } from '@tanstack/react-query'

// Set VITE_API_BASE at build time (GitHub Actions) to the Render URL.
export const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:8000'

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

/** Query the backend. Pass path=null to disable. */
export function useApi(path) {
  return useQuery({
    queryKey: [path],
    queryFn: () => fetchJson(path),
    enabled: path != null,
  })
}

export const CURRENT_YEAR = new Date().getFullYear()
