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

export async function addQuote({ text, author = '', tags = [] }) {
  const trimmedText = text?.trim()
  if (!trimmedText) {
    throw new Error('Quote text is required')
  }

  return db.quotes.add({
    text: trimmedText,
    author: author?.trim() || null,
    tags,
    realmId: PUBLIC_REALM_ID,
  })
}

export function updateQuote(id, { text, author, tags }) {
  return db.quotes.update(id, {
    text,
    author: author?.trim() || null,
    tags: tags ?? [],
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
