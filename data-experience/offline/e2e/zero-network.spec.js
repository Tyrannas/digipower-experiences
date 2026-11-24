// For every experience that has a sample: load it, open every tab, and check
// that the page never tried to reach another server.
import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const experiencesDir = path.resolve(dir, '../../../packages/packages/experiences')

const experiences = readdirSync(experiencesDir)
  .map((slug) => {
    const viewer = path.join(experiencesDir, slug, 'src', `${slug}-viewer.json`)
    if (!existsSync(viewer)) {
      return null
    }
    const { dataSamples = [] } = JSON.parse(readFileSync(viewer, 'utf8'))
    const sample = dataSamples[0]?.match(/filename=([^&?]+)/)?.[1]
    return { slug, sample }
  })
  .filter(e => e)

function watch(page) {
  const problems = { external: [], blocked: [], errors: [] }
  const local = new URL(test.info().project.use.baseURL).origin
  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(local) && !/^(data|blob):/.test(url)) {
      problems.external.push(url)
    }
  })
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) {
      problems.blocked.push(message.text())
    }
  })
  page.on('pageerror', error => problems.errors.push(`[${error.name}] ${error.message}`))
  return problems
}

async function waitForTab(page) {
  for (let attempt = 0, quiet = 0; attempt < 120 && quiet < 4; attempt++) {
    await page.waitForTimeout(250)
    const loading = await page.locator('.v-progress-circular:visible, .v-progress-linear:visible').count()
    quiet = loading ? 0 : quiet + 1
  }
}

test('home page', async({ page }) => {
  const problems = watch(page)
  await page.goto('/')
  await expect(page.getByTestId('exp-instagram')).toBeVisible()
  await expect(page.getByTestId('network-badge')).toHaveCSS('background-color', 'rgb(76, 175, 80)')
  expect(problems).toStrictEqual({ external: [], blocked: [], errors: [] })
})

for (const { slug, sample } of experiences) {
  test(`${slug}${sample ? ` with ${sample}` : ' (no sample)'}`, async({ page }) => {
    test.skip(!sample, 'no sample in its viewer JSON')
    const problems = watch(page)
    // the guided tours are tested elsewhere; here they would only cover the tabs
    await page.addInitScript(() => {
      localStorage.setItem('uberEatsTourShown', 'yes')
      localStorage.setItem('yoojoTourShown', 'yes')
    })
    await page.goto(`/#${slug}`)
    await page.getByRole('button', { name: /Select sample data|Selectionner des données de test/i }).click()
    await page.getByText(sample, { exact: true }).click()
    await page.getByRole('button', { name: /Explore your data|Explorer vos données/i }).click()
    // experiences with a file explorer open it first ("2. See"); the tabs are in "3. Understand"
    const understand = page.getByRole('button', { name: /3\. (Understand|Comprendre)/ })
    await page.waitForTimeout(1000)
    if (await understand.isVisible()) {
      await understand.click()
    }

    const tabs = page.locator(`.${slug}-tabs-wrapper`).getByRole('tab')
    await expect(tabs.first()).toBeVisible()
    const count = await tabs.count()
    const closeTour = page.locator('.shepherd-cancel-icon:visible')
    for (let index = 0; index < count; index++) {
      // some experiences start a guided tour over the page
      if (await closeTour.count()) {
        await closeTour.first().click()
      }
      await tabs.nth(index).click()
      await waitForTab(page)
    }
    test.info().annotations.push({ type: 'tabs', description: String(count) })
    expect(problems).toStrictEqual({ external: [], blocked: [], errors: [] })
  })
}
