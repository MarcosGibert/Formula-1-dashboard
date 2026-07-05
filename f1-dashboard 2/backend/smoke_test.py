"""Live smoke test against Jolpica. Run from backend/: python3 smoke_test.py [part]

Spot-checks aggregated numbers against known official results (spec §6.6).
Uses the same SQLite cache as the app, so reruns are cheap.
"""
import asyncio
import sys

from app import aggregations as agg
from app.jolpica import JolpicaClient


async def part1(c):
    # Chart 10 — known season-end totals
    blob = await agg.teams_season_points(c, ["red_bull", "mercedes"], 2021, 2023)
    rb = next(s for s in blob["series"] if s["id"] == "red_bull")
    me = next(s for s in blob["series"] if s["id"] == "mercedes")
    data = dict(zip(blob["labels"], rb["data"]))
    assert data[2023] == 860, f"RB 2023 expected 860, got {data[2023]}"
    assert data[2022] == 759, f"RB 2022 expected 759, got {data[2022]}"
    me_data = dict(zip(blob["labels"], me["data"]))
    assert me_data[2021] == 613.5, f"Merc 2021 expected 613.5, got {me_data[2021]}"
    print("chart 10 OK (RB 2023=860, RB 2022=759, Merc 2021=613.5)")

    # Chart 4 — Ferrari championship positions
    blob = await agg.constructor_standings_history(c, "ferrari", 2020, 2023)
    pos = dict(zip(blob["labels"], blob["series"][0]["data"]))
    assert pos[2020] == 6, f"Ferrari 2020 expected P6, got {pos[2020]}"
    assert pos[2022] == 2, f"Ferrari 2022 expected P2, got {pos[2022]}"
    print("chart 4 OK (Ferrari 2020=P6, 2022=P2)")

    teams = await agg.constructors_list(c, 2023)
    assert any(t["id"] == "mclaren" for t in teams)
    print(f"constructors list OK ({len(teams)} teams in 2023)")


async def part2(c):
    # Charts 1-3 — full 2020 season progression (17 rounds)
    prog = await agg.driver_progression(c, 2020)
    assert len(prog["rounds"]) == 17, f"2020 rounds: {len(prog['rounds'])}"
    top = prog["series"][0]
    assert top["id"] == "hamilton" and top["data"][-1] == 347, \
        f"2020 leader: {top['id']} {top['data'][-1]} (expected hamilton 347)"
    print("chart 1 OK (2020: Hamilton 347 pts, 17 rounds)")

    country = await agg.country_progression(c, 2020)
    brit = next(s for s in country["series"] if s["id"] == "British")
    # Hamilton 347 + Russell 3 + Norris 97 + Aitken 0 = 447
    assert brit["data"][-1] == 447, f"British 2020 expected 447, got {brit['data'][-1]}"
    print("chart 3 OK (British drivers 2020 = 447 pts)")

    ctor = await agg.constructor_progression(c, 2020)
    merc = next(s for s in ctor["series"] if s["id"] == "mercedes")
    assert merc["data"][-1] == 573, f"Merc 2020 expected 573, got {merc['data'][-1]}"
    print("chart 2 OK (Mercedes 2020 = 573 pts)")

    # Charts 5-7 reuse the same cached progression primitive
    overlay = await agg.constructor_overlay(c, "mercedes", [2020])
    assert overlay["series"][0]["data"][-1] == 573
    champs = await agg.champions_progression(c, 2020, 2020)
    assert "Mercedes" in champs["series"][0]["label"]
    gap = await agg.gap_to_champion(c, "ferrari", 2020, 2020)
    assert gap["series"][0]["data"][-1] == 573 - 131  # Ferrari 2020 = 131
    print("charts 5/6/7 OK (cached reuse, Ferrari 2020 gap = 442)")


async def part3(c):
    # Chart 8 — Red Bull avg points per circuit, 2022-2023
    blob = await agg.circuit_averages(c, "red_bull", 2022, 2023)
    assert blob["rows"], "no circuit rows"
    print(f"chart 8 OK ({len(blob['rows'])} circuits, top: "
          f"{blob['rows'][0]['circuitName']} avg {blob['rows'][0]['avgPoints']})")


async def part4(c):
    # Chart 9 — current drivers career points (most expensive)
    blob = await agg.current_drivers_careers(c)
    assert len(blob["series"]) >= 18, f"only {len(blob['series'])} drivers"
    print(f"chart 9 OK ({len(blob['series'])} current drivers, "
          f"seasons {blob['labels'][0]}–{blob['labels'][-1]})")


async def main():
    parts = {"1": part1, "2": part2, "3": part3, "4": part4}
    which = sys.argv[1] if len(sys.argv) > 1 else None
    c = JolpicaClient(min_interval=0.5)
    try:
        for name, fn in parts.items():
            if which in (None, name):
                await fn(c)
    finally:
        await c.close()
    print("ALL PASSED")


if __name__ == "__main__":
    asyncio.run(main())
