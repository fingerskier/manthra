import React from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {db} from '@/db/conx.js'


export default function QuoteList() {
  const quotes = useLiveQuery(() => db.quotes.toArray())
  
  
  return <main>
    <ul>
      {quotes && quotes.map(quote =>
        <li key={quote.id}>
          <blockquote>"{quote.text}"</blockquote>
          {quote.author && <div className="author">{quote.author}</div>}
        </li>
      )}
    </ul>
  </main>
}