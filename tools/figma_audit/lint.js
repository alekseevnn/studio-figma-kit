// Figma lint for any AITV screen file (run through use_figma; set ROOT_IDS to the sections or frames to scan).
// Read-only. Reports, per scanned root:
//  - colour overrides: an instance layer whose solid fill/stroke differs from its main component's layer
//    (the "recoloured pill" bug: a badge that kept a red override after a swap)
//  - unbound colours: a solid fill/stroke not bound to a DS variable (custom colour)
//  - unstyled text: a text layer without a DS text style (mixed styles are fine when every run has one)
//  - strokes in layout: an auto-layout frame whose stroke pushes its content in (check it mirrors the code)
//  - fixed bars: a child that should fill its auto-layout parent but is FIXED and narrower (progress bars, rows)
const ROOT_IDS = globalThis.ROOT_IDS || [];
const EXEMPT = /Glow|Veil|glow|veil|ds-exempt|Wash|Gradient|Blur|Tint|Scrim|Overlay/;   // layers allowed a custom colour
// the page of the first root (any file: Platform, Mobile App, Studio, DS)
let page = await figma.getNodeByIdAsync(ROOT_IDS[0]); while (page && page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
const hex = (c, o) => '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('') + (o != null && o < 1 ? '@' + o.toFixed(2) : '');
const solid = (ps) => (ps && ps !== figma.mixed ? ps : []).filter(p => p.visible !== false && p.type === 'SOLID');
const key = (ps) => solid(ps).map(p => (p.boundVariables && p.boundVariables.color ? 'v:' + p.boundVariables.color.id : hex(p.color, p.opacity))).join(',');
const path = (n, root) => { const a = []; for (let x = n; x && x !== root; x = x.parent) a.unshift(x.name); return a.join(' / '); };
const vname = {}; const vn = async (id) => { if (!(id in vname)) { const v = await figma.variables.getVariableByIdAsync(id); vname[id] = v ? v.name : id; } return vname[id]; };
const pretty = async (k) => { const out = []; for (const s of k.split(',').filter(Boolean)) out.push(s.startsWith('v:') ? await vn(s.slice(2)) : s); return out.join(','); };
const report = [];
for (const rid of ROOT_IDS){
  const root = await figma.getNodeByIdAsync(rid); if (!root) { report.push({rid, error: 'missing'}); continue; }
  const r = {root: root.name, id: rid, overrides: [], unbound: [], unstyled: [], strokesIn: [], fixedBars: []};
  const nodes = root.findAll(() => true);
  for (const n of nodes){
    if (n.visible === false) continue;
    // colour overrides inside instances
    if (n.type === 'INSTANCE' && n.overrides){
      for (const o of n.overrides){
        if (!o.overriddenFields.some(f => f === 'fills' || f === 'strokes')) continue;
        const ln = await figma.getNodeByIdAsync(o.id); if (!ln || ln.visible === false) continue;
        const mid = o.id.split(';').pop(); const ml = o.id === n.id ? await n.getMainComponentAsync() : await figma.getNodeByIdAsync(mid);
        if (!ml) continue;
        for (const f of ['fills', 'strokes']){
          if (!o.overriddenFields.includes(f) || !(f in ln) || !(f in ml)) continue;
          const a = key(ln[f]), b = key(ml[f]);
          if (a && b && a !== b && !EXEMPT.test(ln.name)) r.overrides.push(`${path(ln, root)} [${f}] ${await pretty(a)} ≠ main ${await pretty(b)}`);
        }
      }
    }
    // unbound colours (skip nodes inside instances: their main is checked where it lives)
    const inInst = (() => { for (let x = n.parent; x && x !== root; x = x.parent) if (x.type === 'INSTANCE') return true; return false; })();
    if (!inInst && !EXEMPT.test(path(n, root))){
      for (const f of ['fills', 'strokes']){
        if (!(f in n) || n.type === 'SECTION' || (n.type === 'COMPONENT_SET' && f === 'strokes') || (n.type === 'FRAME' && n.parent && n.parent.type === 'SECTION' && f === 'fills' && /^#ffffff$/.test(key(n.fills)))) continue;   // Figma's own set outline and section-label frames
        for (const p of solid(n[f])) if (!(p.boundVariables && p.boundVariables.color)) r.unbound.push(`${path(n, root)} [${f}] ${hex(p.color, p.opacity)}`);
      }
      if (n.type === 'TEXT' && (!n.textStyleId || (n.textStyleId === figma.mixed && n.getStyledTextSegments(['textStyleId']).some(sg => !sg.textStyleId)))) r.unstyled.push(`${path(n, root)} "${n.characters.slice(0, 24)}" ${String(n.fontSize)}`);
    }
    if (!inInst && 'strokesIncludedInLayout' in n && n.strokesIncludedInLayout && n.layoutMode !== 'NONE' && solid(n.strokes).length) r.strokesIn.push(`${path(n, root)} stroke ${String(n.strokeWeight)}`);
    if (!inInst && n.parent && n.parent.layoutMode === 'VERTICAL' && n.layoutSizingHorizontal === 'FIXED' && /Progress|Bar|Row|Divider|Track/i.test(n.name) && n.width < n.parent.width - n.parent.paddingLeft - n.parent.paddingRight - 1) r.fixedBars.push(`${path(n, root)} ${Math.round(n.width)} of ${Math.round(n.parent.width - n.parent.paddingLeft - n.parent.paddingRight)}`);
  }
  const cap = (a) => a.length > 40 ? [...a.slice(0, 40), `… +${a.length - 40} more`] : a;
  report.push({root: r.root, id: rid, counts: {overrides: r.overrides.length, unbound: r.unbound.length, unstyled: r.unstyled.length, strokesIn: r.strokesIn.length, fixedBars: r.fixedBars.length}, overrides: cap(r.overrides), unbound: cap(r.unbound), unstyled: cap(r.unstyled), strokesIn: cap(r.strokesIn), fixedBars: cap(r.fixedBars)});
}
return report;
