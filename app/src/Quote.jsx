import { useEffect, useState } from 'react'
import { usePermissions } from 'dexie-react-hooks'
import { db, deleteQuote, updateQuote } from '@/db'

export default function Quote({ data }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(data.text)
  const [author, setAuthor] = useState(data.author ?? '')
  const [tag, setTag] = useState(data.tag || [])
  const [busy, setBusy] = useState(false)

  // Per-object Dexie Cloud permissions: the current user's rights on this
  // quote's realm decide whether edit/delete controls are shown at all.
  const can = usePermissions(db, 'quotes', data)
  const canUpdate = can?.update('text') ?? false
  const canDelete = can?.delete() ?? false

  useEffect(() => {
    setText(data.text)
    setAuthor(data.author ?? '')
    setTag(data.tag || [])
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
      await updateQuote(data.id, { text, author, tag })
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
            value={tag.join(', ')}
            onChange={(e) =>
              setTag(
                e.target.value
                  .split(',')
                  .map((entry) => entry.trim())
                  .filter(Boolean),
              )
            }
          />

          {canUpdate && (
            <button type="button" onClick={updateQuoteHandler} disabled={busy}>
              Save
            </button>
          )}

          <div>
            <button type="button" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>

            {canDelete && (
              <button type="button" onClick={deleteQuoteHandler} disabled={busy}>
                Delete
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`quote${busy ? ' is-busy' : ''}`}>
          <p className="text">{data.text}</p>

          <p className="author">
            {data.author}

            {(canUpdate || canDelete) && (
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
