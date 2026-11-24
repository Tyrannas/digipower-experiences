# Offline app

One static folder that runs every experience in the browser, with no request to
any other server. A data export is read, turned into a database and charted on
the visitor's computer only.

## Use it

```sh
(cd packages && npm ci)                          # TypeScript tooling and the experiences' libraries
cd data-experience && npm ci
npm run offline:build                            # → offline/dist (about 22 MB, 10 MB of samples)
python3 -m http.server 8000 --directory offline/dist
```

There is one build: it compiles the engine and every experience from its
sources (`packages/packages/experiences/*/src`); no `dist/` of packages is used.

Open http://localhost:8000. `offline/dist` can be zipped and copied anywhere: it
only needs a static file server (ES modules and workers do not load from `file://`).

While working on an experience: `npm run offline:dev` (http://localhost:8081).
A change to one of its views updates the open page in place, with the data still
loaded; a change to its TypeScript, SQL or viewer JSON is recompiled, then reload
the page.

## Check that nothing leaves the computer

- `offline/index.html` sets a strict Content-Security-Policy: the browser itself
  refuses to contact any other origin, and logs each attempt in the console.
- The badge at the top right lists every resource loaded from another origin and
  every request the policy blocked. It is green when both lists are empty.
- `npm run offline:test` loads the sample of every experience, opens every tab,
  and fails on any external request, blocked request or page error.
  `CHROMIUM_PATH=/path/to/chrome` uses an already installed browser.
- Or simply disconnect from the internet, or on Linux:
  `unshare -rn python3 -m http.server 8000 --directory offline/dist`.

## What changed for this

| Before | Now |
|---|---|
| SQLite engine (`sql-wasm.wasm`) from cdnjs | bundled (`src/utils/sql.js`) |
| d3 date locales from jsdelivr | bundled (`TheDataExperience.vue`) |
| Kepler.gl iframe from unpkg, Mapbox tiles | MapLibre map, same props (`UnitKepler.vue`) |
| Carto basemap (Uber Eats trips) | offline style: Natural Earth countries (`src/utils/offline-map-style.js`) |
| Vimeo / YouTube players | link to the video (`BaseVideo.vue`) |
| icons and samples on raw.githubusercontent.com | copied into `dist/`, URLs rewritten (`offline/App.vue`) |
| Twitter word cloud placeholder from iconfinder | inline SVG |
| Bubbles (sharing with a server) | not available in this app |

The map background shows countries only. Street-level detail needs a local
vector tile file (PMTiles), not done yet.

## Add an experience

An experience is one folder, `packages/packages/experiences/<name>/`:

```
<name>/
  package.json            name "@hestia.ai/<name>", version
  src/
    index.ts              which files of the export to read, and how (loaderOptions)
    database.ts           optional: tables built from those files
    sql/*.sql             queries used by the tabs
    <name>-viewer.json    the tabs: title, sql or pipeline, visualization, texts (en, fr)
    viewer-functions.ts   optional: custom pipelines and postprocessors
    views/*.vue           optional: this experience's own charts
```

Start by copying `database-template`. The app finds the folder on its own (it
loads every `*/src/index.ts`); restart `offline:dev` after creating it.

A tab's `visualization` is either:
- `"./views/MyChart.vue"`: a view of this experience, in `src/views/`. It receives
  the tab's result as `values` (rows) and `headers`, plus its `vizProps`;
- the name of a shared view, in `data-experience/src/components/chart/view/`
  (`"ChartViewDashboard.vue"`, `"ChartViewGenericMap.vue"`, ...);
- an inline Vega-Lite specification.

Views use the engine's components and helpers through `@/` (for example
`@/components/chart/view/mixin`, `@/components/chart/view/shared/ViewCard.vue`),
and the experience library through `@lib/`.
