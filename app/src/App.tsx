import './App.css'
import QuotesList from './QuotesList'
import { useState } from 'react'
import { db } from './db'

function App() {
  const [tapCount, setTapCount] = useState(0)
  const [canEdit, setCanEdit] = useState(false)

  const handleHeaderTap = async () => {
    const newCount = tapCount + 1
    setTapCount(newCount)
    if (newCount >= 10) {
      setTapCount(0)
      try {
        await db.cloud.login()
        const user = await (db as any).getCurrentUser()
        setCanEdit(user?.email === 'fingerskier@gmail.com')
      } catch (err) {
        console.error('Login failed', err)
      }
    }
  }

  return (
    <div>
      <h1 onClick={handleHeaderTap}>
        Manthra
        <br />
        <sub>considerable careful crafty compositions</sub>
      </h1>
      <QuotesList canEdit={canEdit} />
    </div>
  )
}

export default App
