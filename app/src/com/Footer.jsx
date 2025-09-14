import React, {useEffect, useRef, useState} from 'react'
import QuoteUpsert from '@/com/QuoteUpsert'
import {db} from '@/db/conx.js'


export default function Footer() {
  const fileInput = useRef(null)

  const [loggedIn, setLoggedIn] = useState(false)
  const [showUpsert, setShowUpsert] = useState(false)
  const [username, setUsername] = useState('')

  const handleImport = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const quotes = JSON.parse(text)
      if (Array.isArray(quotes)) {
        await db.quotes.bulkPut(quotes)
      }
    } catch (err) {
      console.error('Import failed', err)
    } finally {
      event.target.value = ''
    }
  }

  const handleExport = async () => {
    const quotes = await db.quotes.toArray()
    const blob = new Blob([JSON.stringify(quotes, null, 2)], {type: 'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quotes.json'
    a.click()
    URL.revokeObjectURL(url)
  }


  const handleLogin = () => {
    // dexie-cloud login
    db.cloud.login()
  }


  useEffect(() => {
    // get username from dexie-cloud
    const fetchUser = async () => {
      const user = await db.cloud.getUser()
      if (user) {
        setLoggedIn(true)
        setUsername(user.name || user.email || 'User')
      }
    }
    fetchUser()
  }, [])
  
  
  return <footer>
    &copy; 2024 manthra

    <button onClick={() => setShowUpsert(true)}>Add a Quote</button>

    <button onClick={() => fileInput.current?.click()}>Import</button>
    <input type="file" accept="application/json" ref={fileInput} style={{display: 'none'}} onChange={handleImport} />

    <button onClick={handleExport}>Export</button>

    {loggedIn ? 
      <span>Welcome, {username}!</span>
    :
      <button onClick={handleLogin}>Login</button>
    }

    <QuoteUpsert open={showUpsert} onClose={() => setShowUpsert(false)} />
  </footer>
}