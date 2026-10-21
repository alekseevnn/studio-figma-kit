#!/usr/bin/env python3
"""Save the JSON result of the most recent use_figma call in this Claude session to a file, so a Figma dump
does not have to be retyped. Usage: python3 tools/figma_audit/last_figma_result.py out.json [nth-from-last]
Looks for the newest session transcript under ~/.claude/projects (or $CLAUDE_TRANSCRIPT)."""
import json, sys, os, glob
path = os.environ.get('CLAUDE_TRANSCRIPT') or max(glob.glob(os.path.expanduser('~/.claude/projects/*/*.jsonl')), key=os.path.getmtime)
nth = int(sys.argv[2]) if len(sys.argv) > 2 else 1
ids, results = {}, []
for line in open(path):
    try: d = json.loads(line)
    except Exception: continue
    c = (d.get('message') or {}).get('content')
    if not isinstance(c, list): continue
    for b in c:
        if b.get('type') == 'tool_use' and b.get('name', '').endswith('use_figma'): ids[b['id']] = 1
        if b.get('type') == 'tool_result' and b.get('tool_use_id') in ids:
            t = b.get('content'); t = t if isinstance(t, str) else ''.join(x.get('text', '') for x in t if isinstance(x, dict))
            results.append(t)
txt = results[-nth]
json.loads(txt)   # must be JSON
open(sys.argv[1], 'w').write(txt)
print(f'saved {len(txt)} chars from {os.path.basename(path)} ({len(results)} use_figma results)')
