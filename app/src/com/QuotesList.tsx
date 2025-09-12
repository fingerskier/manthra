import { useEffect, useState } from 'react';
import { liveQuery as dexieLiveQuery } from 'dexie';
import fuzzy from 'fuzzy';
import { db, type Quote, PUBLIC_REALM_ID } from '../db';
import style from './Quotes.module.css';
import QuoteEditor from './QuoteEditor';

interface Props {
  loggedIn: boolean;
}

function QuotesList({ loggedIn }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState<Quote[]>([]);
  const [newText, setNewText] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newTags, setNewTags] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    // Prefer Dexie Cloud's liveQuery if available
    const cloud = db.cloud as unknown as {
      liveQuery?: typeof dexieLiveQuery;
    };
    const liveQuery = cloud.liveQuery ?? dexieLiveQuery;
    const sub = liveQuery(() => db.quotes.toArray()).subscribe({
      next: (qs: Quote[]) => setQuotes(qs),
      error: (err: unknown) => console.error('Failed to load quotes', err),
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

  useEffect(()=>{
    if (filtered) console.log(filtered)
  }, [filtered])

  const addQuote = async () => {
    if (!newText.trim()) return;
    const res = await db.quotes.add({
      text: newText,
      author: newAuthor.trim() || null,
      tag: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean) ?? [],
      realmId: PUBLIC_REALM_ID,
    })
    console.log('QUOTE ADD', res)
    setNewText('');
    setNewAuthor('');
    setNewTags('');
  };

  const updateQuote = (id: string, changes: Partial<Quote>) => {
    db.quotes.update(id, changes);
  };

  return (
    <>
      <input
        placeholder="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={style.mb1}
      />
      {loggedIn && !adding && (
        <button
          onClick={() => setAdding(true)}
          className={`${style.block} ${style.mb1}`}
        >
          Add
        </button>
      )}

      {loggedIn && adding && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await addQuote();
            setAdding(false);
          }}
          className={style.mb1}
        >
          <textarea
            placeholder="quote"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className={`${style.block} ${style.fullWidth}`}
          />
          <input
            placeholder="author"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            className={`${style.block} ${style.fullWidth} ${style.mt05}`}
          />
          <input
            placeholder="tags (comma separated)"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            className={`${style.block} ${style.fullWidth} ${style.mt05}`}
          />
          <button type="submit" className={style.mt05}>
            Add Quote
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className={`${style.mt05} ${style.ml05}`}
          >
            Cancel
          </button>
        </form>
      )}

      <div className={style.quotes}>
        {filtered.map((q, i) => (
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
