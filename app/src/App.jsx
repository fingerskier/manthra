import { useState } from 'react'
import Header from '@/Header'
import {useLiveQuery} from 'dexie-react-hooks'
import Quote from '@/Quote'

import './App.css'


export default function App() {
  const quotes = useLiveQuery(() => db.quotes.toArray(), [])

  return <>
    <Header />

    <main>
      <ul>
        {quotes?.map(quote => <Quote key={quote.id} data={quote} />)}
      </ul>
    </main>
  </>
}