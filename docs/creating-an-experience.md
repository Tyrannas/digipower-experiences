# Creating an experience

An experience turns the data export of one platform into tabs of charts. It is one
folder, `experiences/<name>/`; the app finds it on its own (every `*/src/index.ts`).

```
experiences/<name>/
  package.json            {"name": "@hestia.ai/<name>", "version": "0.0.1"}: the name must match the folder
  src/
    index.ts              which files of the export to read (loaderOptions)
    database.ts           optional: the tables built from those files
    sql/*.sql             optional: queries, imported by index.ts or blocks.ts
    <name>-viewer.json    the tabs, their texts in English and French
    viewer-functions.ts   optional: custom pipelines and postprocessors, in TypeScript
    views/*.vue           optional: charts made for this experience
```

Start from a copy of `experiences/database-template/`, then `npm run dev`
(http://localhost:8080). A change to a view updates the open page in place, with the
data still loaded; after any other change, reload the page.

## 1. Read the export: `index.ts`

```ts
import packageJSON from '../package.json'
import { Experience, LoaderOptions, ViewerOptions } from '@lib/index'
import viewerOptions from './my-platform-viewer.json'
import databaseConfig from './database'

const loaderOptions: LoaderOptions = {
  viewerVersion: 1,
  databaseConfig,
  // file id → glob of the file inside the export
  files: {
    likes: '**/likes/liked_posts.json'
  }
}

export default new Experience(loaderOptions, viewerOptions as ViewerOptions, packageJSON, import.meta.url)
```

`preprocessors` (glob → function) can fix a file's text before it is parsed; see
`experiences/instagram/src/preprocessor.ts`.

## 2. Build tables: `database.ts` (optional)

Rows are taken from the JSON or CSV files with JSONPath, into SQLite tables that the
tabs query. See `experiences/database-template/src/database.ts`, and
`lib/types/database-config.ts` for every option. `npm test` validates the configuration.

## 3. Describe the tabs: `<name>-viewer.json`

Each entry of `viewBlocks` is a tab:

| Field | |
|---|---|
| `id` | unique in the experience |
| `files` | the file ids the tab uses (declared in `loaderOptions.files`; checked by `npm test`) |
| `sql` **or** `customPipeline` | the query, or the name of a function of `viewer-functions.ts` (or a generic one of `src/utils/generic-pipelines.js`); both return `{ headers, items }` |
| `postprocessor` | optional function of `viewer-functions.ts` applied to the result |
| `visualization` | see below |
| `vizProps` | properties given to the visualization |

Texts and their translations go in `messages.en` and `messages.fr` (format:
[viewer-messages.md](viewer-messages.md)). The whole file is checked against
`schemas/viewer/v1.json` by `npm test`.

`dataSamples` lists sample exports from `public/data-samples/`
(`"./data-samples/my-platform.zip?filename=my-platform.zip"`); use synthetic data only.
`icon` is a file of `public/icons/` (`"./icons/my-platform.png"`).

## 4. Choose or write the visualization

A tab's `visualization` is one of:

- **a view of the experience**, `"./views/MyChart.vue"`, in `src/views/`;
- **a shared view**, by its file name in `src/components/chart/view/`:
  `ChartViewDashboard.vue` (a grid of dc.js charts set in `vizProps.graphs`),
  `ChartViewGenericMap.vue`, `ChartViewTimeSeries.vue`, `ChartViewSankey.vue`, …;
- **an inline Vega-Lite specification** (an object).

A view receives the tab's result as `values` (the rows, as objects) and `headers`,
plus everything in `vizProps`:

```vue
<template>
  <VCard class="pa-4">
    <div class="text-h4">{{ values.length }}</div>
    <div>{{ label }}</div>
  </VCard>
</template>

<script>
export default {
  props: {
    values: { type: Array, default: () => [] },
    headers: { type: Array, default: () => [] },
    label: { type: String, default: '' }
  }
}
</script>
```

Views can use the engine's components through `@/` (`@/components/chart/view/shared/ViewCard.vue`,
`KpiTiles.vue`, `PeriodToolbar.vue`, the dc.js `mixin`) and the experience library through
`@lib/`. For complete examples with several tabs sharing a period, a store and a guided
tour, see `experiences/uber-eats/src/views/` and `experiences/yoojo/src/views/`.

## 5. Check

```sh
npm run check                            # lint, types, configuration of every experience, tests
npm run build && npm run test:offline    # every tab of every sample, with no request to another server
```

Add tests in `src/__tests__/<name>/` (see `src/__tests__/uber-eats/`). The golden tests
(`npm run test:golden`) record every tab's result on the samples: after an intended
change, update them with `npm run test:golden -- -u` and check the snapshot diff.

Never add a network request: the app must work offline (see the CSP in `public/index.html`).
