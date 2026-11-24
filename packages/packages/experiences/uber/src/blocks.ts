import {
  genericDateViewer,
  genericLocationViewer
} from '@lib/pipelines/generic'
import type { ViewBlocks } from '@lib/types'

const blocks: ViewBlocks = [
  {
    id: 'tripsData',
    customPipeline: 'csv_trips',
    files: ['trips'],
    visualization: './views/ChartViewOverviewUber.vue',
    title: 'Uber overview',
    text: 'This interactive visualisation shows your Uber habits, play with it to discover everything Uber knows on you. Your data is grouped by currency and every graph is filterable.'
  },
  {
    id: 'tripsGraphData',
    customPipeline: 'tripsGraphData',
    files: ['trips'],
    visualization: 'ChartViewSankey.vue',
    title: 'Uber Trips',
    text: 'Get information about the places you have visited the most or from which you originate the most.'
  },
  genericDateViewer,
  {
    id: 'tripsKeplerData',
    customPipeline: 'tripsKeplerData',
    files: ['trips'],
    visualization: '/kepler',
    title: 'Map of trips',
    text: 'See where you travelled'
  },
  genericLocationViewer
]

export default blocks
