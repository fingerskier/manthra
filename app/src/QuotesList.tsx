import { useEffect, useState } from 'react'
import quotesData from './quotes'
import fuzzy from 'fuzzy'

import style from './Quotes.module.css'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    showSaveFilePicker?: (options?: any) => Promise<any>
  }
}

interface Quote {
  text: string
  author: string | null
  tag: string[]
}

interface QuotesListProps {
  canEdit: boolean
}

function QuotesList({ canEdit }: QuotesListProps) {
  const [quotes, setQuotes] = useState<Quote[]>(quotesData as Quote[])
  const [search, setSearch] = useState('')
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [edited, setEdited] = useState(false)
  const [filtered, setFiltered] = useState<Quote[]>(quotes)

  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [tags, setTags] = useState('')


  const addQuote = () => {
    if (!canEdit) return
    setQuotes([
      ...quotes,
      {
        text: 'new quote',
        author: 'new author',
        tag: ['new', 'tag']
      }
    ])
    setEditIndex(quotes.length)
    setText('new quote')
    setAuthor('new author')
    setTags('new tag')
    // scroll to bottom
    const quotesList = document.querySelector(`.${style.quotes}`)
    if (quotesList) {
      quotesList.scrollTo({
        top: quotesList.scrollHeight,
        behavior: 'smooth'
      })
    }
  }


  const handleChange = () => {
    if (editIndex === null) return
    setQuotes((qs) => {
      const newQuotes = [...qs]
      newQuotes[editIndex] = {
        ...newQuotes[editIndex],
        text,
        author,
        tag: tags.split(/\s+/).filter(Boolean),
      }
      return newQuotes
    })
    setEdited(true)
    setEditIndex(null)
  }


  const handleEditMode = (index: number) => () => {
    if (!canEdit) return
    setEditIndex(index)
    setText(quotes[index].text)
    setAuthor(quotes[index].author ?? '')
    setTags(quotes[index].tag.join(' '))
  }


  const saveFile = async () => {
    const content = `const quotes = ${JSON.stringify(quotes, null, 2)}\nexport default quotes\n`

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker!({
          suggestedName: 'quotes.ts',
          types: [
            {
              description: 'JavaScript Files',
              accept: { 'application/javascript': ['.ts'] },
            },
          ],
        })
        const writable = await handle.createWritable()
        await writable.write(content)
        await writable.close()
        setEdited(false)
        return
      } catch (err: unknown) {
        if ((err as DOMException)?.name !== 'AbortError') {
          console.error('Failed to save file', err)
        }
      }
    }

    const blob = new Blob([content], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quotes.js'
    a.click()
    URL.revokeObjectURL(url)
    setEdited(false)
  }


  useEffect(() => {
    const results = fuzzy.filter(search, quotes, {
      extract: (q) =>{
        const text = q.text + (q.author ?? '')
        const tags = q?.tag?.join(' ')
        return text + ' ' + tags
      },
    })
    setFiltered(results.map((r) => r.original))
  }, [search, quotes])


  return <>
    <input
      placeholder="search"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      style={{ marginBottom: '1rem' }}
    />

    {edited && canEdit && <button onClick={saveFile}>Save</button>}

    {canEdit && <button onClick={addQuote}>+</button>}

    <div className={style.quotes}>
      {filtered.map((q, i) => (
        <div key={i} style={{ marginBottom: '1rem' }}>
          {editIndex === i ? (
            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="quote"
                rows={3}
                style={{ width: '100%' }}
              />
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="author"
                style={{ width: '100%' }}
              />
              <input
                placeholder="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                style={{ width: '100%' }}
              />
              <button onClick={handleChange}>done</button>
            </div>
          ) : (
            <div
              onDoubleClick={canEdit ? handleEditMode(i) : undefined}
              className={style.quote}
            >
              <div>{q.text}</div>
              {q.author && (
                <span className={style.author} style={{ fontStyle: 'italic' }}>
                  {q.author}
                </span>
              )}
              {/* {q.tag.length > 0 && <div>tags: {q.tag.join(' ')}</div>} */}
            </div>
          )}
        </div>
      ))}
    </div>
  </>
}

export default QuotesList
