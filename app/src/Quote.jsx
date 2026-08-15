import { useEffect, useState } from 'react'
import { deleteQuote, updateQuote } from '@/db'

export default function Quote({ data, canEdit = false }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(data.text)
  const [author, setAuthor] = useState(data.author ?? '')
  const [tags, setTags] = useState(data.tags || [])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setText(data.text)
    setAuthor(data.author ?? '')
    setTags(data.tags || [])
  }, [data])

  const deleteQuoteHandler = async () => {
    const sure = window.confirm('Are you sure you want to delete this quote?')
    if (!sure) return

    setBusy(true)
    try {
      await deleteQuote(data.id)
    } catch (err) {
      console.error('Failed to delete quote', err)
    } finally {
      setBusy(false)
    }
  }

  const updateQuoteHandler = async () => {
    setBusy(true)
    try {
      await updateQuote(data.id, { text, author, tags })
      setEditing(false)
    } catch (err) {
      console.error('Failed to update quote', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {editing ? (
        <div className={`quote editor${busy ? ' is-busy' : ''}`}>
          <textarea
            className="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <input
            className="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />

          <input
            className="tags"
            value={tags.join(', ')}
            onChange={(e) =>
              setTags(
                e.target.value
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              )
            }
          />

          <button type="button" onClick={updateQuoteHandler} disabled={busy}>
            Save
          </button>

          <div>
            <button type="button" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>

            <button type="button" onClick={deleteQuoteHandler} disabled={busy}>
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className={`quote${busy ? ' is-busy' : ''}`}>
          <p className="text">{data.text}</p>

          <p className="author">
            {data.author}

            {canEdit && (
              <button type="button" onClick={() => setEditing(true)} disabled={busy}>
                .
              </button>
            )}
          </p>
        </div>
      )}
    </>
  )
}
