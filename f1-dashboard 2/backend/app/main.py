"""FastAPI backend for the F1 Historical Analytics Dashboard.

Serves cached, pre-aggregated chart blobs so the frontend never talks to
Jolpica directly (rate-limit protection + resilience to Jolpica downtime).
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import aggregations as agg
from .jolpica import JolpicaClient

client: JolpicaClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global client
    client = JolpicaClient()
    yield
    await client.close()


app = FastAPI(title="F1 Historical Analytics API", lifespan=lifespan)

# In production set ALLOWED_ORIGINS="https://<user>.github.io"
origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_methods=["GET"],
    allow_headers=["*"],
)

MIN_SEASON = 1950


def _validate_season(season: int):
    if not MIN_SEASON <= season <= agg.current_year():
        raise HTTPException(400, f"season must be {MIN_SEASON}..{agg.current_year()}")


def _validate_range(start: int, end: int, max_span: int = 30):
    _validate_season(start)
    _validate_season(end)
    if start > end:
        raise HTTPException(400, "start must be <= end")
    if end - start + 1 > max_span:
        raise HTTPException(400, f"season range limited to {max_span} seasons")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/meta/constructors")
async def meta_constructors(season: str = "current"):
    return await agg.constructors_list(client, season)


# Chart 1
@app.get("/api/season/{season}/driver-progression")
async def chart1(season: int):
    _validate_season(season)
    return await agg.driver_progression(client, season)


# Chart 2
@app.get("/api/season/{season}/constructor-progression")
async def chart2(season: int):
    _validate_season(season)
    return await agg.constructor_progression(client, season)


# Chart 3
@app.get("/api/season/{season}/country-progression")
async def chart3(season: int):
    _validate_season(season)
    return await agg.country_progression(client, season)


# Chart 4
@app.get("/api/constructor/{cid}/standings-history")
async def chart4(cid: str, start: int, end: int):
    _validate_range(start, end, max_span=80)
    return await agg.constructor_standings_history(client, cid, start, end)


# Chart 5
@app.get("/api/constructor/{cid}/progression-overlay")
async def chart5(cid: str, seasons: str = Query(..., description="comma-separated years")):
    years = sorted({int(y) for y in seasons.split(",") if y.strip()})
    if not 1 <= len(years) <= 10:
        raise HTTPException(400, "pick 1-10 seasons")
    for y in years:
        _validate_season(y)
    return await agg.constructor_overlay(client, cid, years)


# Chart 6
@app.get("/api/champions/progression")
async def chart6(start: int, end: int):
    _validate_range(start, end, max_span=15)
    return await agg.champions_progression(client, start, end)


# Chart 7
@app.get("/api/champions/gap/{cid}")
async def chart7(cid: str, start: int, end: int):
    _validate_range(start, end, max_span=15)
    return await agg.gap_to_champion(client, cid, start, end)


# Chart 8
@app.get("/api/constructor/{cid}/circuit-averages")
async def chart8(cid: str, start: int, end: int):
    _validate_range(start, end)
    return await agg.circuit_averages(client, cid, start, end)


# Chart 9
@app.get("/api/drivers/current/career-points")
async def chart9():
    return await agg.current_drivers_careers(client)


# Chart 10
@app.get("/api/constructors/season-points")
async def chart10(
    ids: str = "mercedes,ferrari,red_bull,mclaren", start: int = 2010, end: int = 0
):
    end = end or agg.current_year()
    _validate_range(start, end, max_span=80)
    cids = [c.strip() for c in ids.split(",") if c.strip()][:8]
    return await agg.teams_season_points(client, cids, start, end)
