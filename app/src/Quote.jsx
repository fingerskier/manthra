import { useState } from 'react'
import { usePermissions } from 'dexie-react-hooks'
import {
  db,
  deletePublicQuote,
  deleteQuote,
  isPublicQuote,
  publishQuote,
  updatePublicQuote,
  updateQuote,
} from '@/db'

export default function Quote({ data, isAdmin = false }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(data.text)
  const [author, setAuthor] = useState(data.author ?? '')
  const [tag, setTag] = useState(data.tag || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Per-object Dexie Cloud permissions decide what the signed-in user may do
  // to a quote through sync, which in practice covers their own private
  // quotes. Public quotes are only writable with the admin key (REST).
  const can = usePermissions(db, 'quotes', data)
  const isPrivate = !isPublicQuote(data)
  const canUpdate = isPrivate ? (can?.update('text') ?? false) : isAdmin
  const canDelete = isPrivate ? (can?.delete() ?? false) : isAdmin
  const canPublish = isPrivate && isAdmin && canDelete

  const run = async (label, action) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      return true
    } catch (err) {
      console.error(`Failed to ${label} quote`, err)
      setError(err)
      return false
    } finally {
      setBusy(false)
    }
  }

  const deleteQuoteHandler = () => {
    const sure = window.confirm(
      isPrivate
        ? 'Are you sure you want to delete this quote?'
        : 'Delete this quote from the public collection, for everyone?',
    )
    if (!sure) return

    run('delete', () => (isPrivate ? deleteQuote(data.id) : deletePublicQuote(data)))
  }

  const updateQuoteHandler = async () => {
    const fields = { text, author, tag }
    const saved = await run('update', () =>
      isPrivate ? updateQuote(data.id, fields) : updatePublicQuote(data, fields),
    )
    if (saved) setEditing(false)
  }

  // Publishes what the editor shows, so there's no need to save first.
  const publishQuoteHandler = () =>
    run('publish', () => publishQuote(data, { text, author, tag }))

  // The editor starts from the stored quote each time it opens, and is not
  // reset while open: a sync can re-deliver `data` at any moment, and that
  // must not wipe what is being typed.
  const openEditor = () => {
    setText(data.text)
    setAuthor(data.author ?? '')
    setTag(data.tag || [])
    setError(null)
    setEditing(true)
  }

  return (
    <>
      {editing ? (
        <div className={`quote editor${busy ? ' is-busy' : ''}`}>
          <textarea
            className="text"
            aria-label="Quote"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <input
            className="author"
            aria-label="Author"
            placeholder="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />

          <input
            className="tags"
            aria-label="Tags"
            placeholder="Tags, comma separated"
            defaultValue={tag.join(', ')}
            onChange={(e) =>
              setTag(
                e.target.value
                  .split(',')
                  .map((entry) => entry.trim())
                  .filter(Boolean),
              )
            }
          />

          {error && <div className="error">{String(error?.message ?? error)}</div>}

          <div className="quote__actions">
            {canUpdate && (
              <button
                type="button"
                onClick={updateQuoteHandler}
                disabled={busy || !text.trim()}
              >
                Save
              </button>
            )}

            {canPublish && (
              <button
                type="button"
                onClick={publishQuoteHandler}
                disabled={busy || !text.trim()}
              >
                Publish
              </button>
            )}

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
        <div className={`quote${isPrivate ? ' is-private' : ''}${busy ? ' is-busy' : ''}`}>
          <p className="text">{data.text}</p>

          <p className="author">
            {isPrivate && <span className="quote__badge">private</span>}
            {data.author}

            {(canUpdate || canDelete) && (
              <button
                type="button"
                aria-label="Edit quote"
                onClick={openEditor}
                disabled={busy}
              >
                .
              </button>
            )}
          </p>
        </div>
      )}
    </>
  )
}
