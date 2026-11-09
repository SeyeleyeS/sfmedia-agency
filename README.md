# Static Custom Concierge demo

A browser-only fictional desk. Open `index.html` from a static host. Intake, rule classification, FAQ drafts, escalation, scheduling requests, and local review all run in the page. Fictional tasks stay in **this browser’s localStorage**. They are not shared, there is no backend, and there is no account.

**FICTIONAL DEMO — NOT CONNECTED TO LIVE SERVICES.**

sfmedia.agency is the chosen future name for Custom Concierge. This folder does not publish that domain, change DNS, or redirect BAMedia. Hosting and review happen separately, after approval.

Urban Concierge links to the existing external brief at `https://bamedia.agency/bads/` (Bay Area events and dining, with compact weather and travel notes). The page does not embed or refresh that brief. The industry list is planned only, not a live photo feed.

Price: (blank).

## Files

- `index.html`, `styles.css`, `app.js` — the demo. No build step and no external assets.
- `.nojekyll` — tells GitHub Pages to serve the folder as plain files.

Paths are relative, and screens use hash links (`#intake`, `#tasks`), so a static host does not need rewrites.

## GitHub Pages, after approval

This package does not enable Pages or change a domain. When someone approves hosting:

1. Publish the contents of `static-demo/` as the site root (or set the Pages directory to `static-demo`).
2. Leave `.nojekyll` in that directory.
3. Turn on Pages for the branch you choose. Do not add a BAMedia redirect and do not change DNS from this demo.
4. Visitors open the Pages URL. Each browser keeps its own fictional tasks. Clearing site data removes them.

A desktop that cannot unzip still only needs the hosted URL. The zip exists so the folder can be handed to the person who will host it.

## Try on a machine that can run a static server

```bash
cd static-demo
python3 -m http.server 8931 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8931/`. Binding to loopback is for a local check. It is not the public site, and it is not production security.

Some browsers restrict `localStorage` for `file://` pages. Use a static host when you need tasks to persist.

## Tests

From the repository root:

```bash
python3 -m unittest tests.test_static_demo -v
```

The test serves this folder on `127.0.0.1`, drives the page in headless Chrome, and checks classification, escalation, scheduling, review, reset, escaping, and localStorage across a second page load.

## This repository

GitHub Pages serves these files from the repository root. `CNAME` remains `sfmedia.agency`. `.nojekyll` stays in this directory. `/bads/` still redirects to the existing Urban Concierge at https://bamedia.agency/bads/. The site before the October 2026 homepage redirect remains at tag `pre-redirect-2026-10-29`. DNS and email are unchanged.
