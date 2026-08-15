import { useState } from 'react'

export default function Header({
  search,
  onSearchChange,
  user,
  canAdd,
  onLogin,
  onLogout,
  onAddQuote,
}) {
  const [collapsed, setCollapsed] = useState(true)
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [busy, setBusy] = useState(false)

  const isLoggedIn = Boolean(user?.isLoggedIn)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!text.trim() || busy) return

    setBusy(true)
    try {
      await onAddQuote({ text, author })
      setText('')
      setAuthor('')
    } catch {
      // the error banner is rendered by App; keep the form filled in
    } finally {
      setBusy(false)
    }
  }

  return (
    <header>
      <h1 onClick={() => setCollapsed((value) => !value)}>Manthra</h1>

      {!collapsed && (
        <div className="panel">
          <div className="controls">
            <label htmlFor="search">Search</label>
            <input
              id="search"
              placeholder="Search quotes"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>

          <div className="account">
            {isLoggedIn ? (
              <>
                <span className="account__user">
                  {user?.email ?? user?.name ?? user?.userId}
                </span>
                <button type="button" onClick={onLogout}>
                  Sign out
                </button>
              </>
            ) : (
              <button type="button" onClick={onLogin}>
                Sign in to add quotes
              </button>
            )}
          </div>

          {isLoggedIn && !canAdd && (
            <p className="account__note">
              This account can read the public collection but does not have
              permission to add quotes.
            </p>
          )}

          {canAdd && (
            <form className="add-quote" onSubmit={handleSubmit}>
              <h2>Add a public quote</h2>

              <label htmlFor="quote-text">Quote</label>
              <textarea
                id="quote-text"
                rows={3}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="The quote itself"
              />

              <label htmlFor="quote-author">Author</label>
              <input
                id="quote-author"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="Who said it (optional)"
              />

              <div className="add-quote__actions">
                <button type="submit" disabled={busy || !text.trim()}>
                  Add quote
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </header>
  )
}
