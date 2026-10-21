# Studio Figma kit

Everything the Studio repo needs to build prototypes and move them into Figma the way the viewer side (Platform and
Mobile App files) is built. Copy the folders into the root of the Studio repo (`ds/`, `tools/`, `STUDIO.md`) and
commit them; from then on the Studio repo does not depend on any other repo.

**Source of truth for the design system: the AITV DS file in Figma** (`k1ddhR3yVccI0N0A0SJGqz`). `ds/` is its code copy
(tokens, text styles, base components) for the prototypes; when Figma changes in a way the code needs, update `ds/`
from Figma (`ds/tokens.json`, `ds/components.css`, then `python3 tools/ds_build.py` and `python3 tools/ds_sync.py --all`).

Read `STUDIO.md` first: it is the instructions file for Claude (sections 0, 2 and 6 are the ones that matter for Figma).

## What is in `tools/`

| Path | What it is for | How to run |
|---|---|---|
| `ds_sync.py`, `ds_convert.py`, `ds_build.py` | Put the DS block into a prototype page, snap stray CSS values to DS values, rebuild `ds/ds.css`. | STUDIO.md section 2 |
| `figma_audit/ds_usage.js` | **"Is it in the DS?"** for Figma: finds plain frames that imitate DS components (buttons, chips, inputs, pills drawn by hand) and local components in a screen file. Done at 0. | `use_figma`, code inline, with `globalThis.ROOT_IDS = ['<section or frame id>', …];` in front |
| `figma_audit/lint.js` | Colours not bound to a DS variable, texts without a DS text style, colour overrides on instances, strokes pushing layout. Done at 0. | same, `ROOT_IDS` |
| `figma_audit/structure.js` | Frames with more than one child and no auto layout. Done at 0. | same, `globalThis.PAGE_ID` (+ optional `ROOT_IDS`) |
| `figma_audit/proto.js`, `make_dump.py`, `compare.py`, `last_figma_result.py`, `outline.js`, `blocks.js`, `fonts/` | **"Is it the same as the prototype?"** in numbers: measures parts of the prototype in Chromium and the same parts in Figma, then lists every difference. | `figma_audit/README.md`; make your own `map.json` (see `map.example.json`); serve your prototype on port 8801 or set `PROTO_BASE` |
| `figma_audit/canvas_style.js` | Page background #17181A, sections bg/level-2 + white 50 % 4 px stroke, sub-sections neutral/900 + white 10 % 1 px. `FIX = true` fixes. | `use_figma`, inline |
| `figma_kit/page-layout-check.js` | Sections or note cards that overlap. Read-only by default (`FIX = false`). | `use_figma`, inline |
| `figma_kit/states_group.js` | Lays out a page's States & cases by topic (one section per topic, desktop + phone 40 apart, cases 160 apart). | `use_figma`, inline, globals in its header |
| `figma_kit/screen/libswap.js` | After a DS publish: swaps a page's instances to the new versions (keeps size and position). Then also check nested instances. | `use_figma`, inline, `const PAGE='<page id>';` in front |
| `figma_kit/screen/notes/BRIEF.md` + `mknotes.py`, `notes_sync.py`, `notes_hashes.js`, `inote.js`, `inote_minikit.js`, `inote_links.js`, `inote_thumbs.js` | Interaction notes cards: written as JSON in `figma_kit/screen/notes/<area>.json`, built into the page's Interaction notes section, linked both ways with the frames. Only new or changed cards are rebuilt. | below |

## Interaction notes, step by step

1. Write or edit the cards in `tools/figma_kit/screen/notes/<area>.json` (shape and rules in `notes/BRIEF.md`).
2. Copy `pages.example.json` to `pages.json` and fill in your page ids ("platform" = the web file, here the Studio
   file; "app" = the Mobile App file).
3. In Figma, run `notes_hashes.js` inline (read-only); save its result as `hashes.json`
   (`python3 tools/figma_audit/last_figma_result.py hashes.json`).
4. `python3 tools/figma_kit/screen/notes_sync.py platform hashes.json out/` writes the call files for the cards that
   changed (the first time: every card). Run each file's content with `use_figma`, in order.
5. Run `inote_links.js` inline: every frame's "Notes:" line links to its cards (underlined).
6. Frames changed but no card text did: `inote_thumbs.js` inline with `globalThis.PAGE_ID` (and optional `FRAMES`)
   refreshes the cards' thumbnails only.

## Rules that save hours

- One `use_figma` call at a time per file. Send code inline (don't store helpers in a file's plugin data and run them
  from there; the permission check may refuse it). Keep calls under about 30 KB.
- Before a big job, time one call, multiply, and tell the user how long it will take.
- Order: DS gaps → one DS publish → screens → notes last. Small changes touch only what they change.
