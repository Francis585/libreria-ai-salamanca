import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, RefreshCw, ShoppingBag, Sparkles, Wand2 } from 'lucide-react';
import { BOOKS, type Book, getBook } from '../data/library';
import { SECCION_IA } from '../lib/brand';
import { ORACLE_MOOD_LABELS, localRecommendations, obrasPorTema, temasDelCatalogo } from '../lib/semantic';
import { BookCover } from './BookCover';

interface OracleProps {
  onOpenBook: (book: Book) => void;
  onAdd: (book: Book) => void;
}

interface Suggestion {
  book: Book;
  rationale: string;
  glossary?: string[];
}

type Source = 'gemini' | 'local' | 'catalogo' | null;

type Registro = 'llano' | 'divulgativo' | 'erudito';

const REGISTROS: { value: Registro; label: string; hint: string }[] = [
  { value: 'llano', label: 'Sin dar nada por sabido', hint: 'Frases cortas, cero jerga, con glosario' },
  { value: 'divulgativo', label: 'Divulgativo', hint: 'Lenguaje corriente, sin academicismo' },
  { value: 'erudito', label: 'Erudito', hint: 'Tradición, escuela y época' }
];

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
  },
  {
    label: 'Un regalo de menos de 20 €',
    query: 'Quiero un regalo de menos de 20 euros para mi madre'
  }
];

interface Abstention {
  message: string;
  nearest: { id: string; title: string; reason: string }[];
}

export const Oracle: React.FC<OracleProps> = ({ onOpenBook, onAdd }) => {
  const [query, setQuery] = useState('');
  const [mood, setMood] = useState('');
  const [temas, setTemas] = useState<string[]>([]);
  const gruposTemas = React.useMemo(() => temasDelCatalogo(), []);
  const [registro, setRegistro] = useState<Registro>('divulgativo');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [abstention, setAbstention] = useState<Abstention | null>(null);
  const [source, setSource] = useState<Source>(null);
  const [notice, setNotice] = useState('');
  const [meta, setMeta] = useState<string>('');
  const resultsRef = useRef<HTMLDivElement>(null);

  // Al llegar la selección, la traemos a la vista sin sacar al lector de la sección.
  useEffect(() => {
    if ((!suggestions || suggestions.length === 0) && !abstention) return;
    const timer = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [suggestions, abstention]);

  const runLocal = (reason: string) => {
    const local = localRecommendations(query, mood, 3, temas);
    setSuggestions(local.map((item) => ({ book: item.book, rationale: item.reason })));
    setSource('local');
    setNotice(reason);
    setMeta('');
  };

  const reset = () => {
    setSuggestions(null);
    setAbstention(null);
    setNotice('');
    setMeta('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setNotice('');
    reset();

    const catalogue = BOOKS.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      year: book.year,
      price: book.price,
      category: book.category,
      thematic: book.thematic,
      epoch: book.epoch,
      tags: book.tags,
      keywords: book.keywords,
      synopsis: book.synopsis,
      entities: book.entities
    }));

    try {
      const response = await fetch('/api/ai-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          // el modelo recibe el ánimo y los temas elegidos en el mismo campo de contexto
          mood: [mood, ...temas].filter(Boolean).join(' · '),
          temas,
          registro,
          catalogue
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const items: { id: string; rationale: string; glossary?: string[] }[] = Array.isArray(
        data?.recommendations
      )
        ? data.recommendations
        : [];

      const resolved = items
        .map((item): Suggestion | null => {
          const book = getBook(item.id);
          if (!book) return null;
          return item.glossary && item.glossary.length > 0
            ? { book, rationale: item.rationale, glossary: item.glossary }
            : { book, rationale: item.rationale };
        })
        .filter((entry): entry is Suggestion => entry !== null);

      const stats = data?.meta
        ? data.meta.ms < 200
          ? 'Respuesta directa del fondo · sin llamar al modelo'
          : `${data.meta.candidatos} de ${data.meta.catalogo} fichas · ${(data.meta.ms / 1000).toFixed(1)} s`
        : '';

      if (data?.source === 'gemini' && resolved.length > 0) {
        setSuggestions(resolved);
        setSource('gemini');
        setMeta(stats);
        return;
      }

      if (data?.source === 'catalogo' && resolved.length > 0) {
        setSuggestions(resolved);
        setSource('catalogo');
        setMeta(stats);
        return;
      }

      if (data?.source === 'no_match') {
        setAbstention({
          message: data?.message ?? 'No hay nada en la sala que responda a eso.',
          nearest: Array.isArray(data?.nearest) ? data.nearest : []
        });
        setSource('gemini');
        setMeta(stats);
        return;
      }

      runLocal(
        data?.source === 'unconfigured'
          ? 'El librero responde hoy con el motor semántico de la casa.'
          : 'Selección del motor semántico de la casa mientras vuelve el librero.'
      );
    } catch {
      runLocal('El librero descansa un momento: aquí tienes la selección del motor semántico de la casa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id={SECCION_IA.ancla} className="relative overflow-hidden border-y border-line bg-mist/40 text-ink">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #3b3bf5 1px, transparent 0)',
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
            Recomendación de la casa
          </span>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,4.4vw,3.4rem)] font-semibold leading-[1.02] tracking-tight text-ink">
            Dinos qué te pasa. <span className="italic text-gold">Te damos un libro.</span>
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-warm sm:text-[15px]">
            El librero no inventa títulos: elige entre las {BOOKS.length} obras que están
            físicamente en la sala y explica por qué. Si no encuentra nada, lo dice. Y si no
            sabes qué pedir, no te devuelve la pregunta: te enseña por dónde empezar.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-2xl border border-line bg-paper p-5 backdrop-blur-sm sm:p-7"
        >
          {/* Atajos de la casa: los ánimos curados de siempre, ahora como chips */}
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-warm">
              Atajos de la casa
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ORACLE_MOOD_LABELS.map((option) => {
                const activo = mood === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setMood(activo ? '' : option)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                      activo
                        ? 'border-gold bg-gold/15 text-gold'
                        : 'border-line text-muted-warm hover:border-gold/50 hover:text-ink'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Materias y temas: se construyen con las etiquetas reales del fondo */}
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-warm">
                O busca por materia y tema
                <span className="ml-2 normal-case tracking-normal text-muted">
                  {gruposTemas.length} materias · {gruposTemas.reduce((n, g) => n + g.temas.length, 0)} temas
                </span>
              </p>
              {(temas.length > 0 || mood) && (
                <button
                  type="button"
                  onClick={() => {
                    setTemas([]);
                    setMood('');
                  }}
                  className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted hover:text-ink"
                >
                  Limpiar
                </button>
              )}
            </div>

            {temas.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {temas.map((tema) => (
                  <li key={tema}>
                    <button
                      type="button"
                      onClick={() => setTemas((prev) => prev.filter((t) => t !== tema))}
                      className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[10.5px] font-semibold text-bark hover:bg-gold-deep"
                    >
                      {tema}
                      <span aria-hidden="true">×</span>
                      <span className="sr-only">Quitar {tema}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-2 max-h-[204px] space-y-3 overflow-y-auto rounded-xl border border-line bg-paper p-3 thin-scroll">
              {gruposTemas.map((grupo) => (
                <div key={grupo.materia}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                    {grupo.materia}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {grupo.temas.map((tema) => {
                      const activo = temas.includes(tema);
                      return (
                        <button
                          key={tema}
                          type="button"
                          aria-pressed={activo}
                          onClick={() =>
                            setTemas((prev) => (activo ? prev.filter((t) => t !== tema) : [...prev, tema]))
                          }
                          className={`rounded border px-2 py-1 text-[10.5px] transition-colors ${
                            activo
                              ? 'border-gold bg-gold/15 text-gold'
                              : 'border-line text-muted-warm hover:border-muted/40 hover:text-ink'
                          }`}
                        >
                          {tema}
                          <span className="ml-1 font-mono text-[8.5px] text-muted">{obrasPorTema(tema)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <label
                htmlFor="oraculo-query"
                className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-warm"
              >
                Cuéntalo con tus palabras <span className="normal-case tracking-normal text-muted">(opcional)</span>
              </label>
              <input
                id="oraculo-query"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ej. un regalo de menos de 20 €, o una novela para el tren"
                className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink placeholder-muted outline-none transition-colors focus:border-gold"
              />
            </div>

            <fieldset>
              <legend className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-warm">
              ¿Cómo te lo explico?
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Registro de la respuesta">
              {REGISTROS.map((option) => {
                const active = registro === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    title={option.hint}
                    onClick={() => setRegistro(option.value)}
                    className={`rounded-full border px-3.5 py-1.5 text-[11px] transition-colors ${
                      active
                        ? 'border-gold bg-gold/15 text-ink'
                        : 'border-line text-muted-warm hover:border-gold/60'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            </fieldset>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Prueba:</span>
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => setQuery(example.query)}
                className="rounded-full border border-line px-3 py-1.5 text-[11px] text-muted-warm transition-colors hover:border-gold/60 hover:text-ink"
              >
                {example.label}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-relaxed text-muted">
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
                  Pedir recomendación
                </>
              )}
            </button>
          </div>
        </form>

        {loading && (
          <div className="mt-8 grid gap-5 md:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-line bg-paper p-4">
                <div className="shimmer h-3 w-24 rounded bg-line" />
                <div className="mt-4 space-y-2">
                  <div className="shimmer h-5 w-3/4 rounded bg-line" />
                  <div className="shimmer h-3 w-1/2 rounded bg-line" />
                </div>
                <div className="mt-6 space-y-2">
                  <div className="shimmer h-3 w-full rounded bg-line" />
                  <div className="shimmer h-3 w-5/6 rounded bg-line" />
                </div>
              </div>
            ))}
          </div>
        )}

        {abstention && !loading && (
          <div ref={resultsRef} className="mt-10 scroll-mt-28 animate-fade-up">
            <div className="rounded-xl border border-gold/30 bg-paper p-5 sm:p-6">
              <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
                <Sparkles className="h-4 w-4 text-gold" />
                Preferimos decírtelo
              </h3>
              <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted-warm">
                {abstention.message}
              </p>

              {abstention.nearest.length > 0 && (
                <>
                  <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    Lo más cercano en la sala
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {abstention.nearest.map((item) => {
                      const book = getBook(item.id);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => book && onOpenBook(book)}
                            className="text-left text-[13px] text-ink underline decoration-gold/40 underline-offset-4 transition-colors hover:text-gold"
                          >
                            {item.title}
                            <span className="ml-2 text-[11px] no-underline text-muted">
                              {item.reason}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {meta && (
                <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{meta}</p>
              )}
            </div>
          </div>
        )}

        {suggestions && suggestions.length > 0 && !loading && (
          <div ref={resultsRef} className="mt-10 scroll-mt-28 animate-fade-up">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <h3 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
                <Sparkles className="h-4 w-4 text-gold" />
                {suggestions.length === 1 ? 'Un libro del fondo' : `${suggestions.length} libros del fondo`}
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {source === 'gemini'
                  ? `Selección del librero · ${registro}`
                  : source === 'catalogo'
                    ? 'Selección del fondo'
                    : 'Motor semántico de la casa'}
              </span>
            </div>

            {notice && (
              <p className="mt-3 text-[11px] text-muted">{notice}</p>
            )}

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {suggestions.map(({ book, rationale, glossary }, index) => (
                <article
                  key={book.id}
                  className="group flex flex-col rounded-xl border border-line bg-paper p-4 transition-colors hover:border-gold/60"
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
                      <h4 className="mt-1 font-display text-lg font-semibold leading-tight text-ink">
                        <button type="button" onClick={() => onOpenBook(book)} className="text-left hover:text-gold">
                          {book.title}
                        </button>
                      </h4>
                      <p className="mt-0.5 text-[11px] text-muted">{book.author}</p>
                      <p className="mt-2 font-mono text-xs tabular-nums text-ink">
                        {book.price.toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-muted-warm">
                    {rationale}
                  </p>

                  {glossary && glossary.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {glossary.map((entry) => (
                        <li key={entry} className="text-[11px] leading-snug text-muted">
                          <span className="text-gold/80">·</span> {entry}
                        </li>
                      ))}
                    </ul>
                  )}

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
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-line px-3 py-2 text-[11px] font-semibold text-ink transition-colors hover:border-gold/60"
                    >
                      Ficha
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[11px] text-muted">
                <BookOpen className="h-3.5 w-3.5" />
                Puedes recogerlo en la Rúa Mayor en 2 horas o recibirlo mañana en casa.
              </p>
              {meta && (
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{meta}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
