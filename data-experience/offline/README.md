# Offline app

One static folder that runs every experience in the browser, with no request to
any other server. A data export is read, turned into a database and charted on
the visitor's computer only.

## Use it

```sh
cd packages && npm ci && npm run build          # the experiences
cd ../data-experience && npm ci
npm run offline:build                            # → offline/dist (about 22 MB, 10 MB of samples)
python3 -m http.server 8000 --directory offline/dist
```

Open http://localhost:8000. `offline/dist` can be zipped and copied anywhere: it
only needs a static file server (ES modules and workers do not load from `file://`).

While working on views: `npm run offline:dev` (http://localhost:8081, hot reload;
run `npm run dev` in `packages/` too to rebuild experiences on change).

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

Create `packages/packages/experiences/<name>/` (start from `database-template`),
build it, and it appears on the home page: the app loads every
`experiences/*/dist/index.mjs` it finds.
