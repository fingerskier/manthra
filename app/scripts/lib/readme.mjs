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
      quotes.push({ text, author: author || null, tag: [] })
    }
  }

  return quotes
}
