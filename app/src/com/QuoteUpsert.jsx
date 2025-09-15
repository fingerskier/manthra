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
    <div className="upsert">
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
          <label>Tags (comma separated)<br/>
            <input value={tag} onChange={e => setTag(e.target.value)} />
          </label>
        </div>
        
        <div>
          <button type="submit">Save</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
