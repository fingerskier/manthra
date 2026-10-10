// Two quotes are the same quote when their text and author match, ignoring
// surrounding whitespace, line-ending style and a missing author. Used by the
// app to hide private copies of public quotes and by the publish-quotes CLI
// to find quotes that are already public.
export function quoteKey({ text, author }) {
  const clean = (value) => (value ?? '').replace(/\r\n?/g, '\n').trim()
  return `${clean(text)}\u0000${clean(author)}`
}
