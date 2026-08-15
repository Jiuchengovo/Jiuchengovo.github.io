#!/usr/bin/env python3
"""Fetch GitHub contribution data for the site's Activity section.

Output: docs/theme/data/contributions.json (shape expected by site-github.js):
{
  "totalContributions": int,
  "fetchedAt": "YYYY-MM-DDTHH:MM:SSZ",
  "contributions": [{"date": "YYYY-MM-DD", "count": int, "level": 0-4}, ...]
}

Uses the public GitHub-contributions API. Run before `mkdocs build`
(e.g. in the deploy workflow). Failures leave the previous JSON untouched.
"""
import json
import os
import ssl
import sys
import urllib.request

USER = "Jiuchengovo"
API = f"https://github-contributions-api.jogruber.de/v4/{USER}?y=last"
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "theme", "data", "contributions.json")
OUT = os.path.normpath(OUT)


def main():
    ctx = ssl.create_default_context()
    req = urllib.request.Request(API, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    payload = {
        "totalContributions": int(data.get("total", {}).get("lastYear", 0)),
        "fetchedAt": __import__("datetime").datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "contributions": data.get("contributions", []),
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"Wrote {OUT} ({len(payload['contributions'])} days, {payload['totalContributions']} contributions)")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # noqa: BLE001 — never break the deploy over the graph
        print(f"[fetch-contributions] failed: {e}", file=sys.stderr)
        sys.exit(0 if os.path.exists(OUT) else 1)
