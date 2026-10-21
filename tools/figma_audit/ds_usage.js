// ds_usage: read-only. Finds hand-built look-alikes of DS components in screen frames (the Studio mistake of Oct 2026:
// a "pixel perfect copy" built from plain frames instead of DS instances). Set ROOT_IDS (sections or frames).
// Reports per root: how many DS instances there are, and every plain frame outside an instance that looks like a
// component (has a fill or stroke AND a text or icon child, or a corner radius with a text child): buttons, chips,
// inputs, pills, rows. Each hit must become a DS instance, or be a real layout container (then it has no fill/stroke),
// or be listed as an agreed exception. Also lists instances whose main component is local to the file (screen files
// hold no components) or not from a library.
const ROOT_IDS = globalThis.ROOT_IDS || [];
let page = await figma.getNodeByIdAsync(ROOT_IDS[0]); while (page && page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
const out = [];
for (const id of ROOT_IDS) {
  const root = await figma.getNodeByIdAsync(id); if (!root) { out.push({ id, error: 'missing' }); continue; }
  let instances = 0; const lookalikes = [], localMains = [];
  const walk = async (n, inInst) => {
    if (n.type === 'INSTANCE') { instances++; if (!inInst) { const mc = await n.getMainComponentAsync(); if (mc && !mc.remote) localMains.push(n.name); } }
    const isInst = inInst || n.type === 'INSTANCE';
    if (!isInst && (n.type === 'FRAME' || n.type === 'GROUP') && n.name !== 'Caption') {
      const painted = (n.fills && n.fills !== figma.mixed && n.fills.some(f => f.visible !== false)) || (n.strokes && n.strokes.length);
      const kids = n.children || [];
      const hasText = kids.some(k => k.type === 'TEXT'), hasIcon = kids.some(k => k.type === 'VECTOR' || (k.type === 'INSTANCE' && /icon|Icon/.test(k.name)));
      const small = n.width < 600 && n.height < 120;
      if (small && ((painted && (hasText || hasIcon)) || (n.cornerRadius > 0 && hasText))) lookalikes.push(n.name + ' ' + Math.round(n.width) + '×' + Math.round(n.height) + ' (' + n.id + ')');
    }
    if ('children' in n) for (const c of n.children) await walk(c, isInst);
  };
  await walk(root, false);
  out.push({ root: root.name, instances, lookalikes: lookalikes.slice(0, 40), lookalikeCount: lookalikes.length, localMains: localMains.slice(0, 20) });
}
return out;
