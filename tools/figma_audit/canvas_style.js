// canvas_style: checks and fixes the canvas style on every "↪︎" page (Can, 21 Oct 2026): page background #17181A;
// top-level sections bg/level-2 with a white 50 % 4 px inside stroke; every section inside a section neutral/900 with a
// white 10 % 1 px inside stroke. Set globalThis.FIX = true to fix; returns what was off per page. Run after any job
// that creates or rebuilds sections (notes groups, States & cases topics, new pages).
const FIX = !!globalThis.FIX;
const lv2 = await figma.variables.importVariableByKeyAsync('995f805c0d9f1c3002633a93955a9d3d05855baf');   // bg/level-2
const n900 = await figma.variables.importVariableByKeyAsync('fb5495d0da5c4353204b440482545d8ff4368f46');  // neutral/900
// The paint's own colour must be the variable's value too: sections show (and detach to) the raw colour, so a bound
// paint built on black looked black in Figma (21 Oct 2026).
const RAW = { [lv2.id]: { r: 0x23 / 255, g: 0x24 / 255, b: 0x26 / 255 }, [n900.id]: { r: 0x17 / 255, g: 0x18 / 255, b: 0x1a / 255 } };
const solid = (v) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: RAW[v.id] }, 'color', v);
const isVar = (n, v) => n.fills && n.fills.length === 1 && n.fills[0].boundVariables && n.fills[0].boundVariables.color && n.fills[0].boundVariables.color.id === v.id
  && Math.abs(n.fills[0].color.r - RAW[v.id].r) < 0.003 && Math.abs(n.fills[0].color.b - RAW[v.id].b) < 0.003;
const okStroke = (n, op, w) => n.strokes.length === 1 && Math.abs((n.strokes[0].opacity ?? 1) - op) < 0.01 && n.strokeWeight === w && n.strokeAlign === 'INSIDE';
const PG = { r: 0x17 / 255, g: 0x18 / 255, b: 0x1a / 255 };
const out = {};
for (const p of figma.root.children.filter(p => p.name.startsWith('↪︎'))) { await p.loadAsync(); const bad = [];
  const bg = p.backgrounds[0];
  if (!bg || Math.abs(bg.color.r - PG.r) > 0.002 || Math.abs(bg.color.g - PG.g) > 0.002 || Math.abs(bg.color.b - PG.b) > 0.002) { bad.push('page background'); if (FIX) p.backgrounds = [{ type: 'SOLID', color: PG }]; }
  const walk = (node, depth) => { for (const c of node.children || []) if (c.type === 'SECTION') {
    const top = depth === 0, v = top ? lv2 : n900, op = top ? 0.5 : 0.1, w = top ? 4 : 1;
    if (!isVar(c, v) || !okStroke(c, op, w)) { bad.push((top ? 'section ' : 'sub-section ') + c.name);
      if (FIX) { c.fills = [solid(v)]; c.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: op }]; c.strokeWeight = w; c.strokeAlign = 'INSIDE'; } }
    walk(c, depth + 1); } };
  walk(p, 0); if (bad.length) out[p.name] = bad; }
return Object.keys(out).length ? out : 'ok';
