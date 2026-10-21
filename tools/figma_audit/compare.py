#!/usr/bin/env python3
"""Compare prototype (proto.json from proto.js) with Figma (figma.json from make_dump.py's script).
Usage: python3 tools/figma_audit/compare.py proto.json figma.json [entry-id ...]
Every part lists its checks in map.json; defaults: boxes x,y,w,h; text x,y,font,color.
Tolerances: geometry 0.9px (a 1px difference fails), colour 3/255 per channel and 0.03 alpha, font exact. Exit code 1 if anything differs."""
import json, sys, os
here = os.path.dirname(os.path.abspath(__file__))
M = {e['id']: e for e in json.load(open(os.path.join(here, os.environ.get('MAP', 'map.json'))))['entries']}
P = json.load(open(sys.argv[1])); F = json.load(open(sys.argv[2])); want = sys.argv[3:]
GEO = 0.9   # sub-pixel centring and text-width rounding are not design differences; 1px is
def close_col(a, b):
    if a is None or b is None: return a == b
    return all(abs(a[i] - b[i]) <= 3 for i in range(3)) and abs(a[3] - b[3]) <= 0.03
bad = 0; total = 0
for eid, en in M.items():
    if want and eid not in want: continue
    if eid not in P or eid not in F: print(f'## {eid}: not measured on both sides'); continue
    p0, f0 = P[eid], F[eid]
    ix, iy = en.get('rootInset', [0, 0])   # the prototype root's own padding (e.g. the page gutter) that the Figma component does not have
    for k, v in p0.items():
        if isinstance(v, dict) and 'x' in v: v['x'] -= ix; v['r'] -= ix; v['y'] -= iy; v['b'] -= iy
    if 'error' in p0 or 'error' in f0: print(f"## {eid}: {p0.get('error') or f0.get('error')}"); bad += 1; continue
    lines = []
    for part in en['parts']:
        n = part['name']; a = p0.get(n, {}); b = f0.get(n, {})
        if a.get('missing') or b.get('missing'):
            lines.append(f"  {n}: missing in {'prototype' if a.get('missing') else 'Figma'}"); continue
        checks = part.get('checks') or (['x', 'y', 'font', 'color'] if 'font' in b else ['x', 'y', 'w', 'h'])
        for c in checks:
            total += 1
            if c in ('x', 'y', 'w', 'h', 'r', 'b', 'radius', 'gap', 'border'):
                z = 0 if c in ('radius', 'gap', 'border') else None   # the compact dump drops zero radius / border
                va, vb = a.get(c, z), b.get(c, z)
                if va is None or vb is None or abs(va - vb) > part.get('tol', GEO): lines.append(f'  {n}.{c}: prototype {va if va is None else round(va, 1)} · Figma {vb if vb is None else round(vb, 1)}')
            elif c == 'pad':
                va, vb = a.get('pad') or [0, 0, 0, 0], b.get('pad') or [0, 0, 0, 0]
                if not va or not vb or any(abs(x - y) > GEO for x, y in zip(va, vb)): lines.append(f'  {n}.pad: prototype {va} · Figma {vb}')
            elif c == 'font':
                fa, fb = a.get('font', {}), b.get('font', {})
                if (fa.get('size'), fa.get('lh'), fa.get('weight')) != (fb.get('size'), fb.get('lh'), fb.get('weight')):
                    lines.append(f"  {n}.font: prototype {fa.get('size')}/{fa.get('lh')} {fa.get('weight')} · Figma {fb.get('size')}/{fb.get('lh')} {fb.get('weight')} ({b.get('style')})")
            elif c in ('color', 'bg', 'borderColor'):
                if not close_col(a.get(c), b.get(c)): lines.append(f'  {n}.{c}: prototype {a.get(c)} · Figma {b.get(c)}')
            elif c == 'component':
                exp = part.get('component')
                if exp and exp not in (b.get('component') or ''): lines.append(f"  {n}.component: expected '{exp}' · Figma '{b.get('component')}'")
            else: lines.append(f'  {n}: unknown check {c}')
    bad += len(lines)
    print(f"## {eid} ({en.get('note', '')}): {'OK' if not lines else str(len(lines)) + ' difference(s)'}")
    for l in lines: print(l)
print(f'\n{bad} difference(s) in {total} checks')
sys.exit(1 if bad else 0)
