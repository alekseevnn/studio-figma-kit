# Studio prototypes: instructions for Claude

Clickable HTML prototypes of the AI.TV **Studio** (the creator side: uploads, content management, channel, analytics) to show the CEO and hand to developers. The viewer side (homepage, Browse, Library, header menus, video player) is built by Can in `cangoktas/claude-prototypes`; this repo follows the same rules so the two sides look and behave like one product and can be merged later.

**This repo stands on its own.** Everything it needs is here: the DS in code (`ds/`), the tools (`tools/`) and these
instructions. They came from the viewer-side repo (`cangoktas/claude-prototypes`) as a zip; there is no need to read or
pull that repo. **The source of truth for the design system is the AITV DS file in Figma**
(`k1ddhR3yVccI0N0A0SJGqz`): when anything about a component, variant, colour or text style is unclear or may have
changed, look there first; the code copy in `ds/` and the gallery https://p-e9fad0.vercel.app follow it and may lag.
For how a finished viewer page looks, open the Platform Figma file (`Xjrir3Iyzu0B1n164tJEsG`, read only).

## 0. The three checks that are never skipped

A first Studio-to-Figma attempt (Oct 2026) came out as a "pixel perfect copy" built from plain frames, hard-coded
colours and new components nobody asked for, and it ignored this file. These three checks exist so that never happens
again. Run them, and say in the reply that you ran them and what they found:

1. **"Is it in the DS?"** Before building anything (in the prototype or in Figma), find the AITV DS component, variant,
   text style and colour variable for it (section 2, "DS first"). Buttons, chips, inputs, menus, dialogs, sheets,
   notices, icons and every colour come from the DS by default. Nothing is drawn by hand that the DS has.
2. **"Does it need something new?"** If the design needs a component or variant the DS lacks, **stop and ask the
   author** (the user) before making it: say what is missing, why the existing ones don't fit, and what you propose
   (usually a new variant of an existing component). Only after a yes, add it to the AITV DS file on the Studio page
   (section 6), never as a local component or a frame in a screen file.
3. **"Is it the same as the prototype?"** After building, compare: a screenshot of the Figma frame next to the
   prototype at the same width, and the measured check (`tools/figma_audit`, section 6). Plus the structure checks:
   every frame auto layout, every colour a variable, every text a DS style, no look-alike of a DS component.

A long chat drifts: start a **new chat for each phase** (designing in the prototype; moving one area into Figma), and
read this file at the start of each.

Reply to the user in the language they write in. Everything written to the repo (Markdown files, commit messages, code comments) is in English.

---

## 1. What a prototype is

- One self-contained page per prototype: `<folder>/index.html` + `<folder>/assets/`. Static site, no framework, no build step, no external CSS or JS except Google Fonts.
- Every prototype lives in its own folder with its own Vercel project. Folder, project and URL names are **neutral and random** (`p-` + 6 hex characters, e.g. `p-7f3a2c`). They must never contain "aitv", "ai-tv", "studio", "homepage", a person's name, the company name or any word that gives the product away. Asset file names are neutral too (`cover-1.webp`, `preview-1.webm`).
- Keep a "The prototypes" table in `README.md` (folder, one-line description, live link, status) and update it when a prototype is added, deployed or archived.
- Before building a request, check it against the flow it lands in. If it would create a duplicate or contradictory control (a second "Edit" next to an existing "Edit" that does something else), a dead end or a confusing flow, tell the user first, explain the clash and propose an alternative; build only after they confirm.
- Say what you left out or which trade-off you made. Don't quietly narrow the scope.

## 2. Design system (AITV DS): the only source of values

- **Figma library "AITV DS"**, file `k1ddhR3yVccI0N0A0SJGqz`. It is variable-based: take colours, radius and spacing only from the variable collections (`04-Foundations` = primitives, `03-Tokens` = semantics such as `text/primary`, `01-Radius`, `02-Spacing`). The file still has legacy colour styles (`Primary/Dark`, `Background/…`, `Text/…`, `Alpha/…`): never read values from them.
- **The DS in code** is published at **https://p-e9fad0.vercel.app** (gallery of every token, text style and component) with the files `ds.css`, `ds.js` and `tokens.json` at the same address. Gallery artifact: https://claude.ai/artifact/RLF3njBY95pc6ubRGumMry.
- **Every page carries the DS inline** (artifacts and per-folder Vercel projects can't load shared files at runtime):
  - CSS: the contents of `ds.css` at the top of the page's first `<style>`, between `/* ds:begin <version> · … */` and `/* ds:end */`.
  - JS: the contents of `ds.js` in `<script id="ds-js">…</script>` before the page's first script (it defines `window.DS`).
  - Never edit inside these blocks. When the DS changes, replace the whole block with the new files.
  - Tools: `ds/` and `tools/` in this repo (from the zip). When the DS in Figma changes in a way the code needs (a token or text style value, a base component), update `ds/` from Figma and run `ds_sync.py --all`. `python3 tools/ds_sync.py <folder>/index.html --dedupe` inlines the block into a page (new pages start with this), `--check` lists each page's DS version; `python3 tools/ds_convert.py <folder>/index.html` snaps stray values in the page's own CSS to the nearest DS value (run it after every change). DS changes are made in the Figma DS file first, then copied into `ds/`.
- **Never pick a colour or a text value by eye, and never copy DS values into the page.** Use the tokens and text styles below. A colour outside the DS only when it really must be (e.g. a colour taken from a poster), marked `/* ds-exempt: reason */`.
- A component Studio needs and the DS lacks: build it from DS tokens and text styles, and tell the user it is "Code only" (it goes into Figma only when the user asks).

### Tokens (CSS custom properties from the DS block)

| What | Tokens |
|---|---|
| Backgrounds (dark UI) | `--bg-0` (page) · `--bg-1` (cards, sheets) · `--bg-2` · `--bg-3` |
| Text | `--text-primary` · `--text-secondary` · `--text-tertiary` · `--text-disabled` · `--text-contrast` (on white) |
| Icons | `--icon-primary` · `--icon-secondary` · `--icon-tertiary` · `--icon-disabled` · `--icon-contrast` |
| White alphas (fills, strokes) | `--white-a3` `--white-a5` `--white-a10` `--white-a24` (short forms `--w3` `--w5` `--w10` `--w24`) |
| Dark alphas (washes over pictures) | `--neutral-a24` `--neutral-a60` `--neutral-a80` |
| Accents and states | `--accents-*`, `--accent-primary-*`, `--red-*`, `--green-*`, `--yellow-*` and their `-a5 / -a10 / -a24` alphas |
| Radius | `--radius-0` … `--radius-28`, `--radius-full` |
| Spacing | `--space-0` … `--space-48` (4 / 8 grid; 2 px steps only for small things like pill padding; no 11 / 13 style odd values) |
| Shadows | `--shadow-x-small` `--shadow-small` `--shadow-medium` `--shadow-large` |
| Fonts, easing | `--ff-text` (Inter) · `--ds-ease` = `cubic-bezier(.22,1,.36,1)` |

### Text styles: every rendered text uses one

Title/H1–H6 (Inter since 20 Oct 2026; Inter Display is gone from the DS) · Label/X Large, Large, Medium, Small, Compact, X Small · Paragraph/X Large, Large, Medium, Small, Compact, X Small · Subheading/Medium, Small, X Small (uppercase styles) · Subheading/2X Small (11/12, not uppercase; small pills).

- In code use the class (`.t-label-small`) or the variables: `font: var(--t-label-small); letter-spacing: var(--t-label-small-ls);` plus the guards the DS classes use (`font-variation-settings: normal` (titles: `'opsz' 32`), `font-optical-sizing: none; font-feature-settings: inherit; font-kerning: inherit`), otherwise the page's `ss01` / `ss04` alternates switch off. `button` needs `letter-spacing: inherit`.
- Font: Inter for every text and title, weights 400 and 500 only. `<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;500&display=swap" rel="stylesheet">`; on the page `-webkit-font-smoothing: antialiased; font-feature-settings: 'ss01' on, 'ss04' on;`.
- **No custom text styles** and no sizes between DS styles.

### Components: use the DS one, not a look-alike

**DS first (the order to decide in, for code and Figma alike):**
1. The DS has the component and the variant → use it (in code the `.ds-*` class; in Figma an instance of the library
   component with its variant and properties set). Adjust only through its properties, never by detaching it.
2. The DS has the component but not the exact variant → pick the closest variant and tell the user what differs; if it
   really needs a new variant, go to 3.
3. The DS lacks it → **ask the user first** (what, why, proposal). After a yes: in code build it from DS tokens and text
   styles and mark it "Code only"; in Figma add it to the AITV DS file on the Studio page (section 6) and ask the user
   to publish the library. Never put a component in a screen file, never draw a button or a chip from plain frames.
Where to look, in this order: the DS file in Figma (the truth: `get_libraries` + `search_design_system` with the file key, then the component's variants and description; viewer-side product components are on page 1887:3092), the same thing already built in the Platform file, then the code gallery https://p-e9fad0.vercel.app (may lag behind Figma). Default look: buttons are DS Buttons [1.1], colours are the DS variables, text is a DS text style. If unsure which one,
look at how `p-4f6cb6` and the Platform Figma file (`Xjrir3Iyzu0B1n164tJEsG`) do the same thing, and use that.

- Buttons `.ds-btn` + style (`--primary` white, `--secondary` alpha-5 fill + alpha-10 stroke, `--lighter` alpha-5, `--ghost`, `--overlay` on pictures) + size (`--2xs` 28, `--xs` 32, `--sm` 36, default 40, `--lg` 56) + `--round` (rounded) + `--icon` (icon only). Two-state buttons ("Follow" ⇄ "Following") use `.ds-toggle` / `DS.toggle`: same states, only label and icon change.
- Chips `.ds-chip` (`--sm`, `--xs`, `--round`), text input `.ds-field` (`--sm`, `--xs`), toggle switch `.ds-switch`, segmented control `.ds-seg` (`--round`), radio `.ds-radio` and checkbox `.ds-check` inside a clickable row `.ds-choice` (with `role` + `aria-checked`), tooltip `.ds-tip`, link `.ds-link`, footer `.ds-footer`.
- Tune a component for a context with its custom properties (`--h`, `--px`, `--gap`, `--ic`, `--r`) instead of re-drawing it.
- If the Studio frames in Figma use Studio-specific components (they differ from the viewer side in places, e.g. 40 px buttons with radius 10), follow the Figma frames and the library's variables; ask the user when Figma and the DS disagree.
- Icons: the DS icon set is **Vuesax** (Linear for outline, Bold for filled / active; npm `iconsax-react` has the same paths), plus a few Remix icons the DS uses (`more-2-fill` for every "more", `add-large-line` for Upload). Sound toggles use the DS **Volume (Nuvel)** set (volume-high / volume-cross). Take icons from the DS file, never draw your own.

### No linear scaling

A component that has to be bigger on large screens gets a bigger **variant** (its own size, insets, icons and DS text style, on the 4 / 8 grid), never a ×1.4 scale. Name variants by size only: `XS`, `S`, `M`, `L`, `XL`, `XXL`, and write the window or card range each size is used at in the component description (a device name in brackets misleads, because the layout follows the window width, not the device); one Size property per component. Only things that fill a grid column may have a fractional width. Same in Figma: never `rescale` an instance (it multiplies its text styles); swap the variant.

## 3. UI rules

- Dark UI on `--bg-0`. Cards radius 12–16, popovers `--shadow-*` + `--w10` ring.
- **Motion:** easing `--ds-ease`; 0.2–0.3 s (large carousel moves up to 0.5 s). Nothing pops in or out: appear and disappear with opacity + a small transform. If content changes, fade out fully, change, fade in. Hover popovers open after ~300 ms and close after ~100–140 ms so they don't flicker. No springy / overshoot motion on frequent interactions.
- Hover styles only inside `@media (hover:hover)`. Touch feedback `:active{transform:scale(.96)}` (scale only). Every tappable thing has a hit area of at least 44 × 44 (enlarge with a `::before`). `-webkit-tap-highlight-color: transparent`. Inputs on the phone use 16 px text (iOS zooms on focus otherwise).
- Phone: reference viewport 402 wide (must work from 375 to 440); shown as a native app, no browser mockup; `viewport-fit=cover` and `env(safe-area-inset-*)` on fixed bars.
- Things to avoid (AI clichés): no coloured dot + UPPERCASE letter-spaced eyebrow above a title; no UPPERCASE section labels (sentence case); no "made with AI" copy or made-up ratings; no underline on hover; no centred title + eyebrow sections; the meta line always reads `70 Episodes · Fantasy, Romance` (with `·`).
- Every clickable thing that has no page yet shows a small notice ("This would open the X page") instead of doing nothing.

## 4. Performance (checked on every change)

1. **Never put `backdrop-filter` on anything repeated per item** (badges, pills, list rows, table cells, thumbnails). Use a flat fill (`--neutral-a80` over pictures). ~200 small blurs under one big blur stalled scrolling in the viewer prototype; that is why this rule exists.
2. Big blurs: at most a few single, non-repeated ones on screen (a header, a sheet, a toast). A progressive header blur has at most 3 layers. Turn a big blur off (`backdrop-filter:none`) while its layer is hidden.
3. Never blur a large image live (`filter: blur(50–80px)`): bake it once into a small canvas copy, or use static gradients.
4. Frequent and scroll-time motion animates `transform` and `opacity` only. No layout properties (width, height, top, margin) on grids or repeated items. `will-change` only on the few things that really animate.
5. Every scroll / wheel / touch listener is `{passive:true}` unless it must `preventDefault`. Scroll handlers read first, then write; use hysteresis on thresholds (e.g. on past 24 px, off under 4 px) so states don't flicker.
6. Video: VP9 WebM with an H.264 MP4 fallback (pick with `canPlayType`), `muted loop playsinline preload="none"`, set `src` only when it is about to play, fade the video in only after `play()` resolves (never a black or frozen frame), one preview playing at a time, pause off screen (IntersectionObserver) and in a background tab.
7. Images: WebP under `assets/`, `loading="lazy"` on everything below the fold.
8. Reduced motion: `@media (prefers-reduced-motion:reduce){*{transition-duration:.01ms!important;animation-duration:.01ms!important}}`, and skip JS animations (WAAPI ignores the CSS rule).

## 5. Before calling a job done

- Serve the folder (`python3 -m http.server`) and check it in a headless browser (Playwright; Chromium is usually preinstalled, don't run `playwright install`): desktop 1440 × 900 and phone 402 × 874 with `isMobile` + `hasTouch`. Take screenshots and look at them; check hover, pressed, open / closed and animation states, empty states, long text, signed out.
- No console errors.
- Every visible text resolves to a DS text style and every colour to a DS token (compare computed styles against `tokens.json`; `ds_convert.py` alone misses things).
- Every control is a DS component (`.ds-btn`, `.ds-chip`, `.ds-field` …), not a hand-styled `div` or `button`: list the page's buttons, chips and inputs and check each one has its DS class. A "Code only" component was approved by the user.
- Walk the flow for logic errors (dead ends, duplicate controls, buttons that do nothing).
- If the prototype is also a Claude artifact, republish it after every change.

## 6. Figma

**Files.** Studio screens: **Studio** `kvlQeKRZLLbwuUs155SXkP` (creator web) and the • STUDIO • part of **Mobile App**
`x0fVtWzE3HM6E0QbGIivGd` (creator screens in the app). Components: **AITV DS** `k1ddhR3yVccI0N0A0SJGqz`
(https://www.figma.com/design/k1ddhR3yVccI0N0A0SJGqz/AITV-DS). The viewer side lives in **Platform**
`Xjrir3Iyzu0B1n164tJEsG`: open it to see how a finished page looks (page layout, sections, captions, notes). Never
write to Platform or to the Archive file `oCYmA3I5JSCsd8sN7CaVoH`.

**Rules**
- Read-only checks are always fine. **Changes only when the user asks**; collect them and do them as one batch.
- **Screen files hold no components**, only instances of the AITV DS library. Every button, chip, input, menu, sheet,
  dialog, notice, avatar, icon is a DS instance with its variant and properties set; never detached, never rebuilt
  from frames, never `rescale`d (swap to the bigger variant).
- **New components only with the user's yes** (section 0), and only in the AITV DS file, on a Studio page of its own
  (create it once, e.g. "Studio · New", next to the viewer side's product page 1887:3092; name new components
  "[Studio] …", auto layout, DS variables and text styles only, each variant's use in the component description).
  Then the user publishes the library; accept the update in the screen file before using it
  (`tools/figma_kit/screen/libswap.js`, inline, also for nested instances).
- **Every value from the DS:** colours bound to the variable collections (`03-Tokens` semantics such as `text/primary`,
  `04-Foundations`, `01-Radius`, `02-Spacing`), text with a DS text style. A raw hex, an unstyled text or a spacing
  that is not on the DS scale is a bug. The legacy colour styles in the DS file are never used.
- **Auto layout everywhere:** every frame with more than one child is auto layout and mirrors the prototype's
  containers (flex / grid → auto layout, gap → item spacing, padding → padding). Absolute position only where the code
  is absolute (overlays, badges, glows). Matching pixels with hand-placed x / y is a failure even when it looks right.
- A state is drawn from the same component as the default state (its variant), never from look-alike parts.

**How a page is laid out (copy this exactly; it is how Platform and Mobile App are built):**
- One page per area, named "↪︎ <Area>"; page background #17181A; four sections stacked top to bottom at x 0, 200 apart: Screens ·
  States & cases · Interaction notes · Responsive. Top-level section fill `bg/level-2`, stroke white 50 % 4 px inside;
  a section inside one (a topic) `neutral/900`, stroke white 10 % 1 px inside; content 100 in from the section edge.
- Screens: each main screen at 1440 with its 402 phone version beside it (the app at 402 with status bar, bottom nav
  and home indicator).
- States & cases: every state and edge case, grouped into topic sections (Title/H1 heading at 100 / 100, frames from
  y 204), desktop frame then its phone frame 40 to the right, the next case 160 further. Each case frame: vertical auto
  layout gap 16, a Caption (Title in Label/X Large `text/primary` = the frame name; Range in Paragraph/Small
  `text/secondary` = what it shows; Notes in Paragraph/X Small `text/tertiary`), then the screen.
- Responsive: 3440 · 2560 · 1920 · 1440 · 1180 · 960 · 820 · 660 · 640 · 430 · 402 · 375 · 360, each labelled.
- Interaction notes: one card per behaviour a still can't show, grouped like States & cases, linked both ways with the
  frames (`tools/figma_kit/screen`: write the cards as JSON as `notes/BRIEF.md` says, then `notes_hashes.js` →
  `notes_sync.py` → run its call files → `inote_links.js`; only new or changed cards are rebuilt; frame changes alone:
  `inote_thumbs.js`; its `README.md` has the steps).

**Checks before saying a Figma job is done** (all read-only, in `tools/figma_audit`; run them with `use_figma`,
code sent inline):
1. `ds_usage.js` (set `ROOT_IDS` to the sections you touched): 0 look-alikes of DS components, 0 local components.
2. `lint.js`: 0 unbound colours, 0 texts without a DS style, 0 colour overrides.
3. `structure.js`: 0 frames with several children and no auto layout.
4. Screenshot of every frame you made next to the prototype at the same width; then `figma_audit` (`proto.js`,
   `make_dump.py`, `compare.py`; its README) for the screen's main parts: 0 differences, or each one explained.
5. `tools/figma_kit/page-layout-check.js` with `FIX = false`: nothing overlaps.
6. `tools/figma_audit/canvas_style.js`: page background and section / sub-section styles as above (`FIX = true` fixes).
Report the six results in the reply, and anything you could not check.

**Calls.** Load the figma-use skill before `use_figma`. One call at a time per file. Calls are atomic and time out on
big page-wide scans: work per section, return small results; "MCP server connection lost" sometimes still applied the
change, so re-read before retrying. Send helper code inline (code stored in a file's plugin data may be refused by the
permission check). Before a big job, time one call and tell the user how many calls and how long it will take.
Changes to the DS library need a publish (the user can publish) before other files see them.

## 7. Git

- Commit author `Claude <noreply@anthropic.com>` (repo-local config). Push finished commits to GitHub; keep prototype commits and doc commits separate.
- Don't ask for or use a GitHub token. Don't touch proxy or credential settings. If there's no access, stop and tell the user.

## 8. Vercel: rules

- **Deploy only when the user explicitly asks** ("deploy", "update the link"). The user's own Vercel account (its own team, not Can's) is on the free plan: **100 deployments a day for the whole account, rolling 24 hours**, and a canceled deployment still counts. Find the team id once with the Vercel tools and use it for every call.
- **Git auto-deploys are off.** Every prototype folder has this `vercel.json` (copy it into every new folder). It stops pushes from creating deployments and tells search engines and bots not to index anything (`X-Robots-Tag: noindex, nofollow` on every path):

  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "git": { "deploymentEnabled": false },
    "headers": [
      { "source": "/(.*)", "headers": [ { "key": "X-Robots-Tag", "value": "noindex, nofollow" } ] }
    ]
  }
  ```
  Never add a sitemap, and no names or titles that would make a page findable (see the naming rule in section 1). The links stay open to anyone who has them.
- On every project also keep `enableAffectedProjectsDeployments: true` and `sourceFilesOutsideRootDirectory: false`, as a second guard in case Git deploys are turned back on.
- **One deploy touches only the prototype concerned.** Deploy with the Vercel `create_deployment` tool, one call per prototype: `teamId` = the team, `requestBody` = `{"name": "<folder>", "project": "<folder>", "target": "production", "gitSource": {"type": "github", "org": "<org>", "repo": "<repo>", "ref": "main", "sha": "<pushed commit SHA>"}}`. Push first; deploy the pushed SHA.
- After deploying: wait until the deployment is `READY` (`get_project` → `latestDeployment`), and check that `<folder>.vercel.app` opens **without signing in** and that images and videos load. The sandbox often can't reach `*.vercel.app`; then confirm with `get_project` (READY, `ssoProtection` off) and the Vercel `web_fetch_vercel_url` tool.
- **In every reply after a deploy:** write the full production link with the scheme (`https://p-7f3a2c.vercel.app`), never only the folder name or the long deployment URL; and give the daily status: count the team's deployments of the last 24 hours with `list_deployments` (`since` = now − 24 h, follow pagination) and write "X/100 used in the last 24 hours". If the limit is full (the API answers `402 api-deployments-free-per-day`) or close to it, look at the oldest deployments and say when the next slot opens.

### First deploy of a new prototype

1. Put the files in the neutral folder on `main`, add `vercel.json`, commit and push.
2. Create the Vercel project: project name = folder name, `rootDirectory` = folder name, no framework, linked to this GitHub repo (`create_project` with `gitRepository: {type: "github", repo: "<org>/<repo>"}`, `rootDirectory`, `framework: null`, `ssoProtection: null`).
3. **Make it public** (`ssoProtection: null`, Vercel Authentication off): the CEO has no Vercel account.
4. Deploy as above, check that it opens without signing in, and check the noindex header (`curl -sI https://<folder>.vercel.app | grep -i x-robots-tag`).
5. Updates: push to the same folder and deploy the same project again, so the URL never changes.

If no Vercel tools are available (connector or CLI), stop before creating the project and tell the user.

## 9. Docs to keep current

- `DESIGN.md`: rules and decisions for the Studio pages (replace the old line instead of adding a contradicting one).
- `IMPLEMENTATION.md`: exact values, thresholds and code names for developers (say what each number is and give its unit).
- `README.md`: the prototypes table (see section 1).
- `FIGMA.md`: what is drawn in Figma (pages, section and frame ids), the states still to draw, the DS components added or requested, and a dated history line per Figma job, so a new chat can pick up.
Update them in the same piece of work as the prototype change.
