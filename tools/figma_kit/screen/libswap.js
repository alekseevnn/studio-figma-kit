const pg = await figma.getNodeByIdAsync(PAGE); await figma.setCurrentPageAsync(pg);
const cache = {};
const top = pg.findAllWithCriteria({types:['INSTANCE']}).filter(i => { let p = i.parent; while (p && p.type !== 'PAGE') { if (p.type === 'INSTANCE') return false; p = p.parent; } return true; });
let n = 0; const fail = [], names = {};
for (const i of top) { const mc = await i.getMainComponentAsync(); if (!mc || !mc.remote) continue;
  let nw = cache[mc.key]; if (nw === undefined) { try { nw = await figma.importComponentByKeyAsync(mc.key); } catch (e) { nw = null; } cache[mc.key] = nw; }
  if (!nw || nw.id === mc.id) continue;
  try { const w = i.width, h = i.height, x = i.x, y = i.y; i.swapComponent(nw); if (Math.abs(i.width-w)>0.01||Math.abs(i.height-h)>0.01) i.resize(w,h); if (!i.parent.layoutMode || i.parent.layoutMode === 'NONE' || i.layoutPositioning === 'ABSOLUTE') { i.x = x; i.y = y; } n++; const k = (mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name : mc.name); names[k] = (names[k]||0)+1; } catch (e) { fail.push(i.id + ' ' + e.message.slice(0, 50)); } }
return {page: pg.name, swapped: n, names, fail: fail.slice(0, 5)};
