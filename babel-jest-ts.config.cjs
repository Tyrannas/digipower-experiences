// Jest: experiences and their library are tested from their TypeScript sources, like the app build.
module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-typescript'],
  plugins: ['babel-plugin-transform-import-meta']
}
