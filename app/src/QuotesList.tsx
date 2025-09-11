import { useEffect, useState, type FormEvent, type FocusEvent } from 'react';
import { liveQuery } from 'dexie';
import fuzzy from 'fuzzy';
import { db, type Quote, PUBLIC_REALM_ID } from './db';
import QuoteEditor from './QuoteEditor';
import style from './Quotes.module.css';

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
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const addQuote = async (e: FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    await db.quotes.add({
      id: crypto.randomUUID(),
      text: newText,
      author: newAuthor.trim() || null,
      tag:
        newTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean) ?? [],
      realmId: PUBLIC_REALM_ID,
    });
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
        className={style.searchInput}
      />
      {loggedIn && !adding && (
        <button
          onClick={() => setAdding(true)}
          className={style.addButton}
        >
          Add
        </button>
      )}
      {loggedIn && adding && (
        <form
          onSubmit={(e) => {
            addQuote(e);
            setAdding(false);
          }}
          className={style.addForm}
        >
          <textarea
            placeholder="quote"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className={style.fullWidth}
          />
          <input
            placeholder="author"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            className={`${style.fullWidth} ${style.mtHalf}`}
          />
          <input
            placeholder="tags (comma separated)"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            className={`${style.fullWidth} ${style.mtHalf}`}
          />
          <button type="submit" className={style.mtHalf}>
            Add Quote
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className={`${style.mtHalf} ${style.mlHalf}`}
          >
            Cancel
          </button>
        </form>
      )}
      <div className={style.quotes}>
        {filtered.map((q, i) => (
          <div key={q.id ?? i} className={style.quoteWrapper}>
            <div
              className={style.quote}
              onDoubleClick={() => {
                if (loggedIn) setEditingId(q.id!);
              }}
              onBlur={(e: FocusEvent<HTMLDivElement>) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setEditingId(null);
                }
              }}
              tabIndex={-1}
            >
              {loggedIn && editingId !== q.id && (
                <button
                  aria-label="edit quote"
                  onClick={() => setEditingId(q.id!)}
                  className={style.editButton}
                >
                  ✏️
                </button>
              )}
              {loggedIn && editingId === q.id ? (
                <QuoteEditor
                  quote={q}
                  onChange={(changes) => updateQuote(q.id!, changes)}
                />
              ) : (
                <>
                  <div>{q.text}</div>
                  {q.author && (
                    <span className={style.author}>{q.author}</span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default QuotesList;
