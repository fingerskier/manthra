import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { createAdmin } from '../src/db/admin.js'
import { publicQuoteId } from './lib/plan.mjs'

// The app's admin client against an in-memory stand-in for the Dexie Cloud
// REST endpoints it uses (POST /token, GET/POST /all/quotes, GET/DELETE
// /all/quotes/:id).

const DB_URL = 'https://db.example'
const PUBLIC = 'rlm-public'
const KEY = { clientId: 'id', clientSecret: 'secret' }

let store
let calls
let validTokens
let dropWrites
let offline

const quote = (id, text, realmId, tag = []) => ({ id, text, author: 'Ann', tag, realmId })
const json = (status, data) => new Response(JSON.stringify(data), { status })

async function fakeFetch(url, { method = 'GET', headers = {}, body } = {}) {
  if (offline) throw new TypeError('Failed to fetch')
  const { pathname, searchParams } = new URL(url)
  calls.push(`${method} ${pathname}`)

  if (method === 'POST' && pathname === '/token') {
    const { client_id, client_secret, scopes } = JSON.parse(body)
    if (client_id !== 'id' || client_secret !== 'secret') return json(401, { error: 'nope' })
    assert.ok(scopes.includes('GLOBAL_WRITE'))
    const accessToken = `token${validTokens.size + 1}`
    validTokens.add(accessToken)
    return json(200, { type: 'tokens', accessToken })
  }
  if (!validTokens.has(headers.Authorization?.replace('Bearer ', ''))) {
    return json(401, { error: 'no token' })
  }

  if (pathname === '/all/quotes' && method === 'GET') {
    const realmId = searchParams.get('realmId')
    return json(200, [...store.values()].filter((q) => q.realmId === realmId))
  }
  if (pathname === '/all/quotes' && method === 'POST') {
    if (!dropWrites) for (const object of JSON.parse(body)) store.set(object.id, object)
    return json(200, {})
  }
  const id = decodeURIComponent(pathname.match(/^\/all\/quotes\/(.+)$/)?.[1] ?? '')
  if (id && method === 'GET') {
    return store.has(id) ? json(200, store.get(id)) : json(404, { error: 'not found' })
  }
  if (id && method === 'DELETE') {
    store.delete(id)
    return json(200, {})
  }
  return json(404, { error: 'not found' })
}

function memoryStorage(initial = {}) {
  const items = new Map(Object.entries(initial))
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key),
    size: () => items.size,
  }
}

const newAdmin = (storage = memoryStorage()) =>
  createAdmin({ dbUrl: `${DB_URL}/`, storage, fetch: fakeFetch })

async function signedIn() {
  const admin = newAdmin()
  await admin.saveCredentials(KEY)
  calls.length = 0
  return admin
}

beforeEach(() => {
  store = new Map()
  calls = []
  validTokens = new Set()
  dropWrites = false
  offline = false
})

test('saves a key only after the server issues a token for it', async () => {
  const storage = memoryStorage()
  const admin = newAdmin(storage)
  let notified = 0
  admin.subscribe(() => notified++)

  await assert.rejects(admin.saveCredentials({ clientId: 'id', clientSecret: 'wrong' }), /401/)
  assert.equal(admin.hasCredentials(), false)
  assert.equal(storage.size(), 0)

  await admin.saveCredentials({ clientId: ' id ', clientSecret: 'secret\n' })
  assert.equal(admin.hasCredentials(), true)
  assert.equal(notified, 1)

  // a reload picks the stored key up again
  assert.equal(newAdmin(storage).hasCredentials(), true)

  admin.forgetCredentials()
  assert.equal(admin.hasCredentials(), false)
  assert.equal(storage.size(), 0)
  await assert.rejects(admin.deletePublicQuote(quote('a', 'A', PUBLIC)), /Admin key not set/)
})

test('edits a public quote in place and keeps its other fields', async () => {
  const original = { ...quote('pub1', 'Old', PUBLIC, ['x']), owner: 'someone' }
  store.set('pub1', original)
  const admin = await signedIn()

  await admin.updatePublicQuote(original, { text: '  New\r\ntext ', author: ' ', tag: ['y', 'y'] })

  assert.deepEqual([...store.values()], [
    { id: 'pub1', text: 'New\ntext', author: null, tag: ['y'], realmId: PUBLIC, owner: 'someone' },
  ])
  assert.deepEqual(calls, ['POST /all/quotes']) // reuses the token from saving the key
})

test('refuses admin edits and deletes of quotes that are not public', async () => {
  const admin = await signedIn()
  const mine = quote('mine', 'Mine', 'me@example.com')
  await assert.rejects(admin.updatePublicQuote(mine, { text: 'x' }), /Not a public quote/)
  await assert.rejects(admin.deletePublicQuote(mine), /Not a public quote/)
  await assert.rejects(
    admin.updatePublicQuote(quote('pub', 'A', PUBLIC), { text: '  ' }),
    /text is required/,
  )
  assert.deepEqual(calls, [])
})

test('deletes a public quote', async () => {
  store.set('pub1', quote('pub1', 'A', PUBLIC))
  store.set('pub2', quote('pub2', 'B', PUBLIC))
  const admin = await signedIn()

  await admin.deletePublicQuote(store.get('pub1'))
  assert.deepEqual([...store.keys()], ['pub2'])
})

test('publishes a private quote under its deterministic public id', async () => {
  const mine = quote('mine', ' Fresh ', 'me@example.com', ['t'])
  store.set('mine', mine)
  const admin = await signedIn()

  const published = await admin.publishQuote(mine)

  const id = publicQuoteId(mine)
  assert.deepEqual(published, { id, text: 'Fresh', author: 'Ann', tag: ['t'], realmId: PUBLIC })
  assert.deepEqual(store.get(id), published)
  assert.deepEqual(store.get('mine'), mine) // removing the private copy is the caller's job
})

test('publishing a quote that is already public only merges its tags', async () => {
  store.set('pub1', quote('pub1', 'Same', PUBLIC, ['a']))
  const admin = await signedIn()

  const merged = await admin.publishQuote(quote('mine', 'Same\n', 'me@example.com', ['a', 'b']))
  assert.deepEqual(merged, quote('pub1', 'Same', PUBLIC, ['a', 'b']))
  assert.equal(store.size, 1)

  calls.length = 0
  await admin.publishQuote(quote('mine2', 'Same', 'me@example.com', ['b']))
  assert.deepEqual(calls, ['GET /all/quotes']) // nothing to add: no write
})

test('fails publishing when the public copy cannot be confirmed', async () => {
  const admin = await signedIn()
  dropWrites = true
  await assert.rejects(admin.publishQuote(quote('mine', 'Lost', 'me@example.com')), /404/)
})

test('never overwrites a different public quote that has the same id', async () => {
  const mine = quote('mine', 'Fresh', 'me@example.com')
  store.set(publicQuoteId(mine), quote(publicQuoteId(mine), 'Other', PUBLIC))
  const admin = await signedIn()

  await assert.rejects(admin.publishQuote(mine), /already belongs to another public quote/)
  assert.equal(store.get(publicQuoteId(mine)).text, 'Other')
})

test('gets a new token when the server stops accepting the current one', async () => {
  store.set('pub1', quote('pub1', 'A', PUBLIC))
  const admin = await signedIn()
  validTokens.clear()

  await admin.deletePublicQuote(store.get('pub1'))
  assert.equal(store.size, 0)
  assert.deepEqual(calls, ['DELETE /all/quotes/pub1', 'POST /token', 'DELETE /all/quotes/pub1'])
})

test('explains a request the browser could not make', async () => {
  const admin = await signedIn()
  offline = true
  await assert.rejects(
    admin.deletePublicQuote(quote('pub1', 'A', PUBLIC)),
    /Could not reach Dexie Cloud/,
  )
})
