// One build for the whole app: the engine (src/), the experiences (experiences/)
// and their library (lib/), compiled from their sources.
//   npm run dev     http://localhost:8080, hot reload
//   npm run build   dist/, a static folder that makes no request to other servers
// public/ (page template, icons, data samples) is copied as is into dist/.
import webpack from 'webpack'
import { defineConfig } from '@vue/cli-service'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const here = dir => path.resolve(__dirname, dir)

export default defineConfig({
  publicPath: './',
  productionSourceMap: false,
  pages: {
    index: {
      entry: 'app/main.js',
      title: 'Data experiences'
    }
  },
  devServer: {
    port: 8080,
    client: {
      overlay: { warnings: false },
      // hot reload websocket on the page's own origin, allowed by the CSP ('self')
      webSocketURL: 'auto://0.0.0.0:0/ws'
    }
  },
  configureWebpack: {
    resolve: {
      alias: {
        '@': here('src'),
        '~': here('src'),
        '@lib': here('lib'),
        '@experiences': here('experiences'),
        // https://github.com/micromatch/picomatch/pull/23
        picomatch: 'picomatch-browser',
        // the package's "exports" hide its locale files; they are bundled, not fetched from a CDN
        'd3-time-format-locale': path.join(path.dirname(require.resolve('d3-time-format')), '../locale')
      },
      extensions: ['.ts'],
      fallback: {
        fs: false,
        crypto: false,
        path: require.resolve('path-browserify'),
        util: require.resolve('util/')
      }
    },
    module: {
      rules: [
        {
          // TypeScript is only stripped here; type checking: npm run typecheck
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [{
            loader: 'babel-loader',
            options: { presets: ['@babel/preset-typescript'], babelrc: false, configFile: false }
          }]
        },
        {
          test: /\.(sql|vega)$/,
          type: 'asset/source'
        },
        {
          // SQLite engine, served next to the app instead of a CDN
          test: /sql-wasm\.wasm$/,
          type: 'asset/resource',
          generator: { filename: 'sql-wasm.[contenthash:7].wasm' }
        },
        {
          test: /\.worker\.js$/,
          use: [{
            loader: 'worker-loader',
            options: { inline: 'fallback', filename: '[name].[contenthash:7].js' }
          }]
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        // for init() in sql.js
        'process.release': {}
      })
    ],
    experiments: {
      topLevelAwait: true
    }
  },
  pluginOptions: {
    i18n: {
      locale: 'en',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableInSFC: true,
      enableBridge: false
    }
  }
})
