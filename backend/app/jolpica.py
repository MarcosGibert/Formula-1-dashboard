"""Rate-limit-aware async client for the Jolpica-F1 (Ergast-compatible) API.

Jolpica's unauthenticated rate limit is the single biggest constraint of this
project (~200 req/hour). This client:
  - serializes all requests through a lock with a minimum interval between them
  - retries with exponential backoff on HTTP 429
  - handles Ergast-style limit/offset pagination
"""
import asyncio
import time

import httpx

BASE_URL = "https://api.jolpi.ca/ergast/f1"


class JolpicaClient:
    def __init__(self, min_interval: float = 0.7, timeout: float = 30.0):
        self.min_interval = min_interval
        self._lock = asyncio.Lock()
        self._last_request = 0.0
        self._client = httpx.AsyncClient(timeout=timeout)

    async def close(self):
        await self._client.aclose()

    async def get(self, path: str, params: dict | None = None) -> dict:
        """GET a single page; returns the parsed MRData dict."""
        async with self._lock:
            wait = self.min_interval - (time.monotonic() - self._last_request)
            if wait > 0:
                await asyncio.sleep(wait)
            last_exc = None
            for attempt in range(6):
                try:
                    resp = await self._client.get(f"{BASE_URL}/{path}", params=params)
                except httpx.TransportError as exc:  # network blip
                    last_exc = exc
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue
                self._last_request = time.monotonic()
                if resp.status_code == 429:
                    # backoff: 2, 4, 8, 16, 32s
                    await asyncio.sleep(2 ** (attempt + 1))
                    continue
                resp.raise_for_status()
                return resp.json()["MRData"]
            raise RuntimeError(f"Jolpica request failed after retries: {path} ({last_exc})")

    async def get_all(self, path: str, node_path: list[str], limit: int = 100) -> list:
        """GET with pagination, concatenating the list found at node_path.

        node_path example: ["RaceTable", "Races"]
        """
        offset, total, items = 0, None, []
        while total is None or offset < total:
            mrdata = await self.get(f"{path}.json", {"limit": limit, "offset": offset})
            total = int(mrdata["total"])
            node = mrdata
            for key in node_path:
                node = node.get(key, {}) if isinstance(node, dict) else []
            if isinstance(node, list):
                items.extend(node)
            offset += limit
            if total == 0:
                break
        return items
