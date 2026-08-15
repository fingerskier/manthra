import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery, useObservable } from 'dexie-react-hooks'
import Header from '@/Header'
import Quote from '@/Quote'
import { db, addQuote, login, logout } from '@/db'
import { seedFromReadmeIfEmpty } from '@/db/seed'

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

  // Once the signed-in user has pulled the cloud db, pre-populate it from
  // the README if it is still empty. Seed ids are deterministic, so this
  // can never duplicate quotes that already live in the cloud.
  useEffect(() => {
    if (!isLoggedIn) return

    let cancelled = false
    ;(async () => {
      try {
        await db.cloud.sync({ purpose: 'pull', wait: true })
        if (cancelled) return
        const seeded = await seedFromReadmeIfEmpty()
        if (seeded) {
          console.info(`Seeded ${seeded} quotes from the README`)
        }
      } catch (err) {
        console.error('Failed to seed quotes from the README', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  const shuffledQuotes = useMemo(
    () => (quotes ? quotes.slice().sort(() => Math.random() - 0.5) : null),
    [quotes],
  )

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
              <Quote key={quote.id} data={quote} canEdit={isLoggedIn} />
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
