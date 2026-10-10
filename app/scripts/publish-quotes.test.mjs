import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import http from 'node:http'
import path from 'node:path'
import { after, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// Runs the real CLI against an in-process mock of the Dexie Cloud REST
// endpoints it uses (POST /token, GET/POST /all/quotes, GET/DELETE
// /all/quotes/:id).

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'publish-quotes.mjs')
const USER = 'me@example.com'

let store
let onPublish
let rateLimitNextWrite
let onRateLimit
let server
let baseUrl

const quote = (id, text, realmId, tag = []) => ({ id, text, author: 'Ann', tag, realmId })

before(async () => {
  server = http.createServer(async (req, res) => {
    let body = ''
    for await (const chunk of req) body += chunk
    const url = new URL(req.url, baseUrl)
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))
    }

    if (req.method === 'POST' && url.pathname === '/token') {
      const { client_id, client_secret } = JSON.parse(body)
      return client_id === 'id' && client_secret === 'secret'
        ? send(200, { type: 'tokens', accessToken: 'token' })
        : send(401, { error: 'bad credentials' })
    }
    if (req.headers.authorization !== 'Bearer token') return send(401, { error: 'no token' })

    if (url.pathname === '/all/quotes') {
      if (req.method === 'GET') {
        const realmId = url.searchParams.get('realmId')
        return send(200, [...store.values()].filter((q) => q.realmId === realmId))
      }
      if (req.method === 'POST') {
        for (const object of JSON.parse(body)) store.set(object.id, object)
        onPublish?.()
        return send(200, {})
      }
    }

    const id = decodeURIComponent(url.pathname.match(/^\/all\/quotes\/(.+)$/)?.[1] ?? '')
    if (id && req.method === 'GET') {
      return store.has(id) ? send(200, store.get(id)) : send(404, { error: 'not found' })
    }
    if (id && req.method === 'DELETE') {
      if (rateLimitNextWrite) {
        rateLimitNextWrite = false
        onRateLimit?.(id)
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '1' })
        return res.end(JSON.stringify({ error: 'More than 100 write requests in 1 minutes' }))
      }
      store.delete(id)
      return send(200, {})
    }
    send(404, { error: 'not found' })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => server.close())

beforeEach(() => {
  onPublish = null
  rateLimitNextWrite = false
  onRateLimit = null
  store = new Map(
    [
      quote('0', 'Already public', 'rlm-public', ['x']),
      quote('p-dup', 'Already public', USER, ['x']),
      quote('p-tags', 'Already public', USER, ['x', 'mine']),
      quote('p-new', 'Brand new', USER),
      quote('o-new', 'Not mine', 'other@example.com'),
    ].map((q) => [q.id, q]),
  )
})

function run(...args) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [CLI, ...args],
      {
        env: {
          ...process.env,
          VITE_DEXIE_CLOUD_URL: baseUrl,
          DEXIE_CLOUD_CLIENT_ID: 'id',
          DEXIE_CLOUD_CLIENT_SECRET: 'secret',
        },
      },
      (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr }),
    )
  })
}

const realmOf = (id) => store.get(id)?.realmId
const publicTexts = () =>
  [...store.values()].filter((q) => q.realmId === 'rlm-public').map((q) => q.text).sort()

test('a dry run changes nothing', async () => {
  const before = JSON.stringify([...store.values()])
  const { code, stdout } = await run('--user', USER)
  assert.equal(code, 0)
  assert.match(stdout, /Dry run/)
  assert.equal(JSON.stringify([...store.values()]), before)
})

test('publishes new private quotes and deletes copies that are now public', async () => {
  const { code } = await run('--user', USER, '--yes')
  assert.equal(code, 0)
  assert.deepEqual(publicTexts(), ['Already public', 'Brand new'])
  assert.equal(realmOf('p-new'), undefined)
  assert.equal(realmOf('p-dup'), undefined)
  assert.equal(realmOf('p-tags'), USER, 'a private copy with extra tags is kept')
  assert.equal(realmOf('o-new'), 'other@example.com', "another user's quote is untouched")
})

test('keeps a private quote edited while publishing', async () => {
  onPublish = () => {
    store.set('p-new', { ...store.get('p-new'), text: 'Brand new, edited' })
  }
  const { code, stdout } = await run('--user', USER, '--yes')
  assert.equal(code, 1)
  assert.match(stdout, /edited while publishing/)
  assert.equal(store.get('p-new')?.text, 'Brand new, edited')
  assert.equal(realmOf('p-dup'), undefined, 'unchanged copies are still deleted')
})

test('waits out a rate limit and retries', async () => {
  rateLimitNextWrite = true
  const { code, stdout } = await run('--user', USER, '--yes')
  assert.equal(code, 0)
  assert.match(stdout, /Rate limited/)
  assert.equal(rateLimitNextWrite, false)
  assert.equal(realmOf('p-new'), undefined)
  assert.equal(realmOf('p-dup'), undefined)
})

test('re-checks a quote edited during a rate-limit wait before deleting it', async () => {
  let limited
  rateLimitNextWrite = true
  onRateLimit = (id) => {
    limited = id
    store.set(id, { ...store.get(id), text: `${store.get(id).text}, edited` })
  }
  const { code, stdout } = await run('--user', USER, '--yes')
  assert.equal(code, 1)
  assert.match(stdout, /edited while publishing/)
  assert.match(store.get(limited)?.text ?? '', /, edited$/)
})

test('fails clearly without credentials', async () => {
  const { code, stderr } = await new Promise((resolve) => {
    execFile(
      process.execPath,
      [CLI, '--readme'],
      { env: { ...process.env, VITE_DEXIE_CLOUD_URL: baseUrl, DEXIE_CLOUD_CLIENT_ID: '' } },
      (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stderr }),
    )
  })
  assert.equal(code, 1)
  assert.match(stderr, /No admin credentials/)
})
