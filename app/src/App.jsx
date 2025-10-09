import {useMemo} from 'react'
import Header from '@/Header'
import {useLiveQuery} from 'dexie-react-hooks'
import Quote from '@/Quote'
import db from '@/db'

import './App.css'


export default function App() {
  const quotes = useLiveQuery(() => db.quotes.toArray(), [])

  const sortedQuotes = useMemo(() => {
    if (!quotes) return []

    const newQuotes = quotes.filter(quote => quote.text === 'A new quote')
    const others = quotes.filter(quote => quote.text !== 'A new quote')

    const shuffledOthers = others.slice().sort(() => Math.random() - 0.5)

    return [...newQuotes, ...shuffledOthers]
  }, [quotes])

  return <>
    <Header />

    <main>
      <ul>
        {sortedQuotes.map(quote => <Quote key={quote.id} data={quote} />)}
      </ul>
    </main>
  </>
}