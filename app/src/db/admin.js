// Admin writes to the public collection (the Dexie Cloud realm rlm-public).
//
// Browser sign-in only ever gets an ACCESS_DB token, and Dexie Cloud rejects
// synced writes to rlm-public, so editing public quotes from the app goes
// through the REST API with the database's client credentials (the pair
// `npx dexie-cloud connect` writes to dexie-cloud.key). The admin pastes them
// into the app once; they are kept in that browser's storage and never ship
// in the bundle.
import { quoteKey } from './quoteKey.js'
import { PUBLIC_REALM_ID, toPublic } from '../../scripts/lib/plan.mjs'

const STORAGE_KEY = 'manthra.adminClient'
const TOKEN_FALLBACK_TTL = 5 * 60 * 1000

const tagsOf = (quote) => (Array.isArray(quote.tag) ? quote.tag : [])

export function createAdmin({ dbUrl, storage, fetch }) {
  const base = (dbUrl ?? '').replace(/\/+$/, '')
  const listeners = new Set()
  let token = null

  const readCredentials = () => {
    try {
      const { clientId, clientSecret } = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}')
      return clientId && clientSecret ? { clientId, clientSecret } : null
    } catch {
      return null
    }
  }
  let credentials = readCredentials()

  const setCredentials = (next) => {
    credentials = next
    token = null
    if (next) storage?.setItem(STORAGE_KEY, JSON.stringify(next))
    else storage?.removeItem(STORAGE_KEY)
    listeners.forEach((listener) => listener())
  }

  async function send(path, { method = 'GET', body, bearer } = {}) {
    if (!base) throw new Error('Dexie Cloud database URL not configured')

    let res
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers: {
          ...(bearer && { Authorization: `Bearer ${bearer}` }),
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (cause) {
      // fetch rejects without a status when offline, and also when the server
      // does not allow this origin (CORS); the two can't be told apart here.
      throw new Error(
        'Could not reach Dexie Cloud from this browser: you are offline, or it does not accept admin calls from this site.',
        { cause },
      )
    }

    const text = await res.text()
    if (!res.ok) {
      const error = new Error(
        res.status === 429
          ? 'Dexie Cloud is rate limiting writes; try again in a minute.'
          : `Dexie Cloud said ${res.status}: ${text.slice(0, 200)}`,
      )
      error.status = res.status
      throw error
    }
    try {
      return text ? JSON.parse(text) : null
    } catch {
      return text
    }
  }

  async function fetchToken({ clientId, clientSecret }) {
    const res = await send('/token', {
      method: 'POST',
      body: {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scopes: ['ACCESS_DB', 'GLOBAL_READ', 'GLOBAL_WRITE'],
      },
    })
    if (res?.type !== 'tokens' || !res.accessToken) {
      throw new Error('Unexpected response from Dexie Cloud /token')
    }
    const expires = Number(res.accessTokenExpiration)
    return {
      value: res.accessToken,
      expires: Number.isFinite(expires) && expires > 0
        ? expires - 30_000
        : Date.now() + TOKEN_FALLBACK_TTL,
    }
  }

  async function request(path, options, retried = false) {
    if (!credentials) throw new Error('Admin key not set')
    const used = credentials
    if (!token || Date.now() >= token.expires) {
      const fresh = await fetchToken(used)
      if (credentials !== used) throw new Error('Admin key changed; try again')
      token = fresh
    }
    try {
      return await send(path, { ...options, bearer: token.value })
    } catch (err) {
      if (err.status !== 401 || retried) throw err
      token = null
      return request(path, options, true)
    }
  }

  const quotePath = (id) => `/all/quotes/${encodeURIComponent(id)}`
  const upsert = (object) => request('/all/quotes', { method: 'POST', body: [object] })

  function requirePublic(quote) {
    if (quote?.realmId !== PUBLIC_REALM_ID || !quote.id) {
      throw new Error('Not a public quote')
    }
  }

  return {
    hasCredentials: () => Boolean(credentials),

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    // Stores the key only once the server has issued a token for it.
    async saveCredentials({ clientId, clientSecret }) {
      const next = { clientId: clientId?.trim(), clientSecret: clientSecret?.trim() }
      if (!next.clientId || !next.clientSecret) {
        throw new Error('Client id and client secret are both required')
      }
      const fresh = await fetchToken(next)
      setCredentials(next)
      token = fresh
    },

    forgetCredentials() {
      setCredentials(null)
    },

    // Edits a public quote in place: same id, so it stays one quote.
    async updatePublicQuote(quote, { text, author, tag }) {
      requirePublic(quote)
      const trimmed = text?.replace(/\r\n?/g, '\n').trim()
      if (!trimmed) throw new Error('Quote text is required')

      const object = {
        ...quote,
        text: trimmed,
        author: author?.trim() || null,
        tag: [...new Set(tag ?? [])],
        realmId: PUBLIC_REALM_ID,
      }
      await upsert(object)
      return object
    },

    async deletePublicQuote(quote) {
      requirePublic(quote)
      await request(quotePath(quote.id), { method: 'DELETE' })
    },

    // Puts a private quote into the public collection and resolves with the
    // public object once the server lists it; the caller then removes the
    // private copy. A quote that is already public (same text and author)
    // only gains the private copy's tags instead of being published twice.
    async publishQuote(quote) {
      if (!quote?.text?.trim()) throw new Error('Quote text is required')
      if (quote.realmId === PUBLIC_REALM_ID) throw new Error('Quote is already public')

      const publicQuotes = await request(
        `/all/quotes?realmId=${encodeURIComponent(PUBLIC_REALM_ID)}`,
      )
      const key = quoteKey(quote)
      const existing = publicQuotes.find((candidate) => quoteKey(candidate) === key)

      let object
      if (existing) {
        const tag = [...new Set([...tagsOf(existing), ...tagsOf(quote)])]
        if (tag.length === tagsOf(existing).length) return existing
        object = { ...existing, tag }
      } else {
        object = toPublic(quote)
        // Only a hash collision gets here; never overwrite another quote.
        if (publicQuotes.some((candidate) => candidate.id === object.id)) {
          throw new Error(`id ${object.id} already belongs to another public quote`)
        }
      }
      await upsert(object)

      const stored = await request(quotePath(object.id))
      if (stored?.realmId !== PUBLIC_REALM_ID || quoteKey(stored) !== key) {
        throw new Error('The public copy could not be confirmed; the private quote was kept')
      }
      return stored
    },
  }
}
