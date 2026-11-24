<template>
  <VContainer>
    <VCard>
      <div ref="map" class="unit-map" :style="`width: 100%; height: ${height}px`" />
      <div v-if="legend.length" class="unit-map__legend pa-2">
        <span v-for="item in legend" :key="item.label" class="mr-4 text-caption">
          <span class="unit-map__swatch" :style="{ background: item.color }" />{{ item.label }}
        </span>
      </div>
    </VCard>
  </VContainer>
</template>

<script>
// Map of a table of locations, drawn with MapLibre on an offline background.
// It replaces the former Kepler.gl iframe (loaded from unpkg, with Mapbox tiles)
// and accepts the same arguments:
//   args.keplerData: { fields: [{ name }], rows: [[...]] }   (or args.rawCsv)
//   args.config: a Kepler saved config; only config.visState.layers is read
//     (types point, cluster, heatmap, line, arc; columns; color; colorField).
//   Without a config, every latitude/longitude pair of columns becomes a point layer.
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl from 'maplibre-gl'
import Papa from 'papaparse'
import { offlineMapStyle } from '@/utils/offline-map-style'

const palette = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
const otherColor = '#9e9e9e'
const maxCategories = palette.length

const rgb = c => (Array.isArray(c) ? `rgb(${c.slice(0, 3).join(',')})` : (c || palette[0]))
const isCoord = v => typeof v === 'number' && Number.isFinite(v)

function toRecords({ keplerData, rawCsv }) {
  if (keplerData?.fields && keplerData?.rows) {
    const names = keplerData.fields.map(f => f.name)
    return keplerData.rows.map(row => Object.fromEntries(names.map((n, i) => [n, row[i]])))
  }
  if (rawCsv) {
    return Papa.parse(rawCsv, { header: true, dynamicTyping: true, skipEmptyLines: true }).data
  }
  return []
}

// "latitude"/"longitude", "startLat"/"startLng", "begin_lat"/"begin_lon", ...
function guessLayers(records) {
  const names = Object.keys(records[0] || {})
  const latRe = /^(.*?)(lat|latitude)$/i
  const lngRe = /^(.*?)(lng|lon|long|longitude)$/i
  const layers = []
  names.forEach((lat) => {
    const m = lat.match(latRe)
    if (!m) {
      return
    }
    const lng = names.find(n => n.match(lngRe)?.[1].toLowerCase() === m[1].toLowerCase())
    if (lng) {
      layers.push({ type: 'point', config: { columns: { lat, lng }, isVisible: true } })
    }
  })
  return layers
}

function toNumber(v) {
  return typeof v === 'string' && v.trim() !== '' ? Number(v) : v
}

function buildFeatures(layer, records, colorField) {
  const { columns } = layer.config
  const features = []
  records.forEach((r) => {
    const properties = colorField ? { category: String(r[colorField] ?? '') } : {}
    if (columns.lat0) {
      const a = [toNumber(r[columns.lng0]), toNumber(r[columns.lat0])]
      const b = [toNumber(r[columns.lng1]), toNumber(r[columns.lat1])]
      if ([...a, ...b].every(isCoord)) {
        features.push({ type: 'Feature', properties, geometry: { type: 'LineString', coordinates: [a, b] } })
      }
    } else {
      const p = [toNumber(r[columns.lng]), toNumber(r[columns.lat])]
      if (p.every(isCoord)) {
        features.push({ type: 'Feature', properties, geometry: { type: 'Point', coordinates: p } })
      }
    }
  })
  return { type: 'FeatureCollection', features }
}

function categoriesOf(records, field) {
  const counts = new Map()
  records.forEach((r) => {
    const v = String(r[field] ?? '')
    counts.set(v, (counts.get(v) || 0) + 1)
  })
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v).slice(0, maxCategories)
}

export default {
  name: 'UnitKepler',
  props: {
    args: {
      type: Object,
      default: () => ({})
    },
    height: {
      type: Number,
      default: 500
    }
  },
  data() {
    return {
      legend: []
    }
  },
  watch: {
    args: {
      deep: true,
      handler() {
        this.draw()
      }
    }
  },
  mounted() {
    this.layerIds = []
    this.map = new maplibregl.Map({
      container: this.$refs.map,
      style: offlineMapStyle(),
      center: [8, 46.8],
      zoom: 3,
      attributionControl: { compact: true }
    })
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }))
    this.map.addControl(new maplibregl.ScaleControl())
    this.map.on('load', () => this.draw())
  },
  beforeDestroy() {
    this.map?.remove()
  },
  methods: {
    clear() {
      this.layerIds.forEach((id) => {
        if (this.map.getLayer(id)) {
          this.map.removeLayer(id)
        }
        if (this.map.getSource(id)) {
          this.map.removeSource(id)
        }
      })
      this.layerIds = []
    },
    draw() {
      if (!this.map?.isStyleLoaded()) {
        return
      }
      this.clear()
      const records = toRecords(this.args || {})
      const configured = this.args?.config?.config?.visState?.layers
      const layers = (configured?.length ? configured : guessLayers(records))
        .filter(l => l.config?.isVisible !== false && l.config?.columns)
      const bounds = new maplibregl.LngLatBounds()
      const legend = []

      layers.forEach((layer, index) => {
        const id = `layer-${index}`
        const colorField = layer.visualChannels?.colorField?.name
        const data = buildFeatures(layer, records, colorField)
        if (!data.features.length) {
          return
        }
        data.features.forEach(({ geometry }) => {
          if (geometry.type === 'Point') {
            bounds.extend(geometry.coordinates)
          } else {
            geometry.coordinates.forEach(c => bounds.extend(c))
          }
        })

        let color = rgb(layer.config.color || palette[index % palette.length])
        if (colorField) {
          const categories = categoriesOf(records, colorField)
          color = ['match', ['get', 'category'], ...categories.flatMap((c, i) => [c, palette[i]]), otherColor]
          if (!legend.length) {
            categories.forEach((c, i) => legend.push({ label: c || '—', color: palette[i] }))
          }
        }

        this.map.addSource(id, { type: 'geojson', data })
        this.layerIds.push(id)
        if (layer.type === 'heatmap') {
          this.map.addLayer({
            id,
            source: id,
            type: 'heatmap',
            paint: { 'heatmap-radius': 18, 'heatmap-opacity': 0.8 }
          })
        } else if (layer.type === 'line' || layer.type === 'arc') {
          this.map.addLayer({
            id,
            source: id,
            type: 'line',
            paint: { 'line-color': color, 'line-width': 1.5, 'line-opacity': 0.7 }
          })
        } else {
          this.map.addLayer({
            id,
            source: id,
            type: 'circle',
            paint: {
              'circle-color': color,
              'circle-radius': layer.type === 'cluster' ? 6 : 4,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#fff',
              'circle-stroke-width': 0.5
            }
          })
        }
      })

      this.legend = legend
      if (!bounds.isEmpty()) {
        this.map.fitBounds(bounds, { padding: 40, maxZoom: 12, duration: 0 })
      }
    }
  }
}
</script>

<style scoped>
.unit-map__legend {
  border-top: 1px solid #eee;
}
.unit-map__swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
}
</style>
