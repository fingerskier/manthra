import { type Quote } from './db';
import style from './Quotes.module.css';

interface Props {
  quote: Quote;
  onChange: (changes: Partial<Quote>) => void;
}

function QuoteEditor({ quote, onChange }: Props) {
  return (
    <>
      <textarea
        value={quote.text}
        onChange={(e) => onChange({ text: e.target.value })}
        className={style.fullWidth}
      />
      <input
        value={quote.author ?? ''}
        onChange={(e) => onChange({ author: e.target.value })}
        className={`${style.fullWidth} ${style.mtHalf}`}
      />
      <input
        value={quote.tag.join(', ')}
        onChange={(e) =>
          onChange({
            tag: e.target.value
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          })
        }
        className={`${style.fullWidth} ${style.mtHalf}`}
      />
    </>
  );
}

export default QuoteEditor;
