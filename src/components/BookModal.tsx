import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Check,
  Copy,
  Download,
  MapPin,
  Quote,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
  X
} from 'lucide-react';
import type { Book } from '../data/library';
import { getBook } from '../data/library';
import { useStock } from '../lib/useStock';
import { BookCover } from './BookCover';
import { Modal } from './Modal';
import { Reviews, useResenas } from './Reviews';

interface BookModalProps {
  book: Book | null;
  onClose: () => void;
  onAdd: (book: Book) => void;
  onOpenBook: (book: Book) => void;
}

type Tab = 'sinopsis' | 'entidades' | 'texto' | 'opiniones' | 'afines';

export const BookModal: React.FC<BookModalProps> = ({ book, onClose, onAdd, onOpenBook }) => {
  const [tab, setTab] = useState<Tab>('sinopsis');
  const [copied, setCopied] = useState(false);
  const stock = useStock();
  const disponibles = book ? stock[book.id] : undefined;
  const agotado = disponibles === 0;
  const opiniones = useResenas(book?.id);
  const nota = opiniones.media ?? book?.rating ?? 0;

  useEffect(() => {
    setTab('sinopsis');
    setCopied(false);
  }, [book?.id]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const related = book ? book.relatedIds.map(getBook).filter((entry): entry is Book => Boolean(entry)) : [];

  const tabs: { key: Tab; label: string; count?: number; show: boolean }[] = [
    { key: 'sinopsis', label: 'Sinopsis', show: true },
    { key: 'entidades', label: 'Entidades', count: book?.entities ? book.entities.characters.length + book.entities.places.length + book.entities.dates.length : undefined, show: Boolean(book?.entities) },
    { key: 'texto', label: 'Extracto y métricas', show: Boolean(book?.excerpt || book?.metrics) },
    { key: 'opiniones', label: 'Opiniones', count: opiniones.total || undefined, show: true },
    { key: 'afines', label: 'Afines', count: related.length || undefined, show: related.length > 0 }
  ];

  const copyCitation = async () => {
    if (!book) return;
    const citation = `${book.author} (${book.year}). ${book.title}. ${book.collection ?? 'Librería AI Salamanca'}. Ref. ${book.accessionCode ?? book.id}.`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const downloadJson = () => {
    if (!book) return;
    const blob = new Blob([JSON.stringify(book, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${book.id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={Boolean(book)} onClose={onClose} labelledBy="ficha-titulo" panelClassName="max-w-4xl">
      {book && (
        <div className="relative max-h-[90vh] overflow-y-auto rounded-2xl bg-paper shadow-2xl thin-scroll">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ficha"
            className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-paper/90 text-muted shadow-sm backdrop-blur transition-colors hover:bg-line hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="grid gap-0 md:grid-cols-[300px_1fr]">
            {/* Columna izquierda */}
            <div className="border-b border-line bg-mist/50 p-6 md:border-b-0 md:border-r">
              <BookCover book={book} className="aspect-[3/4.1] w-full rounded-[3px] shadow-[0_16px_36px_-20px_rgba(45,40,34,0.6)]" />

              <div className="mt-5 space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Precio</span>
                    <p className="font-display text-3xl font-semibold tabular-nums text-ink">
                      {book.price.toFixed(2)} <span className="text-lg">€</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('opiniones')}
                    className="flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 font-mono text-[11px] text-muted-warm ring-1 ring-line transition-colors hover:ring-clay/50"
                    aria-label={`Ver las ${opiniones.total} opiniones y valorar`}
                  >
                    <Star className="h-3 w-3 fill-clay text-clay" />
                    {nota.toFixed(1)}
                    {opiniones.total > 0 && <span className="text-muted">({opiniones.total})</span>}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onAdd(book)}
                  disabled={agotado}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-clay px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:bg-muted/50"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {agotado ? 'Sin ejemplares ahora' : 'Añadir a la cesta'}
                </button>

                <p className="text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                  {disponibles !== undefined && !agotado
                    ? `${disponibles} en el almacén · recogida en 2 h`
                    : agotado
                      ? 'Podemos avisarte cuando vuelva'
                      : 'Recogida en tienda en 2 h · Envío 24/48 h'}
                </p>
              </div>

              <dl className="mt-6 space-y-2.5 border-t border-line pt-4 text-[11px]">
                {[
                  ['Formato', book.format],
                  ['Páginas', `${book.pages} pág.`],
                  ['Año', String(book.year)],
                  ['Materia', book.thematic],
                  ['Época', book.epoch]
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-right font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>

              {(book.accessionCode || book.collection) && (
                <div className="mt-4 rounded-lg border border-line bg-paper/70 p-3">
                  {book.collection && (
                    <p className="text-[10px] leading-relaxed text-muted-warm">{book.collection}</p>
                  )}
                  {book.accessionCode && (
                    <p className="mt-1 font-mono text-[10px] tracking-wide text-muted">Ref. {book.accessionCode}</p>
                  )}
                </div>
              )}
            </div>

            {/* Columna derecha */}
            <div className="flex min-w-0 flex-col">
              <div className="px-6 pb-5 pt-8 pr-16 sm:px-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-clay/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-clay">
                    {book.category}
                  </span>
                  {book.badge && (
                    <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-warm">
                      {book.badge}
                    </span>
                  )}
                </div>
                <h2
                  id="ficha-titulo"
                  className="mt-3 font-display text-[clamp(1.8rem,3.6vw,2.5rem)] font-semibold leading-[1.05] tracking-tight text-ink"
                >
                  {book.title}
                </h2>
                <p className="mt-1.5 text-sm text-muted-warm">
                  {book.author} <span className="text-muted">·</span> {book.year}
                </p>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b border-line px-6 no-scrollbar sm:px-8" role="tablist">
                {tabs.filter((entry) => entry.show).map((entry) => {
                  const active = tab === entry.key;
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(entry.key)}
                      className={`relative whitespace-nowrap px-3 py-3 text-xs font-semibold transition-colors ${
                        active ? 'text-ink' : 'text-muted hover:text-ink'
                      }`}
                    >
                      {entry.label}
                      {entry.count !== undefined && (
                        <span className="ml-1.5 font-mono text-[10px] text-muted">{entry.count}</span>
                      )}
                      {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-clay" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 px-6 py-6 sm:px-8">
                {tab === 'sinopsis' && (
                  <div className="space-y-5 animate-fade-in">
                    <p className="font-serif text-[15px] leading-[1.75] text-muted-warm first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-5xl first-letter:leading-[0.82] first-letter:text-bark">
                      {book.synopsis}
                    </p>

                    {book.authorBio && (
                      <div className="rounded-xl border border-line bg-mist/40 p-4">
                        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-clay">Sobre el autor</p>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-warm">{book.authorBio}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {book.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-line px-2.5 py-1 text-[10.5px] text-muted-warm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {tab === 'entidades' && book.entities && (
                  <div className="space-y-6 animate-fade-in">
                    <p className="flex items-start gap-2 rounded-lg border border-gold/25 bg-gold/[0.06] p-3 text-[11.5px] leading-relaxed text-muted-warm">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-deep" />
                      Entidades extraídas del ejemplar digitalizado y revisadas por el equipo de la librería.
                    </p>

                    {[
                      { key: 'characters' as const, title: 'Personajes y figuras', icon: Users },
                      { key: 'places' as const, title: 'Lugares', icon: MapPin },
                      { key: 'dates' as const, title: 'Cronología', icon: Calendar }
                    ].map(({ key, title, icon: Icon }) => {
                      const rows = book.entities![key];
                      if (!rows.length) return null;
                      return (
                        <div key={key}>
                          <div className="flex items-center gap-2 border-b border-line pb-2">
                            <Icon className="h-3.5 w-3.5 text-clay" />
                            <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink">{title}</h4>
                            <span className="ml-auto font-mono text-[10px] text-muted">{rows.length}</span>
                          </div>
                          <ul className="mt-2 divide-y divide-line-soft">
                            {rows.map((row) => {
                              const heading = 'name' in row ? row.name : row.date;
                              const body = 'role' in row ? row.role : 'context' in row ? row.context : row.significance;
                              return (
                                <li key={`${key}-${heading}`} className="py-2.5">
                                  <p className="text-[12.5px] font-semibold text-ink">{heading}</p>
                                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-warm">{body}</p>
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
                  <div className="space-y-5 animate-fade-in">
                    {book.excerpt && (
                      <>
                        <div className="flex items-center gap-2 border-b border-line pb-2">
                          <Quote className="h-3.5 w-3.5 text-clay" />
                          <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
                            {book.excerpt.chapter}
                          </h4>
                        </div>
                        <blockquote className="border-l-2 border-clay pl-4 font-serif text-[15px] italic leading-[1.75] text-ink/85">
                          {book.excerpt.original}
                        </blockquote>
                        <p className="rounded-lg bg-mist/60 p-3 text-[11.5px] leading-relaxed text-muted-warm">
                          <span className="font-semibold text-ink">Nota lingüística: </span>
                          {book.excerpt.linguisticNotes}
                        </p>
                      </>
                    )}

                    {book.metrics && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-line pb-2">
                          <BarChart3 className="h-3.5 w-3.5 text-clay" />
                          <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
                            Métricas del ejemplar
                          </h4>
                        </div>

                        <div className="rounded-xl border border-line p-4">
                          <div className="flex items-baseline justify-between">
                            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
                              Riqueza léxica
                            </span>
                            <span className="font-display text-xl font-semibold tabular-nums text-ink">
                              {book.metrics.lexicalRichness}%
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-gold to-clay"
                              style={{ width: `${book.metrics.lexicalRichness}%` }}
                            />
                          </div>
                          <p className="mt-2 text-[10.5px] text-muted">Variabilidad de vocabulario frente a la norma de su época.</p>
                        </div>

                        <dl className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-line p-3">
                            <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">Densidad conceptual</dt>
                            <dd className="mt-1 text-[12px] font-medium leading-snug text-ink">{book.metrics.densityScore}</dd>
                          </div>
                          <div className="rounded-xl border border-line p-3">
                            <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">Tono</dt>
                            <dd className="mt-1 text-[12px] font-medium leading-snug text-ink">{book.metrics.tone}</dd>
                          </div>
                          <div className="rounded-xl border border-line p-3 sm:col-span-2">
                            <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">Digitalización</dt>
                            <dd className="mt-1 text-[12px] font-medium leading-snug text-ink">{book.metrics.digitizationLevel}</dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'opiniones' && (
                  <Reviews libroId={book.id} valoracionEditorial={book.rating} datos={opiniones} />
                )}

                {tab === 'afines' && (
                  <div className="space-y-3 animate-fade-in">
                    <p className="text-[11.5px] leading-relaxed text-muted">
                      Obras que comparten época, materia o conversación con esta.
                    </p>
                    {related.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => onOpenBook(entry)}
                        className="group flex w-full gap-3 rounded-xl border border-line p-3 text-left transition-colors hover:border-clay/40 hover:bg-mist/40"
                      >
                        <BookCover book={entry} compact className="h-[92px] w-[66px] shrink-0 rounded-[2px]" />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-clay">
                            {entry.thematic} · {entry.year}
                          </p>
                          <p className="mt-1 font-display text-base font-semibold leading-snug text-ink group-hover:text-clay">
                            {entry.title}
                          </p>
                          <p className="text-[11px] text-muted">{entry.author}</p>
                          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-warm">
                            {book?.reasons[entry.id] ?? 'Correspondencia temática con el fondo salmantino.'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4 sm:px-8">
                <button
                  type="button"
                  onClick={copyCitation}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-muted-warm transition-colors hover:border-ink/25 hover:text-ink"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Cita copiada' : 'Copiar cita'}
                </button>
                <button
                  type="button"
                  onClick={downloadJson}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-muted-warm transition-colors hover:border-ink/25 hover:text-ink"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar ficha
                </button>
                <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  Librería AI · Salamanca
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
