import assert from 'node:assert/strict'
import { test } from 'node:test'
import { quoteKey } from '../../src/db/quoteKey.js'
import { planPublish, publicQuoteId, PUBLIC_REALM_ID } from './plan.mjs'
import { parseReadmeQuotes } from './readme.mjs'

const pub = (id, text, author, tag = []) => ({ id, text, author, tag, realmId: PUBLIC_REALM_ID })
const priv = (id, text, author, tag = []) => ({
  id,
  text,
  author,
  tag,
  realmId: 'me@example.com',
  owner: 'me@example.com',
})

test('quoteKey ignores whitespace, line endings and a missing author', () => {
  assert.equal(quoteKey({ text: ' a\r\nb ', author: null }), quoteKey({ text: 'a\nb', author: '' }))
  assert.notEqual(quoteKey({ text: 'a', author: 'X' }), quoteKey({ text: 'a', author: 'Y' }))
})

test('private copies of public quotes are dropped, not republished', () => {
  const plan = planPublish({
    publicQuotes: [pub('1', 'Same', 'Ann', ['x', 'y'])],
    privateQuotes: [priv('p1', 'Same ', 'Ann', ['x'])],
  })
  assert.deepEqual(plan.publish, [])
  assert.deepEqual(plan.drop.map(({ quote }) => quote.id), ['p1'])
  assert.deepEqual(plan.conflicts, [])
})

test('a private copy with tags the public quote lacks is left alone', () => {
  const plan = planPublish({
    publicQuotes: [pub('1', 'Same', 'Ann', ['x'])],
    privateQuotes: [priv('p1', 'Same', 'Ann', ['x', 'mine'])],
  })
  assert.deepEqual(plan.publish, [])
  assert.deepEqual(plan.drop, [])
  assert.equal(plan.conflicts.length, 1)
})

test('new private quotes are published with a deterministic public id', () => {
  const quote = priv('p1', 'Fresh', null, ['t'])
  const plan = planPublish({ publicQuotes: [], privateQuotes: [quote] })
  assert.deepEqual(plan.publish, [
    {
      object: {
        id: publicQuoteId(quote),
        text: 'Fresh',
        author: null,
        tag: ['t'],
        realmId: PUBLIC_REALM_ID,
      },
      from: 'private',
    },
  ])
  assert.deepEqual(plan.drop.map(({ quote }) => quote.id), ['p1'])
  assert.notEqual(publicQuoteId(quote), quote.id)
})

test('duplicate private quotes publish once with merged tags', () => {
  const plan = planPublish({
    publicQuotes: [],
    privateQuotes: [priv('p1', 'Twice', 'Bo', ['a']), priv('p2', 'Twice', 'Bo', ['b'])],
  })
  assert.equal(plan.publish.length, 1)
  assert.deepEqual(plan.publish[0].object.tag, ['a', 'b'])
  assert.deepEqual(plan.drop.map(({ quote }) => quote.id), ['p1', 'p2'])
})

test('README quotes are published only when not public or planned yet', () => {
  const plan = planPublish({
    publicQuotes: [pub('1', 'Old', 'Ann')],
    privateQuotes: [priv('p1', 'Mine', 'Me', ['t'])],
    readmeQuotes: [
      { text: 'Old', author: 'Ann', tag: [] },
      { text: 'Mine', author: 'Me', tag: [] },
      { text: 'New', author: null, tag: [] },
    ],
  })
  assert.deepEqual(
    plan.publish.map(({ object, from }) => [object.text, from]),
    [
      ['Mine', 'private'],
      ['New', 'readme'],
    ],
  )
})

test('never plans over an existing public id', () => {
  const quote = priv('p1', 'Collides', 'Cy')
  const plan = planPublish({
    publicQuotes: [pub(publicQuoteId(quote), 'Something else', 'Di')],
    privateQuotes: [quote],
  })
  assert.deepEqual(plan.publish, [])
  assert.deepEqual(plan.drop, [])
  assert.equal(plan.conflicts.length, 1)
})

test('parseReadmeQuotes reads text, indented author, and skips the title', () => {
  const markdown = '# Manthra\nTagline\n\n\nLine one\nLine two\n  Author\n\n\nNo author\n'
  assert.deepEqual(parseReadmeQuotes(markdown), [
    { text: 'Line one\nLine two', author: 'Author', tag: [] },
    { text: 'No author', author: null, tag: [] },
  ])
})
