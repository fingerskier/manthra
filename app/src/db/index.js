import Dexie from 'dexie'
import dexieCloud from 'dexie-cloud-addon'
import cloudConfig from '../../dexie-cloud.json'

export const PUBLIC_REALM_ID = 'rlm-public'

export const db = new Dexie('manthra', { addons: [dexieCloud] })

db.version(2).stores({
  quotes: '@id, text, author',
})

const databaseUrl =
  import.meta.env?.VITE_DEXIE_CLOUD_URL ?? cloudConfig.databaseUrl ?? cloudConfig.dbUrl

if (databaseUrl) {
  db.cloud.configure({
    databaseUrl,
    requireAuth: false,
  })
} else {
  console.warn('Dexie Cloud database URL not configured')
}

// Quote records use a singular `tag` array property to stay compatible with
// the data already in the cloud database (see bak_app/export.json).
export async function addQuote({ text, author = '', tag = [] }) {
  const trimmedText = text?.trim()
  if (!trimmedText) {
    throw new Error('Quote text is required')
  }

  return db.quotes.add({
    text: trimmedText,
    author: author?.trim() || null,
    tag,
    realmId: PUBLIC_REALM_ID,
  })
}

export function updateQuote(id, { text, author, tag }) {
  return db.quotes.update(id, {
    text,
    author: author?.trim() || null,
    tag: tag ?? [],
  })
}

export function deleteQuote(id) {
  return db.quotes.delete(id)
}

export function login() {
  return db.cloud.login()
}

export function logout() {
  return db.cloud.logout()
}

if (typeof window !== 'undefined') {
  window.db = db
}
