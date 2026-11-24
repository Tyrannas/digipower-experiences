<template>
  <DataValidator :data="data">
    <div class="chart-view">
      <component
        :is="component"
        v-bind="{
          values: data.items || [],
          headers: data.headers || [],
          mapboxToken: data.mapboxToken,
          ...$attrs
        }"
      />
    </div>
  </DataValidator>
</template>

<script>
import DataValidator from '@/components/misc/DataValidator.vue'
import { MODULE_NAME } from '@/utils/store-helper'

// A visualization is either a shared view of this folder ("ChartViewBar.vue")
// or a view of the experience itself ("./views/Overview.vue"), stored in
// packages/packages/experiences/<experience>/src/views/.
const experienceViewPrefix = './views/'

export default {
  name: 'ChartView',
  components: { DataValidator },
  props: {
    data: {
      type: Object,
      required: true
    },
    graphName: {
      type: String,
      required: true
    }
  },
  computed: {
    experienceSlug() {
      return this.$store?.state?.[MODULE_NAME]?.experienceConfig?.slug
    },
    component() {
      const name = this.graphName
      if (name.startsWith(experienceViewPrefix)) {
        const file = name.slice(experienceViewPrefix.length)
        const slug = this.experienceSlug
        return () => import(`@experiences/${slug}/src/views/${file}`)
      }
      return () => import(`./view/${name}`)
    }
  }
}
</script>

<style>
/* Global styles for every chart view */
/* Note: DC styles should be overridden in src/assets/dc-custom.css */
.chart-view .range-chart > svg > g > g.axis.y {
  display: none;
}

.chart-view p.filters {
  font-size: 0.8rem;
  font-style: italic;
}

.chart-view a.reset {
  color: rgb(85, 3, 30);
  margin-left: 1rem;
}
</style>
