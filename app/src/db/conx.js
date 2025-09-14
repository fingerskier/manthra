import Dexie from 'dexie'
import dexieCloud from 'dexie-cloud-addon'
import configuration from './config.js'
import schema from './schema.js'


export class ManthraDB extends Dexie {
  constructor() {
    super('manthra', {
      addons: [dexieCloud],
      autoOpen: true,
    })

    this.version(1).stores(schema)

    const databaseUrl =
      import.meta.env?.VITE_DEXIE_CLOUD_URL ?? configuration.databaseUrl ?? configuration.dbUrl

    if (databaseUrl) {
      this.cloud.configure(configuration)

      void this.cloud.sync()
    } else {
      console.warn('Dexie Cloud database URL not configured')
    }
  }
}

export const db = new ManthraDB()
window.db = db
