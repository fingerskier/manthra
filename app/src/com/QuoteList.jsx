import React from 'react'
import {useLiveQuery} from 'dexie-react-hooks'


export default function QuoteList() {
  const quotes = useLiveQuery(() => db.quotes.toArray())

  return <ul>
    {quotes && quotes.map(quote =>
      <li key={quote.id}>
        <blockquote>"{quote.text}"</blockquote>
      </li>
    )}
  </ul>
}