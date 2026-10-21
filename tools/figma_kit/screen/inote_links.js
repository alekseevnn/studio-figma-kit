// claudekit/inotelinks: rewrites every frame's "Notes:" back-link line from all note cards in the file (a frame can be
// linked from cards on several pages, e.g. Common frames from Authentication cards; inote.js's FINISH only sees its own
// page). Run after inote on all pages. Optional global PAGES (page ids) limits which frames are rewritten.
// Self-contained (21 Oct 2026): the two helpers it needs, with the AITV DS keys, instead of the kit stored in the file
const K = (() => { const V = {}, T = {};
  const fill = async (node, n) => { const key = { 'text/tertiary': '2f403ca90926b3093e5230fd6a6c9c8cd24009fc' }[n];
    const v = V[n] || (V[n] = await figma.variables.importVariableByKeyAsync(key));
    node.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, 'color', v)]; return node; };
  const text = async (parent, chars, st, color, o = {}) => { const key = { 'Paragraph/X Small': '282a6a7fd0a531567496ebea66de304a80146668' }[st];
    const s = T[st] || (T[st] = await figma.importStyleByKeyAsync(key)); const t = figma.createText(); if (parent) parent.appendChild(t);
    await figma.loadFontAsync(s.fontName); await t.setTextStyleIdAsync(s.id); t.characters = chars; if (color) await fill(t, color);
    t.name = o.name || chars.slice(0, 40); if (o.fillW) { t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; } return t; };
  return { fill, text }; })();
const nb = (s) => { const i = s.lastIndexOf(' '); return i > 0 ? s.slice(0, i) + ' ' + s.slice(i + 1) : s; };
const linked = {}; let cards = 0;
for (const p of figma.root.children) { await p.loadAsync();
  const sec = p.children.find(s => s.type === 'SECTION' && /Interaction notes/.test(s.name)); if (!sec) continue;
  for (const n of [sec, ...sec.children.filter(x => x.type === 'SECTION')].flatMap(S => S.children)) { if (!n.name.startsWith('Note · ')) continue; const d = n.getSharedPluginData('claudekit', 'note'); if (!d) continue;
    const c = JSON.parse(d); cards++; for (const id of c.see || []) (linked[id] = linked[id] || []).push([c, n]); } }
const done = [], skipped = [];
for (const [id, list] of Object.entries(linked)) {
  const f = await figma.getNodeByIdAsync(id); if (!f) { skipped.push('missing ' + id); continue; }
  let cap = f.children && f.children.find(c => c.name === 'Caption');
  // A main screen has no Caption (its frame is the screen itself): its Notes line goes above it, in the section (21 Oct 2026)
  const above = !cap && f.parent && f.parent.type === 'SECTION';
  if (!cap && !above) { skipped.push(f.name); continue; }
  if (above) { for (const t of f.parent.children.filter(t => t.type === 'TEXT' && t.name === 'Notes · ' + f.id)) t.remove(); }
  list.sort((a, b) => a[0].id < b[0].id ? -1 : 1);
  if (cap) for (const t of cap.children.filter(t => t.name === 'Notes')) t.remove();
  let s = 'Notes: '; const parts = [];
  for (const [i, [c, card]] of list.entries()) { const seg = list.length > 3 ? c.id : c.id + ' ' + c.title; parts.push([s.length, s.length + seg.length, card.id]); s += seg + (i < list.length - 1 ? ' · ' : ''); }
  const t = above ? await K.text(f.parent, nb(s), 'Paragraph/X Small', 'text/tertiary', { name: 'Notes · ' + f.id })
                  : await K.text(cap, nb(s), 'Paragraph/X Small', 'text/tertiary', { name: 'Notes', fillW: true });
  if (above) { t.textAutoResize = 'HEIGHT'; t.resize(f.width, t.height); t.x = f.x; t.y = f.y - t.height - 16; }
  for (const [a, b, cid] of parts) { t.setRangeHyperlink(a, b, { type: 'NODE', value: cid }); t.setRangeTextDecoration(a, b, 'UNDERLINE'); }
  done.push(id);
}
return { cards, frames: done.length, skipped };
