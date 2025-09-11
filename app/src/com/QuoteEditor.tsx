import { useState, type FocusEvent } from 'react';
import { type Quote } from '../db';
import style from './Quotes.module.css';

interface Props {
  quote: Quote;
  loggedIn: boolean;
  updateQuote: (id: string, changes: Partial<Quote>) => void;
}

function QuoteEditor({ quote: q, loggedIn, updateQuote }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <div className={style.mb1}>
      <div
        className={style.quote}
        onDoubleClick={() => {
          if (loggedIn) setEditing(true);
        }}
        onBlur={(e: FocusEvent<HTMLDivElement>) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setEditing(false);
          }
        }}
        tabIndex={-1}
      >
        {loggedIn && !editing && (
          <button
            aria-label="edit quote"
            onClick={() => setEditing(true)}
            className={style.editButton}
          >
            ✏️
          </button>
        )}
        {loggedIn && editing ? (
          <>
            <textarea
              value={q.text}
              onChange={(e) => updateQuote(q.id!, { text: e.target.value })}
              className={`${style.block} ${style.fullWidth}`}
            />
            <input
              value={q.author ?? ''}
              onChange={(e) => updateQuote(q.id!, { author: e.target.value })}
              className={`${style.block} ${style.fullWidth} ${style.mt05}`}
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
              className={`${style.block} ${style.fullWidth} ${style.mt05}`}
            />
          </>
        ) : (
          <>
            <div>{q.text}</div>
            {q.author && <span className={style.author}>{q.author}</span>}
          </>
        )}
      </div>
    </div>
  );
}

export default QuoteEditor;
