# F1 Historical Analytics Dashboard

Historical Formula 1 stats explorer (1950–today). React frontend on GitHub Pages, FastAPI caching backend on Render, data from the [Jolpica-F1 API](https://api.jolpi.ca/ergast/f1/) (the Ergast successor).

**Architecture (Path B from the build spec):** the browser never calls Jolpica directly. The FastAPI backend fetches, aggregates multi-season data into compact chart blobs, and caches them (past seasons forever, current season 6h) in SQLite. This protects against Jolpica's ~200 req/hour rate limit and its downtime.

## Charts

10 charts in a sidebar explorer: driver/team/country points progression (current or any season), team championship-position history, single-team multi-season overlay, champions' progression, gap-to-champion, average points per circuit, current drivers' career points, and top-4-teams season points.

## Run locally

Backend (Python 3.10+):

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000
```

Frontend (Node 18+):

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173, expects backend on :8000
```

## Deploy

### 1. Backend on Render

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, point it at the repo — `render.yaml` provisions the free-tier web service automatically.
3. After the first deploy, note the URL (e.g. `https://f1-dashboard-api.onrender.com`) and set the `ALLOWED_ORIGINS` env var to your GitHub Pages origin (e.g. `https://<user>.github.io`).

### 2. Frontend on GitHub Pages

1. In the repo: **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: add `VITE_API_BASE` = your Render URL.
3. Push to `main` — `.github/workflows/deploy.yml` builds and deploys automatically.

## Notes & constraints

- **Rate limit:** multi-season charts are capped (15 seasons for champion charts, 10 for overlays) and everything is cached server-side. The first request for a deep multi-season chart is slow (dozens of throttled API calls); subsequent requests are instant.
- **Render free tier** spins down when idle — the UI shows a cold-start message on first load. The SQLite cache lives in `/tmp` and rebuilds after restarts.
- **Chart "points by country"** groups by *driver nationality* (as reported by the API).
- **Data caveats:** completed-round standings are treated as immutable; mid-season driver swaps are handled by carrying an entrant's last known total. Spot-check season totals against official standings if you extend the aggregations.
- Unofficial project; not associated with Formula 1 or the FIA.
