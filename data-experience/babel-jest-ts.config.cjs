// Jest: experiences are tested from their TypeScript sources (packages/), like the app build.
const path = require('path')
const { createRequire } = require('module')

const requireFromPackages = createRequire(path.resolve(__dirname, '../packages/package.json'))

module.exports = {
  presets: ['@babel/preset-env', requireFromPackages.resolve('@babel/preset-typescript')],
  plugins: ['babel-plugin-transform-import-meta']
}
