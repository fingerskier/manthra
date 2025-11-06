import { connect as connectLocalDatabase } from '@tursodatabase/database-wasm/vite'
import { createClient as createServerlessClient } from '@tursodatabase/serverless/compat'
import initialQuotes from '../../quotes.json' assert { type: 'json' }

const LOCAL_DB_FILENAME = 'manthra.db'
const CONFIG_STORAGE_KEY = 'manthra:turso-config'
const PUBLIC_REALM_ID = 'rlm-public'

let clientContextPromise = null
let cachedConfigKey = null
let activeContext = null

const isBrowser = typeof window !== 'undefined'

function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (value && typeof value.valueOf === 'function') {
    const asPrimitive = value.valueOf()
    if (typeof asPrimitive === 'number') return asPrimitive
    if (typeof asPrimitive === 'bigint') return Number(asPrimitive)
  }
  return value ?? null
}

function parseTags(value) {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return value.split(',').map(tag => tag.trim()).filter(Boolean)
    }
  }
  return []
}

function normalizeConfig(rawConfig) {
  const url = typeof rawConfig?.url === 'string' ? rawConfig.url.trim() : ''
  const token = typeof rawConfig?.token === 'string' ? rawConfig.token.trim() : ''
  return { url, token }
}

export function getStoredConfig() {
  if (!isBrowser) {
    return { url: '', token: '' }
  }

  const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY)
  if (!raw) {
    return { url: '', token: '' }
  }

  try {
    const parsed = JSON.parse(raw)
    return normalizeConfig(parsed)
  } catch {
    return { url: '', token: '' }
  }
}

function setStoredConfigInternal(config) {
  if (!isBrowser) return { url: config.url ?? '', token: config.token ?? '' }

  const normalized = normalizeConfig(config)

  if (!normalized.url && !normalized.token) {
    window.localStorage.removeItem(CONFIG_STORAGE_KEY)
  } else {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(normalized))
  }

  return normalized
}

export function saveConfig(config) {
  const normalized = setStoredConfigInternal(config)
  resetClient()
  return normalized
}

export function clearConfig() {
  if (isBrowser) {
    window.localStorage.removeItem(CONFIG_STORAGE_KEY)
  }
  resetClient()
  return { url: '', token: '' }
}

function resetClient() {
  if (activeContext?.mode === 'local') {
    const close = activeContext.connection?.close?.bind(activeContext.connection)
    if (typeof close === 'function') {
      Promise.resolve(close()).catch(() => {})
    }
  }
  clientContextPromise = null
  cachedConfigKey = null
  activeContext = null
}

function formatRowWithColumns(values, columns) {
  const formatted = {}
  values.forEach((value, index) => {
    formatted[index] = value
    const columnName = columns[index]?.name
    if (columnName && !(columnName in formatted)) {
      formatted[columnName] = value
    }
  })
  return formatted
}

function createLocalContext(database) {
  return {
    mode: 'local',
    connection: database,
    async execute(statement) {
      if (typeof statement === 'string') {
        await database.exec(statement)
        return { rows: [] }
      }

      const sql = statement?.sql ?? ''
      const args = Array.isArray(statement?.args) ? statement.args : []

      const prepared = database.prepare(sql)
      try {
        const columns = prepared.columns()
        if (columns.length > 0) {
          const rows = await prepared.raw(true).all(...args)
          return { rows: rows.map(row => formatRowWithColumns(row, columns)) }
        }

        const info = await prepared.run(...args)
        return {
          rows: [],
          lastInsertRowid: info.lastInsertRowid,
          rowsAffected: info.changes,
        }
      } finally {
        prepared.close()
      }
    },
  }
}

function createServerlessContext(config) {
  const client = createServerlessClient({
    url: config.url,
    authToken: config.token || undefined,
  })
  return {
    mode: 'remote',
    connection: client,
    execute(statement) {
      return client.execute(statement)
    },
  }
}

async function createContextFromConfig(config) {
  const normalized = normalizeConfig(config)

  if (normalized.url) {
    return createServerlessContext(normalized)
  }

  const database = await connectLocalDatabase(LOCAL_DB_FILENAME)
  return createLocalContext(database)
}

async function ensureContext() {
  const config = normalizeConfig(getStoredConfig())
  const key = JSON.stringify(config)

  if (!clientContextPromise || key !== cachedConfigKey) {
    cachedConfigKey = key
    clientContextPromise = (async () => {
      let context
      try {
        context = await createContextFromConfig(config)
        if (isBrowser) {
          window.tursoClient = context.connection
        }
        await initializeDatabase(context, Boolean(config.url))
        activeContext = context
        return context
      } catch (error) {
        activeContext = null
        clientContextPromise = null
        cachedConfigKey = null
        if (context?.mode === 'local') {
          const close = context.connection?.close?.bind(context.connection)
          if (typeof close === 'function') {
            try {
              await close()
            } catch {
              // ignore close errors during initialization
            }
          }
        }
        throw error
      }
    })()
  }

  return clientContextPromise
}

async function initializeDatabase(context, usingRemoteConfig) {
  await context.execute(`
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      author TEXT,
      tags TEXT DEFAULT '[]',
      realm_id TEXT DEFAULT '${PUBLIC_REALM_ID}'
    )
  `)

  if (usingRemoteConfig) {
    return
  }

  const countResult = await context.execute({ sql: `SELECT COUNT(*) as count FROM quotes` })
  const countRow = countResult.rows?.[0]
  const countValue = countRow ? countRow.count ?? countRow[0] : 0
  const count = toNumber(countValue) || 0

  if (count > 0) {
    return
  }

  for (const quote of initialQuotes) {
    const tags = Array.isArray(quote.tags) ? quote.tags : quote.tag ?? []
    await context.execute({
      sql: `INSERT INTO quotes (text, author, tags, realm_id) VALUES (?, ?, ?, ?)`,
      args: [
        quote.text,
        quote.author ?? null,
        JSON.stringify(tags),
        quote.realmId ?? PUBLIC_REALM_ID,
      ],
    })
  }
}

async function query(sql, args = []) {
  const context = await ensureContext()
  return context.execute({ sql, args })
}

function mapRow(row) {
  return {
    id: toNumber(row.id),
    text: row.text,
    author: row.author ?? '',
    tags: parseTags(row.tags),
    realmId: row.realm_id ?? PUBLIC_REALM_ID,
  }
}

export async function fetchQuotes() {
  const result = await query(
    `SELECT id, text, author, tags, realm_id FROM quotes ORDER BY id DESC`
  )
  const rows = result.rows ?? []
  return rows.map(mapRow)
}

export async function searchQuotes(term = '') {
  const search = term.trim()
  if (!search) {
    return fetchQuotes()
  }

  const wildcard = `%${search}%`
  const result = await query(
    `SELECT id, text, author, tags, realm_id FROM quotes
     WHERE text LIKE ? COLLATE NOCASE OR author LIKE ? COLLATE NOCASE
     ORDER BY id DESC`,
    [wildcard, wildcard]
  )
  const rows = result.rows ?? []
  return rows.map(mapRow)
}

export async function createQuote({ text, author = 'unk', tags = [] }) {
  const result = await query(
    `INSERT INTO quotes (text, author, tags, realm_id) VALUES (?, ?, ?, ?)`,
    [text, author, JSON.stringify(tags), PUBLIC_REALM_ID]
  )

  const id = result.lastInsertRowid ? toNumber(result.lastInsertRowid) : null
  if (!id) {
    return null
  }

  const quoteResult = await query(
    `SELECT id, text, author, tags, realm_id FROM quotes WHERE id = ?`,
    [id]
  )
  const row = quoteResult.rows?.[0]
  return row ? mapRow(row) : null
}

export async function updateQuote(id, { text, author, tags, realmId }) {
  await query(
    `UPDATE quotes SET text = ?, author = ?, tags = ?, realm_id = ? WHERE id = ?`,
    [text, author ?? null, JSON.stringify(tags ?? []), realmId ?? PUBLIC_REALM_ID, id]
  )
}

export async function deleteQuote(id) {
  await query(`DELETE FROM quotes WHERE id = ?`, [id])
}

export async function makeQuotePublic(id) {
  await query(
    `UPDATE quotes SET realm_id = ? WHERE id = ?`,
    [PUBLIC_REALM_ID, id]
  )
}

export async function getQuoteById(id) {
  const result = await query(
    `SELECT id, text, author, tags, realm_id FROM quotes WHERE id = ?`,
    [id]
  )
  const row = result.rows?.[0]
  return row ? mapRow(row) : null
}

export async function resetLocalDatabase() {
  const config = normalizeConfig(getStoredConfig())
  if (config.url) {
    throw new Error('Cannot reset the local database while connected to a remote Turso instance.')
  }

  resetClient()
  const context = await ensureContext()
  if (context.mode !== 'local') {
    return
  }

  await context.execute(`DELETE FROM quotes`)
  await initializeDatabase(context, false)
}

if (isBrowser) {
  window.manthraDb = {
    getClient: ensureContext,
    fetchQuotes,
    searchQuotes,
    createQuote,
    updateQuote,
    deleteQuote,
    makeQuotePublic,
    getStoredConfig,
    saveConfig,
  }
}

export { PUBLIC_REALM_ID }
