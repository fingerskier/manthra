import { useEffect, useState } from 'react'

export default function Header({
  search,
  onSearchChange,
  onAddQuote,
  onSaveConfig,
  config,
}) {
  const [collapsed, setCollapsed] = useState(true)
  const [url, setUrl] = useState(config?.url ?? '')
  const [token, setToken] = useState(config?.token ?? '')

  useEffect(() => {
    setUrl(config?.url ?? '')
    setToken(config?.token ?? '')
  }, [config])

  const handleSubmit = (event) => {
    event.preventDefault()
    onSaveConfig({ url, token })
  }

  const handleClear = () => {
    setUrl('')
    setToken('')
    onSaveConfig({ url: '', token: '' })
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

            <button type="button" onClick={onAddQuote}>
              Add Quote
            </button>
          </div>

          <form className="settings" onSubmit={handleSubmit}>
            <h2>Database Settings</h2>

            <label htmlFor="turso-url">TURSO_URL</label>
            <input
              id="turso-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="libsql://example.turso.io"
            />

            <label htmlFor="turso-token">TURSO_TOKEN</label>
            <input
              id="turso-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Access token"
            />

            <div className="settings__actions">
              <button type="submit">Save settings</button>
              <button type="button" onClick={handleClear}>
                Clear
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  )
}
