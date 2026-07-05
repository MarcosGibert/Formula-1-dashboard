"""Aggregation layer: turns raw Jolpica responses into compact chart-ready blobs.

Every function is cached. Cache policy:
  - anything about a *past* season: cached forever (immutable)
  - anything touching the *current* season: short TTL (changes once per race)

Chart-ready blob shape (used by most charts):
  {"labels": [...x axis...], "series": [{"id","label","data":[...]}, ...]}
"""
import datetime

from . import cache
from .jolpica import JolpicaClient

CURRENT_TTL = 6 * 3600       # 6h for current-season blobs
DAY_TTL = 24 * 3600


def current_year() -> int:
    return datetime.date.today().year


def _ttl_for(season: int) -> float | None:
    """None = cache forever (past season), else TTL seconds."""
    return None if season < current_year() else CURRENT_TTL


async def _cached(key: str, ttl, fetch_coro_factory):
    hit = cache.get(key)
    if hit is not None:
        return hit
    value = await fetch_coro_factory()
    cache.set(key, value, ttl)
    return value


# ---------------------------------------------------------------- primitives

async def season_schedule(client: JolpicaClient, season: int) -> list[dict]:
    """[{round, raceName, circuitId, circuitName}] for a season."""
    async def fetch():
        races = await client.get_all(f"{season}", ["RaceTable", "Races"])
        return [
            {
                "round": int(r["round"]),
                "raceName": r["raceName"],
                "circuitId": r["Circuit"]["circuitId"],
                "circuitName": r["Circuit"]["circuitName"],
            }
            for r in races
        ]
    return await _cached(f"schedule:{season}", _ttl_for(season), fetch)


async def _standings_round(client: JolpicaClient, season: int, rnd: int, kind: str) -> list[dict]:
    """Standings after a given round. kind: 'driver' | 'constructor'.

    A completed round's standings are immutable even in the current season,
    so these are cached forever.
    """
    path = f"{season}/{rnd}/{kind}standings"
    node = ["StandingsTable", "StandingsLists"]

    async def fetch():
        lists = await client.get_all(path, node)
        if not lists:
            return []
        key = "DriverStandings" if kind == "driver" else "ConstructorStandings"
        return lists[0].get(key, [])

    return await _cached(f"standings:{kind}:{season}:{rnd}", None, fetch)


async def season_final_standings(client: JolpicaClient, season: int | str, kind: str) -> dict:
    """Latest/final standings list for a season, incl. the round it covers."""
    async def fetch():
        mrdata = await client.get(f"{season}/{kind}standings.json", {"limit": 100})
        lists = mrdata["StandingsTable"]["StandingsLists"]
        if not lists:
            return {"round": 0, "standings": []}
        key = "DriverStandings" if kind == "driver" else "ConstructorStandings"
        return {"round": int(lists[0]["round"]), "standings": lists[0].get(key, [])}

    season_num = current_year() if season == "current" else int(season)
    return await _cached(f"finalstandings:{kind}:{season}", _ttl_for(season_num), fetch)


async def _progression(client: JolpicaClient, season: int, kind: str) -> dict:
    """Cumulative points per entrant per round for one season (charts 1,2,5,6,7).

    Returns {"labels": [raceName...], "rounds": [1..R],
             "series": [{"id","label","nationality"?, "data":[pts...]}]}
    """
    key = f"prog:{kind}:{season}"

    async def fetch():
        final = await season_final_standings(client, season, kind)
        completed_rounds = final["round"]
        schedule = await season_schedule(client, season)
        race_names = {r["round"]: r["raceName"] for r in schedule}

        entrants: dict[str, dict] = {}
        rounds = list(range(1, completed_rounds + 1))
        for rnd in rounds:
            standings = await _standings_round(client, season, rnd, kind)
            for row in standings:
                if kind == "driver":
                    ent = row["Driver"]
                    eid = ent["driverId"]
                    label = f"{ent['givenName']} {ent['familyName']}"
                    extra = {"nationality": ent.get("nationality", "Unknown")}
                else:
                    ent = row["Constructor"]
                    eid = ent["constructorId"]
                    label = ent["name"]
                    extra = {}
                rec = entrants.setdefault(
                    eid, {"id": eid, "label": label, **extra, "points": {}}
                )
                rec["points"][rnd] = float(row["points"])

        series = []
        for rec in entrants.values():
            data, last = [], 0.0
            for rnd in rounds:
                # entrant absent from a round's standings -> carry last total
                last = rec["points"].get(rnd, last)
                data.append(last)
            s = {"id": rec["id"], "label": rec["label"], "data": data}
            if "nationality" in rec:
                s["nationality"] = rec["nationality"]
            series.append(s)
        series.sort(key=lambda s: s["data"][-1] if s["data"] else 0, reverse=True)
        return {
            "season": season,
            "rounds": rounds,
            "labels": [race_names.get(r, f"R{r}") for r in rounds],
            "series": series,
        }

    return await _cached(key, _ttl_for(season), fetch)


# ------------------------------------------------------------------- charts

async def driver_progression(client, season: int):
    """Chart 1."""
    return await _progression(client, season, "driver")


async def constructor_progression(client, season: int):
    """Chart 2."""
    return await _progression(client, season, "constructor")


async def country_progression(client, season: int):
    """Chart 3 — driver points grouped by driver *nationality*."""
    prog = await _progression(client, season, "driver")
    countries: dict[str, list[float]] = {}
    n = len(prog["rounds"])
    for s in prog["series"]:
        nat = s.get("nationality", "Unknown")
        agg = countries.setdefault(nat, [0.0] * n)
        for i, v in enumerate(s["data"]):
            agg[i] += v
    series = [
        {"id": nat, "label": nat, "data": data} for nat, data in countries.items()
    ]
    series.sort(key=lambda s: s["data"][-1] if s["data"] else 0, reverse=True)
    return {"season": season, "labels": prog["labels"], "series": series}


async def constructor_standings_history(client, constructor_id: str, start: int, end: int):
    """Chart 4 — one team's season-end championship position across seasons.

    Note: Jolpica (unlike original Ergast) requires a season for
    /constructors/{id}/constructorstandings, so this walks per-season
    final standings — one cached-forever call per past season.
    """
    seasons, positions, label = [], [], constructor_id
    for year in range(start, end + 1):
        final = await season_final_standings(client, year, "constructor")
        row = next(
            (r for r in final["standings"]
             if r["Constructor"]["constructorId"] == constructor_id),
            None,
        )
        if row is not None:
            seasons.append(year)
            positions.append(int(row["position"]))
            label = row["Constructor"]["name"]
    return {
        "labels": seasons,
        "series": [{"id": constructor_id, "label": label, "data": positions}],
    }


async def constructor_overlay(client, constructor_id: str, seasons: list[int]):
    """Chart 5 — one team's points accumulation overlaid across seasons.

    X axis is round number (seasons differ in race count)."""
    series = []
    max_rounds = 0
    for season in seasons:
        prog = await _progression(client, season, "constructor")
        team = next((s for s in prog["series"] if s["id"] == constructor_id), None)
        if team is None:
            continue
        max_rounds = max(max_rounds, len(team["data"]))
        series.append({"id": str(season), "label": str(season), "data": team["data"]})
    return {"labels": list(range(1, max_rounds + 1)), "series": series,
            "constructorId": constructor_id}


async def _champion_of(client, season: int) -> str | None:
    final = await season_final_standings(client, season, "constructor")
    rows = final["standings"]
    return rows[0]["Constructor"]["constructorId"] if rows else None


async def champions_progression(client, start: int, end: int):
    """Chart 6 — each season's *winning team* points accumulation, overlaid."""
    series, max_rounds = [], 0
    for season in range(start, end + 1):
        champ = await _champion_of(client, season)
        if champ is None:
            continue
        prog = await _progression(client, season, "constructor")
        team = next((s for s in prog["series"] if s["id"] == champ), None)
        if team is None:
            continue
        max_rounds = max(max_rounds, len(team["data"]))
        series.append(
            {"id": str(season), "label": f"{season} — {team['label']}", "data": team["data"]}
        )
    return {"labels": list(range(1, max_rounds + 1)), "series": series}


async def gap_to_champion(client, constructor_id: str, start: int, end: int):
    """Chart 7 — per-round points gap: champion minus given team, per season."""
    series, max_rounds = [], 0
    for season in range(start, end + 1):
        champ = await _champion_of(client, season)
        if champ is None:
            continue
        prog = await _progression(client, season, "constructor")
        champ_s = next((s for s in prog["series"] if s["id"] == champ), None)
        team_s = next((s for s in prog["series"] if s["id"] == constructor_id), None)
        if champ_s is None or team_s is None:
            continue
        n = min(len(champ_s["data"]), len(team_s["data"]))
        gap = [champ_s["data"][i] - team_s["data"][i] for i in range(n)]
        max_rounds = max(max_rounds, n)
        series.append(
            {"id": str(season), "label": f"{season} (vs {champ_s['label']})", "data": gap}
        )
    return {"labels": list(range(1, max_rounds + 1)), "series": series,
            "constructorId": constructor_id}


async def circuit_averages(client, constructor_id: str, start: int, end: int):
    """Chart 8 — average team points per circuit over a season range."""
    circuits: dict[str, dict] = {}
    for season in range(start, end + 1):
        key = f"ctorresults:{constructor_id}:{season}"

        async def fetch(season=season):
            races = await client.get_all(
                f"{season}/constructors/{constructor_id}/results",
                ["RaceTable", "Races"],
            )
            out = []
            for race in races:
                pts = sum(float(res["points"]) for res in race.get("Results", []))
                out.append(
                    {
                        "circuitId": race["Circuit"]["circuitId"],
                        "circuitName": race["Circuit"]["circuitName"],
                        "points": pts,
                    }
                )
            return out

        for row in await _cached(key, _ttl_for(season), fetch):
            c = circuits.setdefault(
                row["circuitId"],
                {"circuitId": row["circuitId"], "circuitName": row["circuitName"],
                 "races": 0, "totalPoints": 0.0},
            )
            c["races"] += 1
            c["totalPoints"] += row["points"]

    rows = [
        {**c, "avgPoints": round(c["totalPoints"] / c["races"], 2)}
        for c in circuits.values()
    ]
    rows.sort(key=lambda r: r["avgPoints"], reverse=True)
    return {"constructorId": constructor_id, "rows": rows}


# Earliest debut season of anyone plausibly on the current grid.
# (Alonso, the oldest current driver, debuted in 2001.) Jolpica requires a
# season for standings queries, so careers are assembled by scanning each
# season's final driver standings — one cached-forever call per past season,
# shared across ALL drivers (cheaper than per-driver queries).
CAREER_SCAN_START = 2000


async def current_drivers_careers(client):
    """Chart 9 — season-end points of every current driver, whole career."""
    async def fetch():
        drivers = await client.get_all("current/drivers", ["DriverTable", "Drivers"])
        wanted = {
            d["driverId"]: f"{d['givenName']} {d['familyName']}" for d in drivers
        }
        per_driver: dict[str, dict[int, float]] = {did: {} for did in wanted}
        seasons = list(range(CAREER_SCAN_START, current_year() + 1))
        for year in seasons:
            final = await season_final_standings(client, year, "driver")
            for row in final["standings"]:
                did = row["Driver"]["driverId"]
                if did in per_driver:
                    per_driver[did][year] = float(row["points"])

        active = sorted({y for pts in per_driver.values() for y in pts})
        series = [
            {
                "id": did,
                "label": wanted[did],
                "data": [per_driver[did].get(y) for y in active],  # None = didn't race
            }
            for did in wanted
        ]
        series.sort(key=lambda s: max((v for v in s["data"] if v is not None), default=0),
                    reverse=True)
        return {"labels": active, "series": series}

    return await _cached("careers:current", DAY_TTL, fetch)


async def teams_season_points(client, constructor_ids: list[str], start: int, end: int):
    """Chart 10 — season-end points for a set of teams across seasons.

    One cached season-final-standings call per season, shared by all teams.
    """
    seasons = list(range(start, end + 1))
    points = {cid: {} for cid in constructor_ids}
    labels = {cid: cid for cid in constructor_ids}
    for year in seasons:
        final = await season_final_standings(client, year, "constructor")
        for row in final["standings"]:
            cid = row["Constructor"]["constructorId"]
            if cid in points:
                points[cid][year] = float(row["points"])
                labels[cid] = row["Constructor"]["name"]
    return {
        "labels": seasons,
        "series": [
            {"id": cid, "label": labels[cid],
             "data": [points[cid].get(y) for y in seasons]}
            for cid in constructor_ids
        ],
    }


async def constructors_list(client, season: int | str = "current"):
    """For the team-picker UI."""
    season_num = current_year() if season == "current" else int(season)

    async def fetch():
        rows = await client.get_all(
            f"{season}/constructors", ["ConstructorTable", "Constructors"]
        )
        return [{"id": r["constructorId"], "name": r["name"]} for r in rows]

    return await _cached(f"ctors:{season}", _ttl_for(season_num), fetch)
