import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, RefreshCw, ShoppingBag, Sparkles, Wand2 } from 'lucide-react';
import { BOOKS, type Book, getBook } from '../data/library';
import { ORACLE_MOOD_LABELS, localRecommendations } from '../lib/semantic';
import { BookCover } from './BookCover';

interface OracleProps {
  onOpenBook: (book: Book) => void;
  onAdd: (book: Book) => void;
}

interface Suggestion {
  book: Book;
  rationale: string;
}

type Source = 'gemini' | 'local' | null;

const EXAMPLES = [
  {
    label: 'Discutir con nuestras propias ideas',
    query: 'Un libro para entender por qué discutimos con nuestras propias ideas'
  },
  {
    label: 'Derechos de los indígenas',
    query: 'Algo sobre la Escuela de Salamanca y los derechos de los indígenas'
  },
  {
    label: 'Poesía para una tarde de lluvia',
    query: 'Poesía que se lea en una tarde de lluvia'
  }
];

export const Oracle: React.FC<OracleProps> = ({ onOpenBook, onAdd }) => {
  const [query, setQuery] = useState('');
  const [mood, setMood] = useState(ORACLE_MOOD_LABELS[0]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [source, setSource] = useState<Source>(null);
  const [notice, setNotice] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  // Al llegar la selección, la traemos a la vista sin sacar al lector de la sección.
  useEffect(() => {
    if (!suggestions || suggestions.length === 0) return;
    const timer = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [suggestions]);

  const runLocal = (reason: string) => {
    const local = localRecommendations(query, mood, 3);
    setSuggestions(local.map((item) => ({ book: item.book, rationale: item.reason })));
    setSource('local');
    setNotice(reason);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setNotice('');
    setSuggestions(null);

    const catalogue = BOOKS.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      year: book.year,
      category: book.category,
      tags: book.tags.slice(0, 6),
      synopsis: book.synopsis
    }));

    try {
      const response = await fetch('/api/ai-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mood, catalogue })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const items: { id: string; rationale: string }[] = Array.isArray(data?.recommendations)
        ? data.recommendations
        : [];

      const resolved = items
        .map((item) => {
          const book = getBook(item.id);
          return book ? { book, rationale: item.rationale } : null;
        })
        .filter((entry): entry is Suggestion => entry !== null);

      if (data?.source === 'gemini' && resolved.length > 0) {
        setSuggestions(resolved);
        setSource('gemini');
      } else {
        runLocal(
          data?.source === 'unconfigured'
            ? 'El Oráculo responde hoy con el motor semántico de la casa.'
            : 'Selección del motor semántico de la casa mientras el Oráculo vuelve.'
        );
      }
    } catch {
      runLocal('El Oráculo descansa un momento: aquí tienes la selección del motor semántico de la casa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="oraculo" className="relative overflow-hidden bg-bark text-paper">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #D99B26 1px, transparent 0)',
          backgroundSize: '22px 22px'
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-gold/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-10 lg:py-24">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
            <Sparkles className="h-3 w-3" />
            Oráculo literario
          </span>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,4.4vw,3.4rem)] font-semibold leading-[1.02] tracking-tight text-paper">
            Dinos qué te pasa. <span className="italic text-gold">Te damos un libro.</span>
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#d6d3d1] sm:text-[15px]">
            El Oráculo no inventa títulos: elige entre las {BOOKS.length} obras que están
            físicamente en la sala y explica por qué. Si no encuentra nada, lo dice.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-2xl border border-[#57534e] bg-bark-soft/70 p-5 backdrop-blur-sm sm:p-7"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <label
                htmlFor="oraculo-mood"
                className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#d6d3d1]"
              >
                Estado de ánimo o tema
              </label>
              <select
                id="oraculo-mood"
                value={mood}
                onChange={(event) => setMood(event.target.value)}
                className="w-full appearance-none rounded-xl border border-[#57534e] bg-bark px-4 py-3 text-sm text-paper outline-none transition-colors focus:border-gold"
              >
                {ORACLE_MOOD_LABELS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="oraculo-query"
                className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#d6d3d1]"
              >
                Cuéntalo con tus palabras <span className="normal-case tracking-normal text-[#a8a29e]">(opcional)</span>
              </label>
              <input
                id="oraculo-query"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ej. un manuscrito perdido y un librero que no quiere venderlo"
                className="w-full rounded-xl border border-[#57534e] bg-bark px-4 py-3 text-sm text-paper placeholder-[#78716c] outline-none transition-colors focus:border-gold"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8a29e]">Prueba:</span>
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => setQuery(example.query)}
                className="rounded-full border border-[#57534e]/70 px-3 py-1.5 text-[11px] text-[#d6d3d1] transition-colors hover:border-gold/60 hover:text-paper"
              >
                {example.label}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[#57534e]/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-relaxed text-[#a8a29e]">
              Sin registro. No guardamos tu consulta.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-ink transition-all hover:bg-gold-deep disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Consultando el fondo…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Invocar al Oráculo
                </>
              )}
            </button>
          </div>
        </form>

        {loading && (
          <div className="mt-8 grid gap-5 md:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-[#57534e]/60 bg-bark-soft/40 p-4">
                <div className="shimmer h-3 w-24 rounded bg-[#57534e]/40" />
                <div className="mt-4 space-y-2">
                  <div className="shimmer h-5 w-3/4 rounded bg-[#57534e]/40" />
                  <div className="shimmer h-3 w-1/2 rounded bg-[#57534e]/30" />
                </div>
                <div className="mt-6 space-y-2">
                  <div className="shimmer h-3 w-full rounded bg-[#57534e]/30" />
                  <div className="shimmer h-3 w-5/6 rounded bg-[#57534e]/30" />
                </div>
              </div>
            ))}
          </div>
        )}

        {suggestions && !loading && (
          <div ref={resultsRef} className="mt-10 scroll-mt-28 animate-fade-up">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#57534e] pb-4">
              <h3 className="flex items-center gap-2 font-display text-2xl font-semibold text-paper">
                <Sparkles className="h-4 w-4 text-gold" />
                Tres libros del fondo
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8a29e]">
                {source === 'gemini' ? 'Selección del Oráculo · Gemini' : 'Motor semántico de la casa'}
              </span>
            </div>

            {notice && (
              <p className="mt-3 text-[11px] text-[#a8a29e]">{notice}</p>
            )}

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {suggestions.map(({ book, rationale }, index) => (
                <article
                  key={book.id}
                  className="group flex flex-col rounded-xl border border-[#57534e]/70 bg-[#3a352e] p-4 transition-colors hover:border-gold/60"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenBook(book)}
                      className="w-[74px] shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/20"
                      aria-label={`Ver ${book.title}`}
                    >
                      <BookCover book={book} compact className="aspect-[3/4.2] w-full" />
                    </button>
                    <div className="min-w-0">
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gold/90">
                        {book.category}
                      </p>
                      <h4 className="mt-1 font-display text-lg font-semibold leading-tight text-paper">
                        <button type="button" onClick={() => onOpenBook(book)} className="text-left hover:text-gold">
                          {book.title}
                        </button>
                      </h4>
                      <p className="mt-0.5 text-[11px] text-[#a8a29e]">{book.author}</p>
                      <p className="mt-2 font-mono text-xs tabular-nums text-[#e7e5e4]">
                        {book.price.toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 border-t border-[#57534e]/60 pt-3 text-[12px] leading-relaxed text-[#d6d3d1]">
                    {rationale}
                  </p>

                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => onAdd(book)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-[11px] font-bold text-ink transition-colors hover:bg-gold-deep"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Añadir
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenBook(book)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#57534e] px-3 py-2 text-[11px] font-semibold text-paper transition-colors hover:border-gold/60"
                    >
                      Ficha
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-5 flex items-center gap-2 text-[11px] text-[#a8a29e]">
              <BookOpen className="h-3.5 w-3.5" />
              Puedes recogerlo en la Rúa Mayor en 2 horas o recibirlo mañana en casa.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
