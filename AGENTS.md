# Working in this repository

Instructions for coding agents and new contributors. Read this before changing anything.

## What this is

A static web app that lets people explore the personal data they download from platforms
(Google, Instagram, Uber, …). The export is processed **in the visitor's browser, and nothing
leaves it**: no server, no CDN, no analytics. The page's Content-Security-Policy
(`public/index.html`) makes the browser enforce this.

| Folder | What it is |
|---|---|
| `experiences/<name>/` | one **experience** per data source: `src/index.ts`, `src/<name>-viewer.json`, optional `database.ts`, `sql/`, `viewer-functions.ts`, `views/*.vue` |
| `lib/` | shared `Experience` class, types, generic pipelines, configuration validation |
| `src/` | Vue 2 engine: file loading, SQLite database, tabs, shared views (`src/components/chart/view/`), Jest tests (`src/__tests__/`) |
| `app/` | the page around the engine: list of experiences, network badge |
| `public/` | page template with the CSP, icons, data samples (copied as is into `dist/`) |
| `schemas/viewer/v1.json` | JSON Schema of the viewer JSON |
| `e2e/` | zero-network Playwright test |

There is one `package.json` and one build (`vue.config.js`): experiences are compiled from
their TypeScript sources, nothing is published or prebuilt. Aliases: `@/` → `src/`,
`@lib/` → `lib/`, `@experiences/` → `experiences/`.

## Setup and checks

Node 22 (`.nvmrc`), npm 10+.

```sh
npm ci
npm run dev            # http://localhost:8080, hot reload
npm run check          # lint + typecheck + jest (unit, configuration of every experience, golden)
npm run build && npm run test:offline   # every tab of every sample, no request to another server
```

**Done means `npm run check` and `npm run test:offline` pass, and CI is green.** Focused checks:

- one Jest file: `npx jest src/__tests__/<name>`
- golden tests (every tab's output on the samples, compared with snapshots): `npm run test:golden`;
  after an intended change, `npm run test:golden -- -u` and explain the snapshot diff
- one experience in the zero-network test: `npm run test:offline -- -g <name>`
  (`CHROMIUM_PATH=/path/to/chrome` to use an installed browser)

## How an experience works

See [docs/creating-an-experience.md](docs/creating-an-experience.md). In short:

- `src/index.ts` builds `new Experience(loaderOptions, viewerOptions, packageJSON, import.meta.url, viewerFunctions)`;
  `loaderOptions.files` maps file ids to globs inside the export.
- `src/<name>-viewer.json` lists the tabs (`viewBlocks`): `sql` or `customPipeline`, optional
  `postprocessor`, a `visualization` and its `vizProps`, texts in `messages.{en,fr}`
  ([docs/viewer-messages.md](docs/viewer-messages.md)).
- `visualization` is `"./views/<File>.vue"` (a view of the experience, in its `src/views/`),
  the file name of a shared view of `src/components/chart/view/`, or an inline Vega spec.
- Every pipeline returns `{ headers, items }`. Types: `lib/types/`.
- The app lists every folder with a `src/index.ts`: there is nothing to register.

## Rules

- **Personal data.** Never commit a real person's export unless their consent is recorded.
  Put real exports for development in `experience-intake/inbox/` (git-ignored). Samples in
  `public/data-samples/` and test fixtures must be synthetic.
- **Nothing may leave the browser.** No new network request, CDN, font or tile server, no
  embedded third-party iframe. Bundle what you need. Do not loosen the CSP in
  `public/index.html`. Any change that affects this needs a human reviewer.
- **Never skip or disable a failing test to get green.** Fix the cause, or report it.
- **No visual or output change without an explanation.** A refactor must leave the golden
  snapshots unchanged; if a change is intended, update them in the same PR and explain why.
- **Don't edit generated output:** `dist/`, `test-results/`.
- **Keep changes minimal and in scope.** One goal or fix per PR, and say in the PR how you verified it.
