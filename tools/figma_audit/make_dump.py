#!/usr/bin/env python3
"""Print the use_figma script that dumps the Figma side of map.json entries.
Usage: python3 tools/figma_audit/make_dump.py [entry-id ...] > /tmp/dump.js
Paste the printed code into use_figma (file oCYmA3I5JSCsd8sN7CaVoH), save its JSON result as figma.json
(next to proto.json), then run compare.py. Part paths: "A/B/C" = descendant named A, then inside it B, ...
(first match, depth-first; "." = the root itself; "*3" = the third visible child)."""
import json, sys, os
here = os.path.dirname(os.path.abspath(__file__))
m = json.load(open(os.path.join(here, os.environ.get('MAP', 'map.json'))))
want = sys.argv[1:]
entries = [{'id': e['id'], 'figma': e['figma'], 'parts': [{'name': p['name'], 'fig': p['fig'], 'c': p.get('checks')} for p in e['parts']]}
           for e in m['entries'] if not want or e['id'] in want]
JS = r"""
const ENTRIES = %s;
const page = await figma.getNodeByIdAsync('%s');
await figma.setCurrentPageAsync(page);
const W = {Thin:100, 'Extra Light':200, Light:300, Regular:400, Medium:500, 'Semi Bold':600, Bold:700, 'Extra Bold':800, Black:900};
const col = (ps) => { const p = (ps && ps !== figma.mixed ? ps : []).find(x => x.visible !== false && x.type === 'SOLID'); return p ? [Math.round(p.color.r*255), Math.round(p.color.g*255), Math.round(p.color.b*255), +(p.opacity ?? 1).toFixed(3)] : null; };
const find = (root, path) => { if (path === '.') return root; if (path[0] === '=') { const rest = path.slice(1).split('/*'); let n = root.findOne(c => c.name === rest[0]); if (n && rest[1]) n = n.children.filter(c => c.visible !== false)[+rest[1] - 1]; return n; } let n = root; for (let seg of path.split('/')) { if (!n || !('findOne' in n)) return null; if (/^\*\d+$/.test(seg)) { n = 'children' in n ? n.children.filter(c => c.visible !== false)[+seg.slice(1) - 1] : null; continue; } let k = 1; const mm = seg.match(/^(.*)#(\d+)$/); if (mm){ seg = mm[1]; k = +mm[2]; } const direct = 'children' in n ? n.children.filter(c => c.name === seg) : []; n = direct[k - 1] || (k === 1 ? n.findOne(c => c.name === seg) : null); } return n; };
const out = {};
for (const e of ENTRIES){
  const root = await figma.getNodeByIdAsync(e.figma); if (!root) { out[e.id] = {error: 'figma node missing ' + e.figma}; continue; }
  const rb = root.absoluteBoundingBox, o = {root: {w: rb.width, h: rb.height}};
  for (const p of e.parts){
    const n = find(root, p.fig); if (!n || n.visible === false) { o[p.name] = {missing: true}; continue; }
    const b = n.absoluteBoundingBox;
    const r = {x: b.x - rb.x, y: b.y - rb.y, w: b.width, h: b.height, r: b.x + b.width - rb.x, b: b.y + b.height - rb.y,
      radius: typeof n.cornerRadius === 'number' ? n.cornerRadius : (n.topLeftRadius || 0),
      pad: 'paddingTop' in n ? [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft] : null,
      gap: 'itemSpacing' in n && n.layoutMode && n.layoutMode !== 'NONE' ? n.itemSpacing : null,
      bg: n.type === 'TEXT' ? null : col(n.fills), border: 'strokes' in n && col(n.strokes) ? (typeof n.strokeWeight === 'number' ? n.strokeWeight : 1) : 0, borderColor: 'strokes' in n ? col(n.strokes) : null,
      strokesInLayout: 'strokesIncludedInLayout' in n ? !!n.strokesIncludedInLayout : false};
    if (n.type === 'TEXT'){
      const fn = n.fontName === figma.mixed ? n.getRangeFontName(0, 1) : n.fontName, lh = n.lineHeight === figma.mixed ? n.getRangeLineHeight(0, 1) : n.lineHeight;
      const fs = n.fontSize === figma.mixed ? n.getRangeFontSize(0, 1) : n.fontSize;
      r.font = {size: fs, lh: lh.unit === 'PIXELS' ? lh.value : null, weight: W[fn.style.replace(' Italic', '')] || fn.style, family: fn.family};
      r.color = col(n.fills); r.maxLines = n.maxLines || null;
      if (n.textStyleId && n.textStyleId !== figma.mixed){ const s = await figma.getStyleByIdAsync(n.textStyleId); r.style = s ? s.name : null; }
    }
    if (n.type === 'INSTANCE'){ const mc = await n.getMainComponentAsync(); r.component = mc ? ((mc.parent && mc.parent.type === 'COMPONENT_SET') ? mc.parent.name + ' / ' + mc.name : mc.name) : null; }
    // keep only what compare.py checks for this part (keeps a batch under use_figma's 20 KB result limit)
    if (p.c) { const keep = {}; for (const k of p.c) if (k in r) keep[k] = r[k]; if (r.style && p.c.includes('font')) keep.style = r.style; o[p.name] = keep; } else o[p.name] = r;
  }
  out[e.id] = o;
}
// compact: round to 0.001 (alpha needs it) and drop empty fields so a batch stays under use_figma's 20 KB result limit
const cmp = (v) => { if (typeof v === 'number') return Math.round(v * 1000) / 1000; if (Array.isArray(v)) return v.map(cmp); if (v && typeof v === 'object'){ const o = {}; for (const k in v){ const x = v[k]; if (x === null || x === false || x === undefined || (k === 'border' && x === 0) || (k === 'radius' && x === 0)) continue; if (k === 'pad' && x.every(q => q === 0)) continue; o[k] = cmp(x); } return o; } return v; };
return cmp(out);
"""
print(JS % (json.dumps(entries, separators=(',', ':')), m.get('page', '19303:41217')))
