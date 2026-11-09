import { useState } from 'react'

// Where the admin stores the database's client credentials (the pair in
// dexie-cloud.key). With them set, public quotes become editable and private
// quotes can be published; see src/db/admin.js.
export default function AdminPanel({ isAdmin, onSave, onForget }) {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError(null)
    try {
      await onSave({ clientId, clientSecret })
      setClientId('')
      setClientSecret('')
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="admin">
      <summary>Admin{isAdmin ? ' (on)' : ''}</summary>

      {isAdmin ? (
        <div className="admin__body">
          <p className="account__note">
            Admin key saved in this browser: public quotes can be edited and
            your private quotes published from their edit view.
          </p>
          <div>
            <button type="button" onClick={onForget}>
              Forget admin key
            </button>
          </div>
        </div>
      ) : (
        <form className="admin__body" onSubmit={handleSubmit}>
          <p className="account__note">
            Paste the database client id and secret from{' '}
            <code>dexie-cloud.key</code>. They are checked with Dexie Cloud and
            kept only in this browser.
          </p>

          <label htmlFor="admin-client-id">Client id</label>
          <input
            id="admin-client-id"
            autoComplete="off"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          />

          <label htmlFor="admin-client-secret">Client secret</label>
          <input
            id="admin-client-secret"
            type="password"
            autoComplete="off"
            value={clientSecret}
            onChange={(event) => setClientSecret(event.target.value)}
          />

          {error && <div className="error">{String(error?.message ?? error)}</div>}

          <div>
            <button
              type="submit"
              disabled={busy || !clientId.trim() || !clientSecret.trim()}
            >
              {busy ? 'Checking…' : 'Save admin key'}
            </button>
          </div>
        </form>
      )}
    </details>
  )
}
