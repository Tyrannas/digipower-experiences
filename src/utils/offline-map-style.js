// MapLibre style that needs no network: a sea-coloured background and the
// country shapes bundled with the app (see src/assets/geo/README.md).
// No "glyphs" or "sprite": layers using text or icons are not supported.
import countries from '@/assets/geo/countries-50m.json'

export const offlineAttribution = 'Natural Earth'

export function offlineMapStyle() {
  return {
    version: 8,
    sources: {
      countries: { type: 'geojson', data: countries, attribution: offlineAttribution }
    },
    layers: [
      { id: 'sea', type: 'background', paint: { 'background-color': '#dde8f0' } },
      { id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': '#f6f4ef' } },
      { id: 'borders', type: 'line', source: 'countries', paint: { 'line-color': '#b9b3a8', 'line-width': 0.6 } }
    ]
  }
}
