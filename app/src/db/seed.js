import readmeRaw from '../../../README.md?raw'
import { db, PUBLIC_REALM_ID } from './index.js'

// The README lists one quote per paragraph: text lines start at column 0,
// the (optional) author line is indented, and blank lines separate quotes.
export function parseReadmeQuotes(markdown) {
  const blocks = []
  let current = []

  for (const line of markdown.split(/\r?\n/)) {
    if (line.trim() === '') {
      if (current.length) {
        blocks.push(current)
        current = []
      }
    } else {
      current.push(line)
    }
  }
  if (current.length) {
    blocks.push(current)
  }

  const quotes = []
  for (const block of blocks) {
    if (block[0].startsWith('#')) continue // the "# Manthra" title block

    const textLines = []
    let author = ''
    for (const line of block) {
      if (/^\s/.test(line)) {
        author = line.trim()
      } else {
        textLines.push(line.trimEnd())
      }
    }

    const text = textLines.join('\n').trim()
    if (text) {
      quotes.push({ text, author })
    }
  }

  return quotes
}

function fnv1a(input, offsetBasis) {
  let hash = offsetBasis >>> 0
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

// Deterministic id per quote so seeding is idempotent: every client that
// ever runs the seed computes the same ids, and bulkPut converges on a
// single copy of each quote in the cloud database.
function seedId(text, author) {
  const input = `${text}\u0000${author}`
  const a = fnv1a(input, 0x811c9dc5)
  const b = fnv1a(input, 0xcbf29ce4)
  return `qt${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`
}

export function readmeSeedQuotes() {
  return parseReadmeQuotes(readmeRaw).map(({ text, author }) => ({
    id: seedId(text, author),
    text,
    author: author || null,
    tags: [],
    realmId: PUBLIC_REALM_ID,
  }))
}

// Pre-populate the cloud database from the README, but only when the quotes
// table is still empty after the initial pull so an already-populated cloud
// db stays the source of truth.
export async function seedFromReadmeIfEmpty() {
  const count = await db.quotes.count()
  if (count > 0) {
    return 0
  }

  const seeds = readmeSeedQuotes()
  await db.quotes.bulkPut(seeds)
  return seeds.length
}
