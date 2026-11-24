// Build of the offline app: one static folder, no request leaves the browser.
//   npm run offline:build   → offline/dist (serve it with any static server)
//   npm run offline:dev     → http://localhost:8081 with hot reload
import path from 'path'
import { fileURLToPath } from 'url'
import base from '../vue.config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const libDir = path.resolve(__dirname, '../../packages/lib')

export default {
  ...base,
  publicPath: './',
  outputDir: path.resolve(__dirname, 'dist'),
  productionSourceMap: false,
  pages: {
    index: {
      entry: path.resolve(__dirname, 'main.js'),
      template: path.resolve(__dirname, 'index.html'),
      title: 'Data experiences (offline)'
    }
  },
  devServer: {
    ...base.devServer,
    port: 8081,
    // the dev server needs a websocket for hot reload; the CSP of
    // index.html is relaxed for it in development only
    client: { overlay: { warnings: false } }
  },
  chainWebpack: (config) => {
    // copy only the icons and the samples, not data-experience/public
    config.plugin('copy').tap(() => [{
      patterns: [
        { from: path.join(libDir, 'icons'), to: 'icons' },
        { from: path.join(libDir, 'data-samples'), to: 'data-samples', globOptions: { ignore: ['**/*.py'] } }
      ]
    }])
  }
}
