import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks'
import fuzzy from 'fuzzy';
import { db, type Quote, PUBLIC_REALM_ID } from '../db';
import style from './Quotes.module.css';
import QuoteEditor from './QuoteEditor';

interface Props {
  loggedIn: boolean;
}

function QuotesList({ loggedIn }: Props) {
  const quotes = useLiveQuery(
    () => db.quotes.toArray(), []
  )
  
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState<Quote[]>([]);
  
  
  return (
    <>
      <input
        placeholder="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={style.mb1}
      />
      {loggedIn && (
        <button
          onClick={() => setAdding(true)}
          className={`${style.block} ${style.mb1}`}
        >
          Add
        </button>
      )}
      
      <div className={style.quotes}>
        <pre>
          {JSON.stringify({ quotes, filtered, search }, null, 2)}
        </pre>
        
        {filtered?.map && filtered.map((q, i) => (
          <QuoteEditor
            key={q.id ?? i}
            quote={q}
            loggedIn={loggedIn}
            updateQuote={updateQuote}
          />
        ))}
      </div>
    </>
  );
}

export default QuotesList;
