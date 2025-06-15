import { useState, useMemo } from 'react'
import quotesData from './quotes'

interface Quote {
  text: string
  author: string | null
  tag: string[]
}

function QuotesList() {
  const [quotes, setQuotes] = useState<Quote[]>(quotesData as Quote[])
  const [search, setSearch] = useState('')
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [edited, setEdited] = useState(false)

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    if (!term) return quotes
    return quotes.filter((q) =>
      q.text.toLowerCase().includes(term) ||
      (q.author ?? '').toLowerCase().includes(term) ||
      q.tag.some((t) => t.toLowerCase().includes(term))
    )
  }, [search, quotes])

  const handleChange = (index: number, field: keyof Quote, value: string) => {
    setQuotes((qs) => {
      const newQuotes = [...qs]
      newQuotes[index] = {
        ...newQuotes[index],
        [field]: field === 'tag'
          ? value.split(/\s+/).filter(Boolean)
          : value,
      }
      return newQuotes
    })
    setEdited(true)
  }

  const saveFile = () => {
    const content = `const quotes = ${JSON.stringify(quotes, null, 2)}\nexport default quotes\n`
    const blob = new Blob([content], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quotes.js'
    a.click()
    URL.revokeObjectURL(url)
    setEdited(false)
  }

  return (
    <div>
      <input
        placeholder="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />
      {edited && <button onClick={saveFile}>Save</button>}
      {filtered.map((q, i) => (
        <div key={i} style={{ marginBottom: '1rem' }}>
          {editIndex === i ? (
            <div>
              <textarea
                value={q.text}
                onChange={(e) => handleChange(i, 'text', e.target.value)}
                rows={3}
                style={{ width: '100%' }}
              />
              <input
                value={q.author ?? ''}
                onChange={(e) => handleChange(i, 'author', e.target.value)}
                style={{ width: '100%' }}
              />
              <input
                placeholder="tags"
                value={q.tag.join(' ')}
                onChange={(e) => handleChange(i, 'tag', e.target.value)}
                style={{ width: '100%' }}
              />
              <button onClick={() => setEditIndex(null)}>done</button>
            </div>
          ) : (
            <div onDoubleClick={() => setEditIndex(i)}>
              <div>{q.text}</div>
              {q.author && (
                <div style={{ fontStyle: 'italic' }}>- {q.author}</div>
              )}
              {q.tag.length > 0 && <div>tags: {q.tag.join(' ')}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default QuotesList
