// Structure lint (19 Oct 2026; WORKFLOW.md → "Structure: auto layout everywhere"). Read-only; run through use_figma.
// Globals: PAGE_ID (the page), ROOT_IDS (optional: frames or sections to scan; default every top-level node of the page).
// Reports every frame outside instances that has more than one child and no auto layout. The job is done at 0.
// Frames whose children are only vector shapes (an illustration, the cover art) are listed apart as "graphic".
const page = await figma.getNodeByIdAsync(globalThis.PAGE_ID);
await figma.setCurrentPageAsync(page);
const roots = (globalThis.ROOT_IDS && globalThis.ROOT_IDS.length) ? await Promise.all(globalThis.ROOT_IDS.map(id => figma.getNodeByIdAsync(id))) : page.children;
const SHAPES = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE', 'ELLIPSE', 'RECTANGLE', 'GROUP']);
const path = n => { const a = []; for (let x = n; x && x.type !== 'PAGE'; x = x.parent) a.unshift(x.name.slice(0, 30)); return a.join(' / '); };
const none = [], graphic = [];
let frames = 0, abs = 0;
const walk = n => {
  if (n.type === 'INSTANCE') return;
  if (n.type === 'FRAME' || n.type === 'COMPONENT') {
    frames++;
    if (n.layoutMode === 'NONE' && n.children.length >= 2) (n.children.every(c => SHAPES.has(c.type)) ? graphic : none).push(n.id + '  ' + path(n));
  }
  if (n.type !== 'SECTION' && n.parent && n.parent.type !== 'SECTION' && n.parent.type !== 'PAGE' && n.layoutPositioning === 'ABSOLUTE') abs++;
  if ('children' in n) n.children.forEach(walk);
};
roots.forEach(walk);
return { page: page.name, frames, absoluteLayers: abs, withoutAutoLayout: none.length, graphic: graphic.length, list: none.slice(0, 60), graphicList: graphic.slice(0, 20) };
