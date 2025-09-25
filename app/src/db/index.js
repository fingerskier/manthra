import Dexie from 'dexie'
import dexieCloud from 'dexie-cloud-addon'
import schema from './schema.js'
import config from '../../dexie-cloud.json' assert { type: 'json' }


const db = new Dexie('manthra', {addons: [dexieCloud]})


db.version(1).stores(schema)


db.cloud.configure({
  databaseUrl: config.databaseUrl,
  serviceUrl: config.serviceUrl,
})


window.db = db


export function login() {
  return db.cloud.login()
}


export function logout() {
  return db.cloud.logout()
}


export default db