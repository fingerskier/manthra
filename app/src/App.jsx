import { useMemo, useState } from 'react'
import { useLiveQuery, useObservable } from 'dexie-react-hooks'
import Header from '@/Header'
import Quote from '@/Quote'
import { db, addQuote, isPublicQuote, login, logout } from '@/db'
import { quoteKey } from '@/db/quoteKey'

import './App.css'

export default function App() {
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)

  const user = useObservable(db.cloud.currentUser)
  const isLoggedIn = Boolean(user?.isLoggedIn)

  const quotes = useLiveQuery(async () => {
    const all = await db.quotes.toArray()
    const term = search.trim().toLowerCase()
    if (!term) return all

    return all.filter(
      (quote) =>
        quote.text?.toLowerCase().includes(term) ||
        (quote.author ?? '').toLowerCase().includes(term),
    )
  }, [search])

  // The signed-in user's private quotes are the ones not published yet: list
  // them first so a newly added quote stays in view, and hide private copies
  // of quotes that are already public. Public quotes are shuffled.
  const shuffledQuotes = useMemo(() => {
    if (!quotes) return null

    const publicQuotes = quotes.filter(isPublicQuote)
    const publicKeys = new Set(publicQuotes.map(quoteKey))
    const unpublished = quotes.filter(
      (quote) => !isPublicQuote(quote) && !publicKeys.has(quoteKey(quote)),
    )

    return [...unpublished, ...publicQuotes.sort(() => Math.random() - 0.5)]
  }, [quotes])

  const handleAddQuote = async (quote) => {
    try {
      await addQuote(quote)
      setError(null)
    } catch (err) {
      console.error('Failed to add quote', err)
      setError(err)
      throw err
    }
  }

  const handleLogin = async () => {
    try {
      await login()
      setError(null)
    } catch (err) {
      console.error('Login failed', err)
      setError(err)
    }
  }

  return (
    <>
      <Header
        search={search}
        onSearchChange={setSearch}
        user={user}
        onLogin={handleLogin}
        onLogout={logout}
        onAddQuote={handleAddQuote}
      />

      <main>
        {error && (
          <div className="error">
            Something went wrong talking to the database.{' '}
            {String(error?.message ?? error)}
          </div>
        )}

        {!shuffledQuotes ? (
          <div className="loading">Loading quotes…</div>
        ) : shuffledQuotes.length === 0 ? (
          <div className="loading">
            No quotes yet.{' '}
            {isLoggedIn
              ? 'Waiting for the first sync…'
              : 'Sign in to sync the shared collection.'}
          </div>
        ) : (
          <ul>
            {shuffledQuotes.map((quote) => (
              <Quote key={quote.id} data={quote} />
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
