// Zero-network test of the build: npm run build && npm run test:offline
// CHROMIUM_PATH can point to an already installed Chromium/Chrome.
const port = 8090

export default {
  testDir: './e2e',
  timeout: 240 * 1000,
  expect: { timeout: 30000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  },
  webServer: {
    // any static server works; python is there on most systems
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory dist`,
    port,
    reuseExistingServer: !process.env.CI
  }
}
