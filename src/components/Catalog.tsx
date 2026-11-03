import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, BookOpen, Search, ShoppingBag, SlidersHorizontal, Star, X } from 'lucide-react';
import { BOOKS, CATEGORIES, CATEGORY_ACCENTS, type Book } from '../data/library';
import { searchBooks } from '../lib/semantic';
import { useStock } from '../lib/useStock';
import { BookCover } from './BookCover';

interface CatalogProps {
  onOpenBook: (book: Book) => void;
  onAdd: (book: Book) => void;
}

type SortKey = 'relevancia' | 'titulo' | 'precio' | 'reciente';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'relevancia', label: 'Selección de la casa' },
  { key: 'titulo', label: 'Título (A–Z)' },
  { key: 'precio', label: 'Precio (menor a mayor)' },
  { key: 'reciente', label: 'Año (más reciente)' }
];

export const Catalog: React.FC<CatalogProps> = ({ onOpenBook, onAdd }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('Todos');
  const [sort, setSort] = useState<SortKey>('relevancia');
  const inputRef = useRef<HTMLInputElement>(null);
  const stock = useStock();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT';
      if (event.key === '/' && !typing) {
        event.preventDefault();
        document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => inputRef.current?.focus(), 350);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const results = useMemo(() => {
    const matched = query.trim()
      ? searchBooks(query, { category }).map((result) => result.book)
      : BOOKS.filter((book) => category === 'Todos' || book.category === category);

    const sorted = [...matched];
    switch (sort) {
      case 'titulo':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'es'));
        break;
      case 'precio':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'reciente':
        sorted.sort((a, b) => b.year - a.year);
        break;
      default:
        break;
    }
    return sorted;
  }, [query, category, sort]);

  const countFor = (cat: string) =>
    cat === 'Todos' ? BOOKS.length : BOOKS.filter((book) => book.category === cat).length;

  return (
    <section id="catalogo" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 lg:px-10 lg:py-24">
      <div className="flex flex-col gap-8 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-clay">Nuestros anaqueles</span>
          <h2 className="mt-3 font-display text-[clamp(2.2rem,4.4vw,3.4rem)] font-semibold leading-[1.02] tracking-tight text-ink">
            El catálogo de la casa
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-warm">
            {BOOKS.length} títulos: el fondo histórico salmantino, clásicos del XIX, misterio,
            aventuras, poesía, ensayo, novedades de 2025–2026 e infantil. Las fichas del fondo
            antiguo llevan transcripción y entidades; las novedades, ficha comercial.
          </p>
        </div>

        <div className="w-full md:w-[340px]">
          <label htmlFor="catalogo-busqueda" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Buscar por título, autor o tema
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="catalogo-busqueda"
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. Unamuno, navegación, derechos…"
              className="w-full rounded-xl border border-line bg-mist/70 py-3 pl-10 pr-10 text-sm text-ink placeholder-muted/80 outline-none transition-colors focus:border-clay/60 focus:bg-paper"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Borrar búsqueda"
                className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted hover:bg-line/60 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0" role="group" aria-label="Filtrar por categoría">
          {['Todos', ...CATEGORIES].map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                aria-pressed={active}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'border-bark bg-bark text-paper'
                    : 'border-line bg-transparent text-muted-warm hover:border-muted/40 hover:text-ink'
                }`}
              >
                {cat !== 'Todos' && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        CATEGORY_ACCENTS[cat as keyof typeof CATEGORY_ACCENTS] ?? '#8c6a3f',
                      opacity: active ? 1 : 0.55
                    }}
                  />
                )}
                {cat}
                <span className={`font-mono text-[10px] tabular-nums ${active ? 'text-gold' : 'text-muted/80'}`}>
                  {countFor(cat)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:flex">
            <SlidersHorizontal className="h-3 w-3" />
            {results.length} {results.length === 1 ? 'obra' : 'obras'}
          </span>
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Ordenar catálogo"
              className="appearance-none rounded-xl border border-line bg-paper py-2 pl-9 pr-8 text-xs font-medium text-muted-warm outline-none transition-colors hover:border-muted/40 focus:border-clay/60"
            >
              {SORTS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-line bg-mist/40 px-6 py-16 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted/60" />
          <h3 className="mt-4 font-display text-2xl font-semibold text-ink">No hay nada con ese nombre</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-warm">
            Prueba con otra palabra o mira el catálogo completo. También puedes pedirle al
            Oráculo que busque por lo que quieres sentir, no por el título.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('Todos');
            }}
            className="mt-6 rounded-lg bg-bark px-5 py-2.5 text-xs font-semibold text-paper transition-colors hover:bg-ink"
          >
            Limpiar la búsqueda
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((book, index) => {
            const disponibles = stock[book.id];
            const agotado = disponibles === 0;
            return (
            <article
              key={book.id}
              className="group flex flex-col animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => onOpenBook(book)}
                  className="block w-full overflow-hidden rounded-[3px] shadow-[0_12px_28px_-16px_rgba(45,40,34,0.55)] ring-1 ring-line transition-transform duration-300 group-hover:-translate-y-1"
                  aria-label={`Ver la ficha de ${book.title}`}
                >
                  <BookCover book={book} className="aspect-[3/4.15] w-full" />
                </button>
                {book.badge && (
                  <span className="absolute left-3 top-3 rounded-full bg-paper/92 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-bark shadow-sm backdrop-blur">
                    {book.badge}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onAdd(book)}
                  disabled={agotado}
                  aria-label={agotado ? `${book.title} está agotado` : `Añadir ${book.title} a la cesta`}
                  className="absolute bottom-3 right-3 grid h-9 w-9 translate-y-1 place-items-center rounded-full bg-paper/95 text-ink opacity-0 shadow-md backdrop-blur transition-all duration-300 hover:bg-gold group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:bg-line"
                >
                  <ShoppingBag className="h-4 w-4" />
                </button>
                {disponibles !== undefined && disponibles <= 3 && (
                  <span className="absolute right-3 top-3 rounded-full bg-paper/92 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-clay shadow-sm backdrop-blur">
                    {agotado ? 'Agotado' : `Quedan ${disponibles}`}
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-1 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.14em]"
                    style={{ color: CATEGORY_ACCENTS[book.category] ?? '#a8442a' }}
                  >
                    {book.category}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-muted">
                    <Star className="h-3 w-3 fill-gold text-gold" />
                    {book.rating.toFixed(1)}
                  </span>
                </div>

                <h3 className="mt-1.5 font-display text-[22px] font-semibold leading-[1.15] tracking-tight text-ink">
                  <button type="button" onClick={() => onOpenBook(book)} className="text-left hover:text-clay">
                    {book.title}
                  </button>
                </h3>
                <p className="mt-0.5 text-xs text-muted-warm">
                  {book.author} · {book.year}
                </p>

                <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
                  {book.synopsis}
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-3.5">
                  <div>
                    <span className="block font-display text-xl font-semibold tabular-nums text-ink">
                      {book.price.toFixed(2)} €
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                      {book.format}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenBook(book)}
                      className="rounded-lg border border-line px-3 py-2 text-[11px] font-semibold text-ink transition-colors hover:border-ink/30"
                    >
                      Ficha
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdd(book)}
                      disabled={agotado}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-bark px-3 py-2 text-[11px] font-semibold text-paper transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:bg-muted/40"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      {agotado ? 'Agotado' : 'Añadir'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
