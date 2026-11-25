import type { DatabaseConfig } from '@lib/types'
import { SQLType } from '@lib/types/database-config'

const { TEXT } = SQLType

const config: DatabaseConfig = {
  tables: [
    {
      name: 'CourierTasks',
      columns: [['beginDate', TEXT]]
    }
  ],
  getters: [
    {
      fileId: 'courier_tasks',
      path: '$.items[*]',
      table: 'CourierTasks',
      getters: [
        {
          column: 'beginDate',
          path: '$.taskCreationTime'
        }
      ]
    }
  ]
}

export default config
