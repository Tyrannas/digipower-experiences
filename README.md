# Data experiences

Explore the personal data that platforms (Instagram, Google, Uber, Netflix, …) collect
on you, from the export they give you, **entirely on your computer**: the export is
read, turned into a database and charted in your browser, and nothing is sent anywhere.

A fork of [digipower-experiences](https://github.com/digipower-academy/digipower-experiences),
originally developed by [HestiaLabs](https://hestialabs.org), reduced to a single app
that works offline.

## Run it

Node 22 (see `.nvmrc`) and npm 10 or later.

```sh
npm ci
npm run build                                   # → dist/
python3 -m http.server 8000 --directory dist    # or any static file server
```

Open http://localhost:8000, choose a platform and drop your export (or try a sample).

`dist/` can be zipped and copied anywhere. It only needs a static file server: browsers
do not load modules and workers from `file://`, so opening `index.html` directly does not work.

## Check that nothing leaves your computer

- **Disconnect from the internet**, then use the app: it works the same.
- `public/index.html` sets a strict **Content-Security-Policy**: the browser itself refuses
  to contact any server other than the one serving the page, and logs every attempt in
  the console.
- The **badge** at the top right lists every resource loaded from another origin and every
  request the policy blocked. It is green when both lists are empty.
- On Linux, run the server without network access:
  `unshare -rn python3 -m http.server 8000 --directory dist`.
- `npm run test:offline` loads the sample of every experience, opens every tab, and fails on
  any request to another server (it runs in CI).

The maps show countries only (Natural Earth, bundled): street-level detail would need a
local tile file.

## Work on it

```sh
npm run dev          # http://localhost:8080, hot reload
npm run check        # lint, type check, unit and golden tests
npm run build && npm run test:offline
```

| Folder | Content |
|---|---|
| `experiences/<name>/` | one experience per platform: which files to read, tables, queries, tabs, its own views |
| `lib/` | what experiences share: the `Experience` class, types, generic pipelines, validation |
| `src/` | the engine: reads the export, builds the database, runs the tabs, shared views |
| `app/` | the page: list of experiences, network badge |
| `public/` | page template (with the CSP), icons, data samples |
| `schemas/` | JSON Schema of the viewer JSON files |
| `e2e/` | the zero-network test |

To add or change an experience, see [docs/creating-an-experience.md](docs/creating-an-experience.md).
Contributors and coding agents: read [AGENTS.md](AGENTS.md).

## Differences with the original project

- No website, no sharing with a server ("bubbles"), no npm packages: one static app.
- Everything the app used to load from CDNs (SQLite engine, date formats, fonts) is bundled.
- Maps use MapLibre on a bundled background instead of Kepler.gl and Mapbox; videos are links.
- An experience is one folder, with its own views, compiled from its sources by a single build.

## Credits

The Yoojo (formerly Babysits) and Uber Eats experiences have been developed by Serhii Moshtakov
and Fabian Studer, students at FHNW University of Applied Sciences and Arts Northwestern
Switzerland with Prof. Anton Fedosov.
This project has been improved under SPARK project "Participatory Methodology for AI
Accountability in the Gig Economy: A Comparative Study of (Digital) Labour Conditions Between
the French- and German-Speaking Cantons of Switzerland" (Principal Investigator: Jessica Pidoux,
University of Neuchatel).

Credits for an experience go in the `credits` field of its viewer JSON (with translations in
`messages.<lang>.intro.credits`); they are shown on the experience's introduction.

## License

AGPL-3.0-or-later, see [LICENSE.md](LICENSE.md) and [COPYING.md](COPYING.md).
