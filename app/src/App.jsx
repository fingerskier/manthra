import { useCallback, useEffect, useMemo, useState } from 'react'
import Header from '@/Header'
import Quote from '@/Quote'
import {
  createQuote,
  searchQuotes,
  saveConfig,
  getStoredConfig,
} from '@/db'

import './App.css'

export default function App() {
  const [quotes, setQuotes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [config, setConfig] = useState(() => getStoredConfig())

  const configKey = useMemo(() => JSON.stringify(config), [config])

  const refreshQuotes = useCallback(
    async (term) => {
      const activeTerm = typeof term === 'string' ? term : search
      setLoading(true)
      try {
        const data = await searchQuotes(activeTerm)
        setQuotes(data)
        setError(null)
      } catch (err) {
        console.error('Failed to load quotes', err)
        setError(err)
      } finally {
        setLoading(false)
      }
    },
    [search],
  )

  useEffect(() => {
    refreshQuotes(search)
  }, [refreshQuotes, search, configKey])

  const sortedQuotes = useMemo(() => {
    if (!quotes) return []

    const newQuotes = quotes.filter((quote) => quote.text === 'A new quote')
    const others = quotes.filter((quote) => quote.text !== 'A new quote')

    const shuffledOthers = others.slice().sort(() => Math.random() - 0.5)

    return [...newQuotes, ...shuffledOthers]
  }, [quotes])

  const handleSearchChange = (value) => {
    setSearch(value)
  }

  const handleAddQuote = async () => {
    try {
      await createQuote({ text: 'A new quote', author: 'unk', tags: [] })
      await refreshQuotes()
    } catch (err) {
      console.error('Failed to add quote', err)
      setError(err)
    }
  }

  const handleConfigSave = (nextConfig) => {
    const normalized = saveConfig(nextConfig)
    setConfig(normalized)
  }

  const handleQuoteChange = () => {
    void refreshQuotes()
  }

  return (
    <>
      <Header
        search={search}
        onSearchChange={handleSearchChange}
        onAddQuote={handleAddQuote}
        onSaveConfig={handleConfigSave}
        config={config}
      />

      <main>
        {error && (
          <div className="error">
            There was a problem communicating with the database. Please check
            your Turso configuration and try again.
          </div>
        )}

        {loading ? (
          <div className="loading">Loading quotes…</div>
        ) : (
          <ul>
            {sortedQuotes.map((quote) => (
              <Quote key={quote.id} data={quote} onChange={handleQuoteChange} />
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
