#!/usr/bin/env node
// Moves quotes into the public collection (the Dexie Cloud realm rlm-public).
//
// Browsers can't write to rlm-public: Dexie Cloud only accepts public writes
// from admin clients with the GLOBAL_WRITE scope. This script uses the client
// credentials that `npx dexie-cloud connect` stores in app/dexie-cloud.key and
// the Dexie Cloud REST API (https://dexie.org/cloud/docs/rest-api).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { quoteKey } from '../src/db/quoteKey.js'
import { parseReadmeQuotes } from './lib/readme.mjs'
import { planPublish, PUBLIC_REALM_ID } from './lib/plan.mjs'

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const README_PATH = path.resolve(APP_DIR, '..', 'README.md')

const USAGE = `Usage: npm run publish-quotes -- [--user <userId>] [--id <quoteId>]... [--readme] [--yes]

Moves quotes into the public collection. Prints the plan unless --yes is given.

  --user <userId>  publish this user's private quotes (the userId is the
                   sign-in email); private copies of quotes that are already
                   public are deleted instead of published twice
  --id <quoteId>   only publish these private quotes (repeatable, with --user)
  --readme         also publish README.md quotes that are not public yet
  --yes            apply the plan

Needs admin credentials for the database: run \`npx dexie-cloud connect <dbUrl>\`
in app/ once (it writes the git-ignored dexie-cloud.key).`

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const trimSlash = (url) => url.replace(/\/+$/, '')

function loadCredentials() {
  const config = readJson(path.join(APP_DIR, 'dexie-cloud.json'))
  const dbUrl = trimSlash(
    process.env.VITE_DEXIE_CLOUD_URL ?? config.dbUrl ?? config.databaseUrl ?? '',
  )
  if (!dbUrl) {
    throw new Error('No database URL in app/dexie-cloud.json')
  }

  let clientId = process.env.DEXIE_CLOUD_CLIENT_ID
  let clientSecret = process.env.DEXIE_CLOUD_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    // dexie-cloud.key maps each database URL to { clientId, clientSecret }.
    const keyFile = path.join(APP_DIR, 'dexie-cloud.key')
    const keys = fs.existsSync(keyFile) ? readJson(keyFile) : {}
    const entry = Object.entries(keys).find(([url]) => trimSlash(url) === dbUrl)
    ;({ clientId, clientSecret } = entry?.[1] ?? {})
  }
  if (!clientId || !clientSecret) {
    throw new Error(
      `No admin credentials for ${dbUrl}. Run \`npx dexie-cloud connect ${dbUrl}\` in app/ first.`,
    )
  }

  return { dbUrl, clientId, clientSecret }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Dexie Cloud caps write requests (100 a minute), and publishing hundreds of
// quotes means hundreds of DELETEs. On a 429 every request waits for the
// window the server names. Requests retry by themselves unless the caller
// must redo more than the request (retryRateLimit: false).
const RATE_LIMIT_RETRIES = 10
let rateLimitedUntil = 0

async function request(url, { method = 'GET', token, body, retryRateLimit = true } = {}, attempt = 0) {
  if (Date.now() < rateLimitedUntil) {
    await sleep(rateLimitedUntil - Date.now())
  }

  const res = await fetch(url, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()

  if (res.status === 429) {
    const seconds = Math.min(
      Number(res.headers.get('retry-after') ?? res.headers.get('ratelimit-reset')) || 60,
      120,
    )
    const until = Date.now() + seconds * 1000
    if (until > rateLimitedUntil + 1000) {
      console.log(`Rate limited by Dexie Cloud; waiting ${seconds}s…`)
    }
    rateLimitedUntil = Math.max(rateLimitedUntil, until)
    if (retryRateLimit && attempt < RATE_LIMIT_RETRIES) {
      return request(url, { method, token, body, retryRateLimit }, attempt + 1)
    }
  }

  if (!res.ok) {
    const error = new Error(`${method} ${url} failed: ${res.status} ${text.slice(0, 300)}`)
    error.status = res.status
    throw error
  }
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

async function getToken({ dbUrl, clientId, clientSecret }) {
  const res = await request(`${dbUrl}/token`, {
    method: 'POST',
    body: {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scopes: ['ACCESS_DB', 'GLOBAL_READ', 'GLOBAL_WRITE'],
    },
  })
  if (res?.type !== 'tokens' || !res.accessToken) {
    throw new Error('Unexpected response from /token')
  }
  return res.accessToken
}

async function forEachLimit(items, limit, fn) {
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      await fn(items[next++])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

function chunk(items, size) {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

// What a private quote looked like when planned, to spot later edits.
const snapshot = (quote) =>
  JSON.stringify([quote.text, quote.author ?? null, quote.tag ?? [], quote.realmId])

function describe(quote) {
  const text = quote.text.replace(/\s+/g, ' ').trim()
  const short = text.length > 70 ? `${text.slice(0, 69)}…` : text
  return `"${short}"${quote.author ? ` — ${quote.author}` : ''}`
}

function printPlan({ publish, drop, conflicts }, publicCount) {
  console.log(`Public collection: ${publicCount} quotes`)

  console.log(`\nPublish ${publish.length} new public quotes:`)
  for (const { object, from } of publish) {
    console.log(`  + ${describe(object)}  (${from})`)
  }

  const published = new Set(publish.map(({ object }) => quoteKey(object)))
  const duplicates = drop.filter(({ key }) => !published.has(key)).length
  console.log(
    `\nDelete ${drop.length} private quotes once their quote is public` +
      ` (${duplicates} are copies of quotes that are already public)`,
  )

  if (conflicts.length) {
    console.log(`\nLeave ${conflicts.length} private quotes alone:`)
    for (const { quote, reason } of conflicts) {
      console.log(`  ! ${describe(quote)} [${quote.id}]: ${reason}`)
    }
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      user: { type: 'string' },
      id: { type: 'string', multiple: true },
      readme: { type: 'boolean' },
      yes: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  if (values.help) {
    console.log(USAGE)
    return
  }
  if (!values.user && !values.readme) {
    throw new Error(`Nothing to publish: pass --user and/or --readme.\n\n${USAGE}`)
  }
  if (values.id && !values.user) {
    throw new Error('--id needs --user')
  }
  if (values.user === PUBLIC_REALM_ID) {
    throw new Error('--user is a userId, not the public realm')
  }

  const credentials = loadCredentials()
  const { dbUrl } = credentials
  const token = await getToken(credentials)
  const listQuotes = (realmId) =>
    request(`${dbUrl}/all/quotes?realmId=${encodeURIComponent(realmId)}`, { token })

  const publicQuotes = await listQuotes(PUBLIC_REALM_ID)
  let privateQuotes = values.user ? await listQuotes(values.user) : []
  if (values.id) {
    const missing = values.id.filter((id) => !privateQuotes.some((q) => q.id === id))
    if (missing.length) {
      throw new Error(`Not private quotes of ${values.user}: ${missing.join(', ')}`)
    }
    privateQuotes = privateQuotes.filter((quote) => values.id.includes(quote.id))
  }
  const readmeQuotes = values.readme
    ? parseReadmeQuotes(fs.readFileSync(README_PATH, 'utf8'))
    : []

  const plan = planPublish({ publicQuotes, privateQuotes, readmeQuotes })
  printPlan(plan, publicQuotes.length)

  if (!values.yes) {
    console.log('\nDry run: nothing changed. Re-run with --yes to apply.')
    return
  }

  for (const objects of chunk(plan.publish.map(({ object }) => object), 100)) {
    await request(`${dbUrl}/all/quotes`, { method: 'POST', token, body: objects })
  }
  console.log(`\nPublished ${plan.publish.length} quotes.`)

  // Delete a private copy only when the server now lists its quote as public,
  // and never by an id that a public quote has.
  const confirmed = await listQuotes(PUBLIC_REALM_ID)
  const confirmedKeys = new Set(confirmed.map(quoteKey))
  const confirmedIds = new Set(confirmed.map((quote) => quote.id))
  const deletable = plan.drop.filter(
    ({ quote, key }) => confirmedKeys.has(key) && !confirmedIds.has(quote.id),
  )

  // A browser can sync an edit to a private quote while this runs; deleting
  // it then would lose the edit, since only the planned text was published.
  // The REST API has no conditional delete, so re-read each quote right
  // before deleting it and keep any that changed.
  let deleted = 0
  const changed = []
  await forEachLimit(deletable, 8, async ({ quote }) => {
    const url = `${dbUrl}/all/quotes/${encodeURIComponent(quote.id)}`
    for (let attempt = 0; ; attempt++) {
      const current = await request(url, { token }).catch((err) => {
        if (err.status === 404) return null
        throw err
      })
      if (!current) return // already gone
      if (snapshot(current) !== snapshot(quote)) {
        changed.push(current)
        return
      }
      try {
        await request(url, { method: 'DELETE', token, retryRateLimit: false })
        deleted++
        return
      } catch (err) {
        // Rate limited: start over, so the quote is re-read after the wait.
        if (err.status !== 429 || attempt >= RATE_LIMIT_RETRIES) throw err
      }
    }
  })
  console.log(`Deleted ${deleted} private quotes.`)

  if (changed.length) {
    console.log(`\nKept ${changed.length} private quotes edited while publishing (re-run to publish them):`)
    for (const quote of changed) {
      console.log(`  ! ${describe(quote)} [${quote.id}]`)
    }
    process.exitCode = 1
  }

  const unconfirmed = plan.drop.length - deletable.length
  if (unconfirmed) {
    console.log(`Kept ${unconfirmed} private quotes whose public copy could not be confirmed.`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exitCode = 1
})
