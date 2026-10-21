# figma_audit: measure the prototype against Figma

The prototype is the reference; the Figma frames (set the page id in your `map.json`) must match it to the pixel,
because developers build from Figma. These scripts turn "looks the same" into numbers. The stages that use them are in
[STUDIO.md](../../STUDIO.md) (section 6, the checks); what is drawn is in your `FIGMA.md`.

Setup: serve your prototype folder on 8801 (`cd <folder> && setsid nohup python3 -m http.server 8801 &`, or set `PROTO_BASE`) and run node with
`NODE_PATH=/home/claude/.npm-global/lib/node_modules`.

| File | What it does |
|---|---|
| `map.json` | One entry per component variant or state: `id`, `figma` (node id), `viewport` (the app size), `mobile`, `setup` (clicks, scrolls, hovers, eval to open the state), `root` (CSS), `rootInset` (padding of the prototype root that the Figma root lacks), `parts` (`name`, `css`, `fig` path, `checks`, optional `tol` with `why`). |
| `proto.js` | Opens each entry in Chromium and measures every part relative to the root: box, radius, padding, gap, font, colours, border. `node proto.js [ids] > proto.json` |
| `make_dump.py` | Prints the `use_figma` script that measures the same parts in Figma (returns only the checked fields). `python3 make_dump.py [ids]` → paste the printed code into `use_figma`. Two batches for the whole map (20 KB result limit). |
| `last_figma_result.py` | Saves the last `use_figma` result from this session's transcript: `python3 last_figma_result.py figma.json`. |
| `compare.py` | `python3 compare.py proto.json figma.json [ids]`: lists every difference; 0.9 px geometry tolerance (or the part's `tol`), colours within 3/255 and 0.03 alpha, fonts exact. Exits 1 when anything differs. |
| `lint.js` | `use_figma` script (set `ROOT_IDS`; works in any file, the page is taken from the first root): colour overrides on instances, colours not bound to a variable, text without a DS style, strokes included in layout. Read-only. |
| `ds_usage.js` | `use_figma` script (set `ROOT_IDS`): hand-built look-alikes of DS components (plain frames with a fill or stroke and a text or icon inside), and local components in a screen file. Read-only. Done at 0. |
| `outline.js` | Box tree of one prototype element, to read against a Figma outline: `node outline.js 1440 900 0 '[{"click":".hd-lib"}]' '.lib-page' 3`. |
| `blocks.js` | Page positions of sections, to check a Figma screen frame's spacing: `node blocks.js 402 874 1 '[]' '.lib-top|.lib-grid|footer'`. |
| `fonts/inter-opsz.woff2` | The variable Inter the live page loads from Google Fonts (`@fontsource-variable/inter` 5.1.0, OFL). The sandbox cannot reach Google Fonts, so every script serves this file instead; without it text wraps differently. |

Path syntax in `fig`: `A/B/C` = child A (direct child first, else first descendant), then B inside it…; `*3` = the third visible child; `Name#2` = the
second direct child with that name; `=Exact/Name` = a layer whose own name contains a slash (`=Title/H6`); `.` = the root.

Known noise (allowed with `tol`): hug-width text buttons ±2 px (browser vs Figma text metrics), baseline-aligned labels
±1 px. Larger differences are real.
