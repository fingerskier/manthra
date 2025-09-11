import { useEffect, useState, type FormEvent, type FocusEvent } from 'react';
import { liveQuery } from 'dexie';
import fuzzy from 'fuzzy';
import { db, type Quote, PUBLIC_REALM_ID } from './db';
import style from './Quotes.module.css';

interface Props {
  editable: boolean;
  loggedIn: boolean;
}

function QuotesList({ editable, loggedIn }: Props) {
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
        style={{ marginBottom: '1rem' }}
      />
      {loggedIn && !adding && (
        <button
          onClick={() => setAdding(true)}
          style={{ display: 'block', marginBottom: '1rem' }}
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
          style={{ marginBottom: '1rem' }}
        >
          <textarea
            placeholder="quote"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            style={{ display: 'block', width: '100%' }}
          />
          <input
            placeholder="author"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: '0.5rem' }}
          />
          <input
            placeholder="tags (comma separated)"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: '0.5rem' }}
          />
          <button type="submit" style={{ marginTop: '0.5rem' }}>
            Add Quote
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            style={{ marginTop: '0.5rem', marginLeft: '0.5rem' }}
          >
            Cancel
          </button>
        </form>
      )}
      <div className={style.quotes}>
        {filtered.map((q, i) => (
          <div key={q.id ?? i} style={{ marginBottom: '1rem' }}>
            <div
              className={style.quote}
              onDoubleClick={() => {
                if (editable) setEditingId(q.id!);
              }}
              onBlur={(e: FocusEvent<HTMLDivElement>) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setEditingId(null);
                }
              }}
              tabIndex={-1}
            >
              {editable && loggedIn && editingId !== q.id && (
                <button
                  aria-label="edit quote"
                  onClick={() => setEditingId(q.id!)}
                  style={{
                    float: 'right',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  ✏️
                </button>
              )}
              {editable && editingId === q.id ? (
                <>
                  <textarea
                    value={q.text}
                    onChange={(e) => updateQuote(q.id!, { text: e.target.value })}
                    style={{ display: 'block', width: '100%' }}
                  />
                  <input
                    value={q.author ?? ''}
                    onChange={(e) => updateQuote(q.id!, { author: e.target.value })}
                    style={{ display: 'block', width: '100%', marginTop: '0.5rem' }}
                  />
                  <input
                    value={q.tag.join(', ')}
                    onChange={(e) =>
                      updateQuote(q.id!, {
                        tag: e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    style={{ display: 'block', width: '100%', marginTop: '0.5rem' }}
                  />
                </>
              ) : (
                <>
                  <div>{q.text}</div>
                  {q.author && (
                    <span className={style.author} style={{ fontStyle: 'italic' }}>
                      {q.author}
                    </span>
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
