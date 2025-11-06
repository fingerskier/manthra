import { useEffect, useState } from 'react'
import { deleteQuote, makeQuotePublic, updateQuote } from '@/db'

export default function Quote({ data, onChange }) {
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
    if (!data?.id) {
      console.warn('No data.id, cannot delete quote', data)
      return
    }

    const sure = window.confirm('Are you sure you want to delete this quote?')
    if (!sure) return

    setBusy(true)
    try {
      await deleteQuote(data.id)
      onChange?.()
    } catch (err) {
      console.error('Failed to delete quote', err)
    } finally {
      setBusy(false)
    }
  }

  const makePublic = async () => {
    if (!data?.id) {
      console.warn('No data.id, cannot make quote public', data)
      return
    }

    setBusy(true)
    try {
      await makeQuotePublic(data.id)
      onChange?.()
    } catch (err) {
      console.error('Failed to make quote public', err)
    } finally {
      setBusy(false)
    }
  }

  const updateQuoteHandler = async () => {
    if (!data?.id) {
      console.warn('No data.id, cannot update quote', data)
      return
    }

    setBusy(true)
    try {
      await updateQuote(data.id, { text, author, tags, realmId: data.realmId })
      setEditing(false)
      onChange?.()
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
          quote #{data.id} | {data.realmId}
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
            <button type="button" onClick={() => setEditing(!editing)} disabled={busy}>
              Cancel
            </button>

            <button type="button" onClick={makePublic} disabled={busy}>
              Make Public
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

            <button type="button" onClick={() => setEditing(!editing)} disabled={busy}>
              .
            </button>
          </p>
        </div>
      )}
    </>
  )
}
