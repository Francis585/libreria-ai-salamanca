import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Database,
  MapPin,
  Quote,
  RotateCcw,
  Search,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import { BOOKS, EPOCHS, THEMES, getBook, type Book } from '../data/library';
import { SUGGESTED_QUERIES, searchBooks } from '../lib/semantic';
import { BookCover } from './BookCover';

interface LabProps {
  onOpenBook: (book: Book) => void;
  onAdd: (book: Book) => void;
}

type InspectorTab = 'entidades' | 'texto' | 'afines';

export const Lab: React.FC<LabProps> = ({ onOpenBook }) => {
  const [query, setQuery] = useState('');
  const [epoch, setEpoch] = useState('Todas las épocas');
  const [thematic, setThematic] = useState('Todas las materias');
  const [selectedId, setSelectedId] = useState<string>(BOOKS[0].id);
  const [tab, setTab] = useState<InspectorTab>('entidades');

  const results = useMemo(
    () => searchBooks(query, { epoch, thematic }),
    [query, epoch, thematic]
  );

  const selected: Book =
    results.find((result) => result.book.id === selectedId)?.book ??
    (results[0]?.book ?? getBook(selectedId) ?? BOOKS[0]);

  const activeResult = results.find((result) => result.book.id === selected.id);
  const related = selected.relatedIds.map(getBook).filter((entry): entry is Book => Boolean(entry));
  const filtersActive = query.trim() || epoch !== 'Todas las épocas' || thematic !== 'Todas las materias';

  const reset = () => {
    setQuery('');
    setEpoch('Todas las épocas');
    setThematic('Todas las materias');
    setSelectedId(BOOKS[0].id);
  };

  return (
    <section id="laboratorio" className="scroll-mt-24 border-y border-line bg-mist/45">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-24">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-clay">
              <Database className="h-3 w-3" />
              Buscador por ideas
            </span>
            <h2 className="mt-3 font-display text-[clamp(2.2rem,4.4vw,3.4rem)] font-semibold leading-[1.02] tracking-tight text-ink">
              Busca como piensas, <span className="italic text-clay">no como se titula</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-warm">
              El buscador no exige el título exacto: relaciona conceptos, personajes, lugares
              y oficios. Escribe una idea y te devuelve las obras ordenadas por afinidad,
              con la razón del emparejamiento a la vista.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start rounded-xl border border-line bg-paper px-4 py-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Índice activo</p>
              <p className="font-mono text-xs font-semibold tabular-nums text-ink">{BOOKS.length} obras · 5 materias</p>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="mt-9 rounded-2xl border border-line bg-paper p-5 shadow-[0_18px_40px_-30px_rgba(45,40,34,0.5)] sm:p-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-clay" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. «debate sobre los derechos de los pueblos indígenas» o «cómo se orientaban los pilotos con las estrellas»"
              aria-label="Consulta semántica del fondo"
              className="w-full rounded-xl border border-line bg-mist/50 py-4 pl-12 pr-12 text-sm text-ink placeholder-muted/80 outline-none transition-colors focus:border-clay/50 focus:bg-paper sm:text-[15px]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Borrar consulta"
                className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-muted hover:bg-line/60 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              <Sparkles className="h-3 w-3 text-gold-deep" />
              Sugerencias
            </span>
            {SUGGESTED_QUERIES.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                onClick={() => setQuery(suggestion.query)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] text-muted-warm transition-colors hover:border-clay/40 hover:bg-clay/[0.05] hover:text-clay"
              >
                {suggestion.label}
                <ArrowRight className="h-3 w-3 opacity-50 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-line-soft pt-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <label className="flex-1">
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Época</span>
                <select
                  value={epoch}
                  onChange={(event) => setEpoch(event.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-clay/50"
                >
                  {['Todas las épocas', ...EPOCHS].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1">
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Materia</span>
                <select
                  value={thematic}
                  onChange={(event) => setThematic(event.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-clay/50"
                >
                  {['Todas las materias', ...THEMES].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-3 sm:pl-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                <span className="font-semibold text-ink">{results.length}</span> resultados
              </span>
              {filtersActive && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-2 text-[11px] font-medium text-muted-warm transition-colors hover:border-ink/25 hover:text-ink"
                >
                  <RotateCcw className="h-3 w-3" />
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Resultados */}
          <div className="space-y-3 lg:col-span-7">
            {results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-paper/60 px-6 py-14 text-center">
                <p className="font-display text-2xl font-semibold text-ink">Sin correspondencias</p>
                <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted-warm">
                  Prueba con otras palabras o quita los filtros: el índice entiende ideas,
                  no solo títulos.
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-5 rounded-lg bg-clay px-4 py-2 text-xs font-semibold text-white hover:bg-clay-deep"
                >
                  Restablecer
                </button>
              </div>
            ) : (
              results.map((result) => {
                const active = result.book.id === selected.id;
                return (
                  <article
                    key={result.book.id}
                    className={`group rounded-xl border bg-paper p-4 transition-all ${
                      active ? 'border-clay/50 shadow-[0_10px_30px_-24px_rgba(184,93,56,0.8)]' : 'border-line hover:border-muted/35'
                    }`}
                  >
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(result.book.id);
                          setTab('entidades');
                        }}
                        className="w-[62px] shrink-0 overflow-hidden rounded-[2px]"
                        aria-label={`Inspeccionar ${result.book.title}`}
                      >
                        <BookCover book={result.book} compact className="aspect-[3/4.2] w-full" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-clay">
                              {result.book.thematic} · {result.book.year}
                            </p>
                            <h3 className="mt-0.5 font-display text-lg font-semibold leading-snug text-ink">
                              {result.book.title}
                            </h3>
                            <p className="text-[11.5px] text-muted">{result.book.author}</p>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="font-display text-lg font-semibold tabular-nums text-ink">
                              {result.score}
                              <span className="text-[10px] text-muted">%</span>
                            </span>
                            <div className="mt-1 h-1 w-14 overflow-hidden rounded-full bg-line">
                              <div
                                className="h-full rounded-full bg-clay"
                                style={{ width: `${result.score}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted-warm">
                          {result.book.synopsis}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {result.matchedConcepts.map((concept) => (
                            <span
                              key={concept}
                              className="rounded border border-line bg-mist/60 px-1.5 py-0.5 font-mono text-[9.5px] text-muted-warm"
                            >
                              {concept}
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => onOpenBook(result.book)}
                            className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-semibold text-clay hover:underline"
                          >
                            Ficha completa
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Inspector */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_18px_44px_-34px_rgba(45,40,34,0.6)]">
                <div className="relative bg-bark px-5 py-5 text-paper">
                  <div
                    aria-hidden="true"
                    className="absolute right-0 top-0 h-32 w-32 rounded-full bg-gold/10 blur-2xl"
                  />
                  <div className="relative flex items-center justify-between gap-2">
                    <span className="rounded border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-[9.5px] text-gold">
                      {selected.accessionCode ?? selected.id.toUpperCase()}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8b8b95]">
                      Inspector
                    </span>
                  </div>
                  <h3 className="relative mt-3 font-display text-xl font-semibold leading-tight text-paper">
                    {selected.title}
                  </h3>
                  <p className="relative mt-1 text-[11px] text-gold/90">
                    {selected.author} ({selected.year})
                  </p>
                  {activeResult && (
                    <p className="relative mt-3 border-t border-[#2a2a31]/60 pt-2 text-[10.5px] leading-relaxed text-[#c9c9d0]">
                      {activeResult.reason}
                    </p>
                  )}
                </div>

                <div className="flex border-b border-line bg-mist/40" role="tablist">
                  {[
                    { key: 'entidades' as const, label: 'Entidades', show: Boolean(selected.entities) },
                    { key: 'texto' as const, label: 'Texto', show: Boolean(selected.excerpt || selected.metrics) },
                    { key: 'afines' as const, label: 'Afines', show: related.length > 0 }
                  ]
                    .filter((entry) => entry.show)
                    .map((entry) => (
                      <button
                        key={entry.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === entry.key}
                        onClick={() => setTab(entry.key)}
                        className={`relative flex-1 px-3 py-2.5 text-[11px] font-semibold transition-colors ${
                          tab === entry.key ? 'text-ink' : 'text-muted hover:text-ink'
                        }`}
                      >
                        {entry.label}
                        {tab === entry.key && <span className="absolute inset-x-6 bottom-0 h-0.5 bg-clay" />}
                      </button>
                    ))}
                </div>

                <div className="max-h-[420px] overflow-y-auto px-5 py-4 thin-scroll">
                  {tab === 'entidades' && selected.entities && (
                    <div className="space-y-4 animate-fade-in">
                      {[
                        { key: 'characters' as const, title: 'Personajes', icon: Users },
                        { key: 'places' as const, title: 'Lugares', icon: MapPin },
                        { key: 'dates' as const, title: 'Fechas', icon: Calendar }
                      ].map(({ key, title, icon: Icon }) => {
                        const rows = selected.entities![key];
                        if (!rows.length) return null;
                        return (
                          <div key={key}>
                            <div className="flex items-center gap-1.5 border-b border-line-soft pb-1.5">
                              <Icon className="h-3 w-3 text-clay" />
                              <h4 className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink">{title}</h4>
                            </div>
                            <ul className="mt-1 divide-y divide-line-soft">
                              {rows.map((row) => {
                                const heading = 'name' in row ? row.name : row.date;
                                const body =
                                  'role' in row ? row.role : 'context' in row ? row.context : row.significance;
                                return (
                                  <li key={`${key}-${heading}`} className="py-2">
                                    <p className="text-[11.5px] font-semibold text-ink">{heading}</p>
                                    <p className="text-[10.5px] leading-relaxed text-muted-warm">{body}</p>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {tab === 'texto' && (
                    <div className="space-y-4 animate-fade-in">
                      {selected.excerpt && (
                        <div>
                          <div className="flex items-center gap-1.5 border-b border-line-soft pb-1.5">
                            <Quote className="h-3 w-3 text-clay" />
                            <h4 className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink">
                              Extracto cotejado
                            </h4>
                          </div>
                          <p className="mt-2 font-serif text-[12.5px] italic leading-relaxed text-ink/85">
                            {selected.excerpt.original}
                          </p>
                          <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
                            {selected.excerpt.linguisticNotes}
                          </p>
                        </div>
                      )}

                      {selected.metrics && (
                        <div>
                          <div className="flex items-center gap-1.5 border-b border-line-soft pb-1.5">
                            <BarChart3 className="h-3 w-3 text-clay" />
                            <h4 className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink">Métricas</h4>
                          </div>
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                              Riqueza léxica
                            </span>
                            <span className="font-display text-lg font-semibold tabular-nums text-ink">
                              {selected.metrics.lexicalRichness}%
                            </span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
                            <div
                              className="h-full rounded-full bg-clay"
                              style={{ width: `${selected.metrics.lexicalRichness}%` }}
                            />
                          </div>
                          <dl className="mt-3 space-y-2 text-[10.5px]">
                            <div>
                              <dt className="text-muted">Densidad</dt>
                              <dd className="text-ink">{selected.metrics.densityScore}</dd>
                            </div>
                            <div>
                              <dt className="text-muted">Tono</dt>
                              <dd className="text-ink">{selected.metrics.tone}</dd>
                            </div>
                            <div>
                              <dt className="text-muted">Digitalización</dt>
                              <dd className="text-ink">{selected.metrics.digitizationLevel}</dd>
                            </div>
                          </dl>
                        </div>
                      )}
                    </div>
                  )}

                  {tab === 'afines' && (
                    <div className="space-y-2 animate-fade-in">
                      {related.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(entry.id);
                            setTab('entidades');
                          }}
                          className="w-full rounded-lg border border-line p-2.5 text-left transition-colors hover:border-clay/40 hover:bg-mist/50"
                        >
                          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-clay">
                            {entry.year} · {entry.thematic}
                          </p>
                          <p className="mt-0.5 font-display text-[13.5px] font-semibold leading-snug text-ink">
                            {entry.title}
                          </p>
                          <p className="text-[10px] leading-relaxed text-muted-warm">
                            {selected.reasons[entry.id] ?? 'Afinidad temática en el fondo salmantino.'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-line bg-mist/40 px-5 py-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                    {selected.price.toFixed(2)} €
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenBook(selected)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-clay px-3 py-1.5 text-[10.5px] font-semibold text-white hover:bg-clay-deep"
                  >
                    Abrir ficha
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <p className="mt-3 px-1 text-[10px] leading-relaxed text-muted">
                Índice construido sobre {BOOKS.length} fichas: sinopsis, entidades, extractos y
                materias. Toda la búsqueda ocurre en tu navegador.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};
