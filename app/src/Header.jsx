import {useState} from 'react'
import db, {login, logout} from '@/db'
import {useObservable} from 'dexie-react-hooks'


export default function Header() {
  const user = useObservable(db.cloud.currentUser)

  const [collapsed, setCollapsed] = useState(true)


  const addQuote = async () => {
    await db.quotes.add({
      text: 'A new quote',
      author: 'unk',
      realmId: 'rlm-public',
    })
  }


  return <header>
    <h1 onClick={() => setCollapsed(!collapsed)}>Manthra</h1>

    {!collapsed && <>
      {user? <>
        <div>{user?.name}</div>
        <div>
          <button type="button" onClick={login}>Login</button>
          <button type="button" onClick={logout}>Logout</button>
        </div>
        <div>
          <button type="button" onClick={addQuote}>Add Quote</button>
        </div>
      </>:<>
      </>}    
    </>}
  </header>
}