import React from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {db} from '@/db/conx.js'


export default function QuoteList() {
  const quotes = useLiveQuery(() => db.quotes.where('realmId').anyOf(['public', db.cloud.currentUserId]).toArray())

  return <ul>
    {quotes && quotes.map(quote =>
      <li key={quote.id}>
        <blockquote>"{quote.text}"</blockquote>
        {quote.author && <div>— {quote.author}</div>}
        {quote.tag && <div>{quote.tag}</div>}
      </li>
    )}
  </ul>
}