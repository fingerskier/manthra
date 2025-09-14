import React, {useState} from 'react'
import {db} from '@/db/conx.js'

export default function QuoteUpsert({open, onClose}) {
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [tag, setTag] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      await db.quotes.put({text, author, tag})
      setText('')
      setAuthor('')
      setTag('')
      onClose?.()
    } catch (err) {
      console.error('Failed to save quote', err)
    }
  }

  if (!open) return null

  return (
    <div className="modal" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)'}}>
      <div style={{background: 'white', margin: '10% auto', padding: '1rem', maxWidth: '400px'}}>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Quote<br/>
              <textarea value={text} onChange={e => setText(e.target.value)} required />
            </label>
          </div>
          <div>
            <label>Author<br/>
              <input value={author} onChange={e => setAuthor(e.target.value)} />
            </label>
          </div>
          <div>
            <label>Tags<br/>
              <input value={tag} onChange={e => setTag(e.target.value)} />
            </label>
          </div>
          <div style={{marginTop: '1rem'}}>
            <button type="submit">Save</button>
            <button type="button" onClick={onClose} style={{marginLeft: '0.5rem'}}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

