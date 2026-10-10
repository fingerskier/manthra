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

export function isPublicQuote(quote) {
  return quote.realmId === PUBLIC_REALM_ID
}

// New quotes go to the signed-in user's private realm (Dexie Cloud's default
// when no realmId is given). Browsers can't write to the public realm: Dexie
// Cloud only accepts public writes from admin clients, so the server would
// reject the add on sync and roll it back. `npm run publish-quotes` moves
// private quotes into the public realm with admin credentials.
//
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
