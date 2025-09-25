import {useState} from 'react'
import db from '@/db'


export default function Quote({data}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(data.text)
  const [author, setAuthor] = useState(data.author)
  const [tags, setTags] = useState(data.tags || [])


  const deleteQuote = async () => {
    const sure = window.confirm("Are you sure you want to delete this quote?")
    if (!sure) return

    await db.quotes.delete(data.id)
  }


  const makePublic = async () => {
    if (!data?.id) {
      console.warn("No data.id, cannot make quote public", data)
      return
    }

    await db.quotes.update(data.id, {
      ...data,
      realmId: 'rlm-public',
    })
  }


  const updateQuote = async () => {
    if (!data?.id) {
      console.warn("No data.id, cannot update quote", data)
      return
    }

    await db.quotes.update(data.id, {
      text, author, tags
    })

    setEditing(false)
  }


  return <>
    {editing? <div className='quote editor'>
      quote #{data.id} | {data.realmId}
      <textarea className='text' value={text} onChange={e => setText(e.target.value)} />

      <input className='author' value={author} onChange={e => setAuthor(e.target.value)} />

      <input className='tags' value={tags.join(', ')} onChange={e => setTags(e.target.value.split(',').map(t => t.trim()))} />

      <button type="button" onClick={updateQuote}>Save</button>

      <div>
        <button type="button" onClick={() => setEditing(!editing)}>Cancel</button>

        <button type="button" onClick={makePublic}>Make Public</button>

        <button type="button" onClick={deleteQuote}>Delete</button>
      </div>
    </div>
    : <div className='quote'>
      <p className='text'>
        {data.text}
      </p>

      <p className='author'>
        {data.author}

        <button type="button" onClick={() => setEditing(!editing)}>.</button>
      </p>
    </div>}
  </>
}