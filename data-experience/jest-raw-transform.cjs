// Jest: import .sql and .vega files as strings, like the app build (asset/source).
module.exports = {
  process(source) {
    return { code: `module.exports = ${JSON.stringify(source)};` }
  }
}
