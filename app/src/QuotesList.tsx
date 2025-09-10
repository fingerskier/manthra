import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import fuzzy from 'fuzzy';
import { db, type Quote } from './db';
import style from './Quotes.module.css';

function QuotesList() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState<Quote[]>([]);

  useEffect(() => {
    const sub = liveQuery(() => db.quotes.toArray()).subscribe({
      next: (qs) => setQuotes(qs),
      error: (err) => console.error('Failed to load quotes', err),
    });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    const results = fuzzy.filter(search, quotes, {
      extract: (q) => {
        const tags = q.tag?.join(' ') ?? '';
        const author = q.author ?? '';
        return q.text + ' ' + author + ' ' + tags;
      },
    });
    setFiltered(results.map((r) => r.original));
  }, [search, quotes]);

  return (
    <>
      <input
        placeholder="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />
      
      <div className={style.quotes}>
        {filtered.map((q, i) => (
          <div key={q.id ?? i} style={{ marginBottom: '1rem' }}>
            <div className={style.quote}>
              <div>{q.text}</div>
              {q.author && (
                <span className={style.author} style={{ fontStyle: 'italic' }}>
                  {q.author}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default QuotesList;
