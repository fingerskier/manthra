import { quoteKey } from '../../src/db/quoteKey.js'

export const PUBLIC_REALM_ID = 'rlm-public'

function fnv1a(input, offsetBasis) {
  let hash = offsetBasis >>> 0
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

// Deterministic id per quote, so publishing the same quote again (say, after
// an interrupted run) converges on one public object instead of duplicating.
export function publicQuoteId(quote) {
  const input = quoteKey(quote)
  const a = fnv1a(input, 0x811c9dc5)
  const b = fnv1a(input, 0xcbf29ce4)
  return `qt${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`
}

const tagsOf = (quote) => (Array.isArray(quote.tag) ? quote.tag : [])

function toPublic(quote) {
  return {
    id: publicQuoteId(quote),
    text: quote.text.replace(/\r\n?/g, '\n').trim(),
    author: quote.author?.trim() || null,
    tag: [...new Set(tagsOf(quote))],
    realmId: PUBLIC_REALM_ID,
  }
}

// Works out what publishing does, without touching the database:
// - publish:   new public objects to create ({ object, from })
// - drop:      private quotes to delete once their quote is confirmed public
// - conflicts: private quotes left alone, with the reason
// README quotes that are already public (or already planned) are skipped.
export function planPublish({ publicQuotes, privateQuotes = [], readmeQuotes = [] }) {
  const publicByKey = new Map(publicQuotes.map((quote) => [quoteKey(quote), quote]))
  const publicIds = new Set(publicQuotes.map((quote) => quote.id))
  const planned = new Map()
  const drop = []
  const conflicts = []

  const plan = (quote, from) => {
    const object = toPublic(quote)
    if (publicIds.has(object.id)) {
      // Only a hash collision gets here; never overwrite another public quote.
      return `id ${object.id} already belongs to another public quote`
    }
    planned.set(quoteKey(quote), { object, from })
    return null
  }

  for (const quote of privateQuotes) {
    const key = quoteKey(quote)
    const existing = publicByKey.get(key)

    if (existing) {
      // Dropping the private copy must not lose tags only it carries.
      const publicTags = tagsOf(existing)
      if (tagsOf(quote).every((tag) => publicTags.includes(tag))) {
        drop.push({ quote, key })
      } else {
        conflicts.push({ quote, reason: 'already public with different tags' })
      }
      continue
    }

    const twin = planned.get(key)
    if (twin) {
      twin.object.tag = [...new Set([...twin.object.tag, ...tagsOf(quote)])]
    } else {
      const reason = plan(quote, 'private')
      if (reason) {
        conflicts.push({ quote, reason })
        continue
      }
    }
    drop.push({ quote, key })
  }

  for (const quote of readmeQuotes) {
    const key = quoteKey(quote)
    if (publicByKey.has(key) || planned.has(key)) continue

    const reason = plan(quote, 'readme')
    if (reason) {
      conflicts.push({ quote, reason })
    }
  }

  return { publish: [...planned.values()], drop, conflicts }
}
