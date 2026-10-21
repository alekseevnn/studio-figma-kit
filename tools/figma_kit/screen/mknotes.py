#!/usr/bin/env python3
"""Turn structured notes (one JSON per area, shaped as in notes/BRIEF.md) into the CARDS arrays inote.js takes, per file.
Usage: mknotes.py <out.json> <in1.json> [in2.json …]
Out: {"platform": {"<page>": [cards]}, "app": {"<page>": [cards]}} — platform keeps desktop / mobile web, the app keeps app."""
import json, sys

out = {"platform": {}, "app": {}}
for path in sys.argv[2:]:
    d = json.load(open(path))
    pages = d["pages"] if "pages" in d else [d]
    for p in pages:
        for c in sorted(p["cards"], key=lambda c: c["id"]):
            f = c.get("for", [])
            web = [x for x in f if x in ("desktop", "mobile web")]
            if web:
                out["platform"].setdefault(p["page"], []).append({
                    "id": c["id"], "title": c["title"], "for": web, "summary": c.get("summary", ""),
                    "steps": c.get("steps", []), "edge": c.get("edge", []),
                    "see": c.get("see", {}).get("platform", []), "agent": c.get("agent", []), "diagram": c.get("diagram"), "group": c.get("group")})
            if "app" in f:
                out["app"].setdefault(p["page"], []).append({
                    "id": c["id"], "title": c["title"], "for": ["app"], "summary": c.get("summary_app", c.get("summary", "")),
                    "steps": c.get("steps_app") or c.get("steps", []), "edge": c.get("edge_app") or c.get("edge", []),
                    "see": c.get("see", {}).get("app", []), "agent": c.get("agent_app") or c.get("agent", []),
                    "diagram": c.get("diagram_app") or c.get("diagram"), "group": c.get("group_app") or c.get("group")})
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
for k, v in out.items():
    print(k, {p: len(cs) for p, cs in v.items()})
