#!/usr/bin/env python3
"""Incremental Interaction notes updates (Can, 21 Oct 2026): rebuild only the cards whose content changed.
1. In Figma, run notes_hashes.js (read-only, inline) and save its result as <hashes.json>.
2. notes_sync.py <platform|app> <hashes.json> <out dir>
   Builds the cards from notes/*.json (as mknotes.py does), hashes each card, and writes self-contained call files
   (inote.js + inote_minikit.js inline) only for pages with changes: changed / new cards are rebuilt (the old copy is
   removed), cards no longer in the JSON are removed, the page is laid out again (FINISH). Prints the plan.
3. Run the call files in order, then the links pass (inote_links.js inline).
   `--seed` instead writes <out dir>/seed.js: stores the current hashes in the cards (only when Figma matches the JSON)."""
import json, os, sys, hashlib, subprocess, glob
HERE = os.path.dirname(os.path.abspath(__file__))
PAGES = {'platform': {'Common': '8:2', 'Homepage': '8:3', 'Explore': '448:2', 'Browse': '8:4', 'Search': '8:5', 'Library': '8:6', 'SVP': '8:7',
                      'Profiles': '8:8', 'Share & Embed': '8:9', 'Notifications': '8:10', 'Authentication': '8:11'},
         'app': {'Common': '2003:2', 'Homepage': '2003:3', 'Explore': '2003:4', 'Browse': '2003:5', 'Search': '2003:6', 'Library': '2003:7', 'SVP': '2003:8',
                 'Profiles': '2003:9', 'Share & Embed': '2003:10', 'Notifications': '2003:11', 'Authentication': '2003:12'}}
# Another team's files: put a pages.json next to this script, {"platform": {"<page name>": "<page id>"}, "app": {...}}
# ("platform" = the web file, "app" = the Mobile App file); page names are the "page" values in the notes JSON.
if os.path.exists(os.path.join(HERE, 'pages.json')): PAGES = json.load(open(os.path.join(HERE, 'pages.json')))
seed = '--seed' in sys.argv; args = [a for a in sys.argv[1:] if a != '--seed']
side, hashes_path, out = args[0], args[1], args[2]
tmp = os.path.join(out, '_cards.json'); os.makedirs(out, exist_ok=True)
for f in glob.glob(os.path.join(out, '*.js')): os.remove(f)
src = [p for p in sorted(glob.glob(os.path.join(HERE, 'notes', '*.json'))) if not os.path.basename(p).startswith(('drawn', 'ds-added'))]
subprocess.run([sys.executable, os.path.join(HERE, 'mknotes.py'), tmp] + src, check=True, stdout=subprocess.DEVNULL)
pages = {}
for p, cs in json.load(open(tmp))[side].items(): pages.setdefault('SVP' if 'SVP' in p else p, []).extend(cs)
H = lambda c: hashlib.sha1(json.dumps(c, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]
for cs in pages.values():
    for c in cs: c['hash'] = H(c)
if seed:
    S = {PAGES[side][p]: {c['id']: c['hash'] for c in cs} for p, cs in pages.items()}
    open(os.path.join(out, 'seed.js'), 'w').write('globalThis.SEED=' + json.dumps(S) + ';\n' + open(os.path.join(HERE, 'notes_hashes.js')).read())
    print('seed.js written'); sys.exit()
have = json.load(open(hashes_path))
ino = open(os.path.join(HERE, 'inote.js')).read(); mk = open(os.path.join(HERE, 'inote_minikit.js')).read()
line = "const K = await new AF(figma.root.getSharedPluginData('claudekit', 'skit'))();"
body = "return await (async () => {\n" + ino.replace(line, "const K = await (async () => {\n" + mk + "\n})();") + "\n})();"
plan = []
for p, cs in pages.items():
    pid = PAGES[side][p]; cur = have.get(pid, {})
    changed = [c for c in sorted(cs, key=lambda c: c['id']) if cur.get(c['id']) != c['hash']]
    removed = sorted(set(cur) - {c['id'] for c in cs})
    if not changed and not removed: continue
    batches, b, sz = [], [], 0
    for c in changed:
        l = len(json.dumps(c, ensure_ascii=False))
        if b and (len(b) >= 3 or sz + l > 24000): batches.append(b); b, sz = [], 0
        b.append(c); sz += l
    batches.append(b)
    files = []
    for i, b in enumerate(batches):
        fn = os.path.join(out, f"{side}_{len(plan):02d}_{pid.replace(':', '-')}_{i}.js")
        g = f"globalThis.PAGE_ID='{pid}'; globalThis.FINISH={'true' if i == len(batches) - 1 else 'false'}; globalThis.REMOVE={json.dumps(removed if i == 0 else [])};\n"
        open(fn, 'w').write(g + 'globalThis.CARDS=' + json.dumps(b, ensure_ascii=False) + ';\n' + body); files.append(fn)
    plan.append({'page': p, 'pageId': pid, 'rebuild': [c['id'] for c in changed], 'remove': removed, 'calls': files})
json.dump(plan, open(os.path.join(out, 'plan.json'), 'w'), indent=1)
for x in plan: print(x['page'], 'rebuild', x['rebuild'], 'remove', x['remove'], len(x['calls']), 'calls')
if not plan: print('nothing to do')
