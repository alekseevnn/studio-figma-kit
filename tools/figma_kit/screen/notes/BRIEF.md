# Brief: rich Interaction notes for the Figma screen files

Context. Repo: /home/claude/claude-prototypes (read CLAUDE.md, DESIGN.md, IMPLEMENTATION.md for your area). The prototype
`p-4f6cb6/index.html` (~11k lines, single file) is the source of truth for behaviour: when DESIGN.md / IMPLEMENTATION.md
and the code disagree, the code wins (list the disagreement under "discrepancies"). Figma has two screen files:
- Platform `Xjrir3Iyzu0B1n164tJEsG` (viewer web app: desktop 1440 frames + "Mobile web" 402 frames)
- Mobile App `x0fVtWzE3HM6E0QbGIivGd` (the native app, 402 frames)
Each page has sections Screens, States & cases, Interaction notes, Responsive. Today the Interaction notes cards are thin
(2–3 lines) and a developer (or their coding agent, who has NO access to the repo or the prototype) has to guess which
frame in Screens / States shows which behaviour. The design lead (Can) wants:
- Every behaviour that is not obvious from a still picture written down, even simple ones. His examples: on the phone the
  player controls disappear 3 s after the last tap while playing (visible frame vs hidden frame); the first tap on Save
  saves to Watch later straight away, but a second tap (or the notice's "Change") opens the Save to list.
- Each note explicitly tied to the frames that show it (we will turn your frame ids into clickable links on the card, and
  put a link back from each frame to its note).

What counts (look for all of these in the code for your area): triggers and results (tap / click / hover / long press /
swipe / drag / keyboard / wheel / scroll), first vs repeat actions, toggles and their both directions, timers and
auto-hide, what opens what and what closes it (outside tap, Esc, swipe down, back), where it returns to, what is
remembered (resume point, last tab, filters), signed-out gates (what opens the log-in dialog / sheet and what happens
after logging in), empty / zero / one / many cases, long text and truncation, loading, errors, undo, notices, motion
(what moves, how long, easing in the agent note), responsive switches (thresholds where layout or behaviour changes),
differences between desktop, mobile web and the native app (app: long press, native share, rotation/landscape, PiP,
autoplay with sound, status bar / home indicator, no hover), accessibility focus / keyboard where the code has it.

Output: write ONE JSON file (path given in your task) shaped:
{
  "page": "<page name>",
  "prefix": "<ID prefix>",
  "cards": [
    {
      "id": "SVP-01",                       // prefix + two digits, in reading order (general first, edge cases later)
      "title": "Controls hide while playing", // short, sentence case, no trailing period
      "for": ["desktop", "mobile web", "app"], // where it applies
      "summary": "One sentence: what this is and why it matters.",
      "steps": ["Tap the video → the controls show.", "No tap for 3 s while playing → they fade out (controls hidden)."],
      "steps_app": [ ... ],                // ONLY if the app's steps differ; else omit
      "edge": ["Paused, scrubbing or a sheet open → they stay."], // rules and edge cases; may be []
      "see": {
        "platform": [["171:19827", "visible while playing"], ["414:21256", "hidden after 3 s"]],
        "app": [["2068:55138", "..."]]
      },                                   // frame ids FROM THE INVENTORY ONLY, each with a 2–5 word label of what it shows
      "agent": ["Exact values: durations, easings, thresholds, classes/state rules, z-order …"],
      "agent_app": [ ... ]                 // ONLY if different for the app
    }
  ],
  "missing_frames": [["platform|app", "what state is not drawn but should be", "suggested frame name"]],
  "discrepancies": ["doc vs code differences you found"]
}
Writing rules: plain English, short sentences, present tense, real UI names as the UI shows them (button labels in quotes
only when it helps). Steps use "→" between trigger and result. Platform cards use click/hover for desktop and tap for
mobile web; say which when both apply ("Click (tap on the phone) …"). Numbers and names must come from the code; never
invent. One behaviour (or a tight group) per card; prefer more, smaller cards over long ones; typically 8–25 cards for a
page. Cover every frame of your pages' States & cases in at least one card's "see" (a frame no card explains is a gap).
Keep the existing cards' content (read them, below) but fold it into this structure and enrich it; the agent notes they
already carry are good material (also on disk: tools/figma_kit/screen/*notes*.json).

Reading Figma (READ-ONLY; never change anything in Figma; call use_figma with skillNames "figma-use"):
1. Frame inventory of a page (ids you may use in "see"):
```
const P = await figma.getNodeByIdAsync('<pageId>'); await P.loadAsync(); const out = [];
for (const s of P.children) { if (s.type !== 'SECTION' || !/Screens|States/.test(s.name)) continue;
  const walk = (n, path) => { for (const c of n.children) { if (c.type === 'SECTION') walk(c, path + ' › ' + c.name); else if (c.type === 'FRAME' && c.name !== 'Title' && c.width > 300) out.push(c.id + ' | ' + path + ' › ' + c.name + ' | ' + ((c.findOne(t => t.type === 'TEXT' && t.name === 'Range') || {}).characters || '')); } };
  walk(s, s.name); }
return out;
```
2. Existing notes text of a page:
```
const P = await figma.getNodeByIdAsync('<pageId>'); await P.loadAsync();
const s = P.children.find(c => c.type === 'SECTION' && /Interaction notes/.test(c.name));
return s ? s.findAll(n => n.name.startsWith('Note · ')).map(c => c.name + '\n' + c.findAll(t => t.type === 'TEXT').map(t => t.characters).join('\n')) : [];
```
Run your Figma reads one after another (not in parallel). Finish with a short reply: the JSON path, card count, and the
missing_frames and discrepancies lists.


**Agent notes (Can, 20 Oct 2026):** the developers don't use the prototype's code, only look at it. Never name our CSS classes, element ids, function or variable names, data attributes or hash tokens. Write product terms with exact values (durations, delays, easing curves, sizes, distances, opacities, thresholds, event order, state rules), DS component / variant / token names, and product URL shapes.
