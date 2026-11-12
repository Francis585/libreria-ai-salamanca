import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, BookOpen, Search, ShoppingBag, SlidersHorizontal, Star, X } from 'lucide-react';
import { BOOKS, CATEGORIES, CATEGORY_ACCENTS, EPOCHS, type Book } from '../data/library';
import { searchBooks } from '../lib/semantic';
import { useStock } from '../lib/useStock';
import { BookCover } from './BookCover';
import { SectionLabel } from './SectionLabel';

interface CatalogProps {
  onOpenBook: (book: Book) => void;
  onAdd: (book: Book) => void;
}

type SortKey = 'relevancia' | 'titulo' | 'precio' | 'reciente' | 'valoracion';
type RangoPrecio = 'todos' | 'menos15' | '15a25' | 'mas25';
type Vista = 'actual' | 'clasicos' | 'antiguo' | 'todo';

/** Tres estanterías: lo que se vende hoy, los clásicos vivos y el fondo antiguo. */
const VISTAS: { key: Vista; label: string; desde: number; hasta: number }[] = [
  { key: 'actual', label: 'Actual', desde: 1950, hasta: 9999 },
  { key: 'clasicos', label: 'Clásicos', desde: 1800, hasta: 1949 },
  { key: 'antiguo', label: 'Fondo antiguo', desde: 0, hasta: 1799 },
  { key: 'todo', label: 'Todo', desde: 0, hasta: 9999 }
];
type Formato = 'todos' | 'tapa' | 'rustica' | 'bolsillo';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'relevancia', label: 'Selección de la casa' },
  { key: 'titulo', label: 'Título (A–Z)' },
  { key: 'precio', label: 'Precio (menor a mayor)' },
  { key: 'reciente', label: 'Año (más reciente)' },
  { key: 'valoracion', label: 'Mejor valorados' }
];

const PRECIOS: { key: RangoPrecio; label: string }[] = [
  { key: 'todos', label: 'Cualquiera' },
  { key: 'menos15', label: 'Hasta 15 €' },
  { key: '15a25', label: '15–25 €' },
  { key: 'mas25', label: 'Más de 25 €' }
];

const FORMATOS: { key: Formato; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'tapa', label: 'Tapa dura' },
  { key: 'rustica', label: 'Rústica' },
  { key: 'bolsillo', label: 'Bolsillo' }
];

const NOTAS = [
  { key: 0, label: 'Todas' },
  { key: 4.5, label: '4,5 o más' },
  { key: 4.8, label: '4,8 o más' }
];

export const Catalog: React.FC<CatalogProps> = ({ onOpenBook, onAdd }) => {
  const [query, setQuery] = useState('');
  const recientes = useMemo(() => [...BOOKS].sort((a, b) => b.year - a.year).slice(0, 5), []);
  const [category, setCategory] = useState<string>('Todos');
  const [epoch, setEpoch] = useState<string>('Todas');
  const [sort, setSort] = useState<SortKey>('reciente');
  const [precio, setPrecio] = useState<RangoPrecio>('todos');
  const [notaMinima, setNotaMinima] = useState<number>(0);
  const [formato, setFormato] = useState<Formato>('todos');
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(false);
  // El catálogo se enseña por tandas: 46 fichas de golpe hacían la página
  // interminable. Doce y un botón para seguir.
  const [visibles, setVisibles] = useState(12);
  const [vista, setVista] = useState<Vista>('actual');
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

  /** Filtros finos: estantería, precio, nota mínima, formato y disponibilidad. */
  const pasaFiltros = (book: Book) => {
    if (vista !== 'todo') {
      const rango = VISTAS.find((v) => v.key === vista)!;
      if (book.year < rango.desde || book.year > rango.hasta) return false;
    }
    if (precio === 'menos15' && book.price >= 15) return false;
    if (precio === '15a25' && (book.price < 15 || book.price > 25)) return false;
    if (precio === 'mas25' && book.price <= 25) return false;
    if (notaMinima > 0 && book.rating < notaMinima) return false;
    if (formato !== 'todos' && !book.format.toLowerCase().includes(formato === 'tapa' ? 'tapa dura' : formato === 'rustica' ? 'rústica' : 'bolsillo')) return false;
    if (soloDisponibles && stock[book.id] === 0) return false;
    return true;
  };

  const activos =
    (precio !== 'todos' ? 1 : 0) +
    (notaMinima > 0 ? 1 : 0) +
    (formato !== 'todos' ? 1 : 0) +
    (soloDisponibles ? 1 : 0);

  const limpiarFiltros = () => {
    setPrecio('todos');
    setNotaMinima(0);
    setFormato('todos');
    setSoloDisponibles(false);
  };

  const results = useMemo(() => {
    const matched = (
      query.trim()
        ? searchBooks(query, { category, epoch: epoch === 'Todas' ? undefined : epoch }).map((result) => result.book)
        : BOOKS.filter(
            (book) =>
              (category === 'Todos' || book.category === category) &&
              (epoch === 'Todas' || book.epoch === epoch)
          )
    ).filter(pasaFiltros);

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
      case 'valoracion':
        sorted.sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title, 'es'));
        break;
      default:
        break;
    }
    return sorted;
  }, [query, category, epoch, sort, precio, notaMinima, formato, soloDisponibles, stock, vista]);

  useEffect(() => {
    setVisibles(12);
  }, [query, category, epoch, precio, notaMinima, formato, soloDisponibles, vista]);

  const cuentaVista = (vista: Vista) => {
    const rango = VISTAS.find((v) => v.key === vista)!;
    return BOOKS.filter(
      (book) =>
        (vista === 'todo' || (book.year >= rango.desde && book.year <= rango.hasta)) &&
        (category === 'Todos' || book.category === category)
    ).length;
  };

  const countFor = (cat: string) =>
    cat === 'Todos' ? BOOKS.length : BOOKS.filter((book) => book.category === cat).length;

  const epochCount = (value: string) =>
    value === 'Todas' ? BOOKS.length : BOOKS.filter((book) => book.epoch === value).length;

  return (
    <section id="catalogo" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 lg:px-10 lg:py-24">
      <div className="flex flex-col gap-8 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <SectionLabel n="02">Catálogo</SectionLabel>
          <h2 className="mt-3 font-display text-[clamp(2.2rem,4.4vw,3.4rem)] font-semibold leading-[1.02] tracking-tight text-ink">
            Los libros que recomendamos
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-warm">
            {BOOKS.length} obras elegidas una a una: fondo salmantino, clásicos, novela, poesía e
            infantil. De cada una te contamos de qué va, quién la escribió y qué dicen los
            lectores. Si buscas otra cosa, abajo puedes <a href="#encargos" className="font-medium text-clay hover:underline">encargarla</a>.
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

      <div className="mt-8 rounded-2xl border border-line bg-mist/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-clay">
            Recién llegado · {new Date().getFullYear()}
          </p>
          <button
            type="button"
            onClick={() => {
              setSort('reciente');
              setEpoch('Todas');
              setCategory('Todos');
              setQuery('');
            }}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink"
          >
            Ver todo lo nuevo
          </button>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {recientes.map((libro) => (
            <li key={libro.id}>
              <button
                type="button"
                onClick={() => onOpenBook(libro)}
                className="w-full rounded-lg border border-line/70 bg-paper px-3 py-2.5 text-left transition-colors hover:border-clay/50"
              >
                <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {libro.year} · {libro.category}
                </span>
                <span className="mt-0.5 block truncate font-display text-[13px] font-semibold text-ink">
                  {libro.title}
                </span>
                <span className="block truncate text-[10px] text-muted">{libro.author}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Estanterías: la web no se satura porque solo se enseña una a la vez */}
      <div className="mt-8 flex flex-wrap items-center gap-2" role="group" aria-label="Qué parte del fondo ver">
        {VISTAS.map((opcion) => {
          const activo = vista === opcion.key;
          return (
            <button
              key={opcion.key}
              type="button"
              aria-pressed={activo}
              onClick={() => setVista(opcion.key)}
              className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
                activo ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-muted-warm hover:border-muted/40 hover:text-ink'
              }`}
            >
              {opcion.label}
              <span className={`font-mono text-[10px] tabular-nums ${activo ? 'text-paper/70' : 'text-muted'}`}>
                {cuentaVista(opcion.key)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                        CATEGORY_ACCENTS[cat as keyof typeof CATEGORY_ACCENTS] ?? '#3b3bf5',
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
          <button
            type="button"
            onClick={() => setPanelAbierto((abierto) => !abierto)}
            aria-expanded={panelAbierto}
            aria-controls="catalogo-filtros"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
              activos > 0
                ? 'border-clay/50 bg-clay/[0.07] text-clay'
                : 'border-line text-muted hover:border-muted/40 hover:text-ink'
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            Filtros
            {activos > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-clay px-1 text-[10px] font-semibold text-white">
                {activos}
              </span>
            )}
          </button>

          <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:flex">
            {results.length} {results.length === 1 ? 'obra' : 'obras'}
          </span>
          <div className="relative">
            <label htmlFor="catalogo-epoca" className="sr-only">
              Filtrar por época
            </label>
            <select
              id="catalogo-epoca"
              value={epoch}
              onChange={(event) => setEpoch(event.target.value)}
              className={`appearance-none rounded-xl border px-3 py-2 text-xs font-medium outline-none transition-colors ${
                epoch === 'Todas'
                  ? 'border-line bg-paper text-muted-warm hover:border-muted/40'
                  : 'border-bark bg-bark text-paper'
              }`}
            >
              {['Todas', ...EPOCHS].map((option) => (
                <option key={option} value={option}>
                  {option === 'Todas' ? `Todas las épocas (${BOOKS.length})` : `${option} (${epochCount(option)})`}
                </option>
              ))}
            </select>
          </div>

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

      {panelAbierto && (
        <div
          id="catalogo-filtros"
          className="mt-4 grid gap-5 rounded-xl border border-line bg-mist/30 p-4 animate-fade-in sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Precio</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRECIOS.map((opcion) => {
                const activo = precio === opcion.key;
                return (
                  <button
                    key={opcion.key}
                    type="button"
                    onClick={() => setPrecio(opcion.key)}
                    aria-pressed={activo}
                    className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                      activo ? 'border-bark bg-bark text-paper' : 'border-line bg-paper text-muted-warm hover:border-muted/40'
                    }`}
                  >
                    {opcion.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Valoración</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {NOTAS.map((opcion) => {
                const activo = notaMinima === opcion.key;
                return (
                  <button
                    key={opcion.key}
                    type="button"
                    onClick={() => setNotaMinima(opcion.key)}
                    aria-pressed={activo}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                      activo ? 'border-bark bg-bark text-paper' : 'border-line bg-paper text-muted-warm hover:border-muted/40'
                    }`}
                  >
                    {opcion.key > 0 && <Star className={`h-2.5 w-2.5 ${activo ? 'fill-paper text-paper' : 'fill-clay text-clay'}`} />}
                    {opcion.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Formato</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FORMATOS.map((opcion) => {
                const activo = formato === opcion.key;
                return (
                  <button
                    key={opcion.key}
                    type="button"
                    onClick={() => setFormato(opcion.key)}
                    aria-pressed={activo}
                    className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                      activo ? 'border-bark bg-bark text-paper' : 'border-line bg-paper text-muted-warm hover:border-muted/40'
                    }`}
                  >
                    {opcion.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Disponibilidad</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSoloDisponibles((valor) => !valor)}
                aria-pressed={soloDisponibles}
                className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  soloDisponibles ? 'border-bark bg-bark text-paper' : 'border-line bg-paper text-muted-warm hover:border-muted/40'
                }`}
              >
                Solo con ejemplares
              </button>
              {activos > 0 && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-clay hover:underline"
                >
                  <X className="h-3 w-3" /> Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-line bg-mist/40 px-6 py-16 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted/60" />
          <h3 className="mt-4 font-display text-2xl font-semibold text-ink">No hay nada con ese nombre</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-warm">
            Prueba con otra palabra o mira el catálogo completo. También puedes pedirle al
            librero que busque por lo que quieres sentir, no por el título.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('Todos');
              setEpoch('Todas');
              limpiarFiltros();
            }}
            className="mt-6 rounded-lg bg-clay px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-clay-deep"
          >
            Limpiar la búsqueda
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {results.slice(0, visibles).map((book, index) => {
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
                  <span className="absolute left-3 top-3 rounded-full bg-paper/92 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-bark shadow-sm backdrop-blur">
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
                  <span className="absolute right-3 top-3 rounded-full bg-paper/92 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-clay shadow-sm backdrop-blur">
                    {agotado ? 'Agotado' : `Quedan ${disponibles}`}
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-1 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.14em]"
                    style={{ color: CATEGORY_ACCENTS[book.category] ?? '#3b3bf5' }}
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
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
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
                      className="inline-flex items-center gap-1.5 rounded-lg bg-clay px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:bg-muted/40"
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

      {results.length > visibles && (
        <div className="mt-12 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibles((n) => n + 12)}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-5 py-2.5 text-xs font-semibold text-ink transition-colors hover:border-ink/25"
          >
            Ver más obras
            <span className="font-mono text-[10px] text-muted">
              quedan {results.length - visibles}
            </span>
          </button>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {visibles} de {results.length}
          </p>
        </div>
      )}
    </section>
  );
};
