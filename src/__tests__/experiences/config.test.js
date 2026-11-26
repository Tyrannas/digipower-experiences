// Checks the configuration of every experience in experiences/: the files its tabs
// use, its database configuration, and its viewer JSON (schemas/viewer/v1.json).
import { existsSync, readdirSync } from 'fs'
import { resolve } from 'path'
import {
  validateDatabaseConfigIntegrity,
  validateDatabaseConfigSchema
} from '@lib/database-config-validation/'
import { validateAllViewerJson } from '@lib/validate-viewer'

const experiencesDir = resolve(__dirname, '../../../experiences')
const names = readdirSync(experiencesDir)
  .filter(name => existsSync(resolve(experiencesDir, name, 'src/index.ts')))

describe.each(names)('%s', (name) => {
  test('configuration', async() => {
    const { default: experience } = await import(`@experiences/${name}/src/index.ts`)
    const {
      loaderOptions: { files, disabled, databaseConfig },
      viewerOptions: { viewBlocks, url }
    } = experience
    if (!disabled && !url) {
      expect(viewBlocks.length).toBeGreaterThan(0)
    }
    if (files && !('$DYNAMIC_FILES' in files)) {
      viewBlocks.forEach(({ id, files: tabFiles = [] }) => {
        // every file id used by a tab is declared in loaderOptions.files
        expect({ id, unknownFiles: tabFiles.filter(f => !(f in files)) })
          .toEqual({ id, unknownFiles: [] })
      })
      if (databaseConfig) {
        validateDatabaseConfigSchema(name, databaseConfig)
        validateDatabaseConfigIntegrity(name, databaseConfig, files)
      }
    }
  })
})

test('every viewer JSON is valid', () => {
  validateAllViewerJson()
})
