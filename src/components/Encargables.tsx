import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Loader2, Search, Truck, X } from 'lucide-react';

/**
 * Fondo encargable.
 *
 * Arriba está el fondo de la sala (46 obras con ficha propia). Aquí va todo lo
 * demás que se publica en castellano —originales españoles y traducciones— y
 * que se puede encargar y llega a casa. Sale de la base, que el cron rellena
 * con las editoriales españolas, así que la lista crece sin tocar código.
 */

interface Encargable {
  id: string;
  titulo: string;
  autor: string | null;
  anio: number | null;
  editorial: string | null;
  paginas: number | null;
  portada_url: string | null;
}

interface Payload {
  libros: Encargable[];
  total: number;
  pagina: number;
  paginas: number;
  editoriales: number;
}

const CORREO = 'hola@libreriaaisalamanca.es';

const MINIATURA: React.FC<{ libro: Encargable }> = ({ libro }) => {
  const [falla, setFalla] = useState(false);
  const inicial = (libro.autor ?? libro.titulo).trim().charAt(0).toUpperCase();

  if (libro.portada_url && !falla) {
    return (
      <div className="relative aspect-[3/4.1] w-full overflow-hidden rounded-[3px] bg-mist ring-1 ring-line">
        <img
          src={libro.portada_url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFalla(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-[3/4.1] w-full flex-col justify-between overflow-hidden rounded-[3px] bg-bark p-3 ring-1 ring-line">
      <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-paper/40">{libro.anio ?? 's. f.'}</span>
      <span className="line-clamp-3 font-display text-[12px] font-semibold leading-tight text-paper">{libro.titulo}</span>
      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-clay">{inicial}</span>
    </div>
  );
};

export const Encargables: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [pagina, setPagina] = useState(1);
  const [libros, setLibros] = useState<Encargable[]>([]);
  const [meta, setMeta] = useState<Payload | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [vista, setVista] = useState<'todo' | 'novedades'>('todo');

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 320);
    return () => window.clearTimeout(t);
  }, [query]);

  const cargar = useCallback(
    async (paginaPedida: number, reemplazar: boolean) => {
      setCargando(true);
      setError(false);
      try {
        const desde = vista === 'novedades' ? new Date().getFullYear() - 1 : 0;
        const res = await fetch(
          `/api/catalogo?q=${encodeURIComponent(debounced)}&pagina=${paginaPedida}&limite=24&desde=${desde}`
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Payload;
        setMeta(data);
        setLibros((prev) => (reemplazar ? data.libros : [...prev, ...data.libros]));
        setPagina(data.pagina);
      } catch {
        setError(true);
      } finally {
        setCargando(false);
      }
    },
    [debounced, vista]
  );

  useEffect(() => {
    void cargar(1, true);
  }, [cargar]);

  const total = meta?.total ?? 0;
  const hayMas = Boolean(meta && meta.pagina < meta.paginas);

  const encargar = (libro: Encargable) => {
    const asunto = `Encargo: ${libro.titulo}`;
    const cuerpo = [
      `Hola:`,
      ``,
      `Quiero encargar «${libro.titulo}»${libro.autor ? `, de ${libro.autor}` : ''}${
        libro.editorial ? ` (${libro.editorial})` : ''
      }.`,
      ``,
      `¿Me confirmáis precio y plazo?`,
      ``,
      `Gracias.`
    ].join('\n');
    window.location.href = `mailto:${CORREO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  };

  const resumen = useMemo(() => {
    if (!meta) return '';
    if (debounced) return `${total} ${total === 1 ? 'título' : 'títulos'} para «${debounced}»`;
    return `${total.toLocaleString('es-ES')} títulos de ${meta.editoriales} editoriales españolas`;
  }, [meta, total, debounced]);

  return (
    <section id="encargos" className="scroll-mt-24 border-y border-line bg-mist/40">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-24">
        <div className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-clay">Encargos</span>
            <h2 className="mt-3 font-display text-[clamp(2.2rem,4.4vw,3.4rem)] font-semibold leading-[1.02] tracking-tight text-ink">
              Todo lo que se publica en España
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-warm">
              Arriba está el fondo de la sala, con su ficha y su ejemplar. Aquí va el resto del
              catálogo español: lo que escriben autores de aquí y lo que se traduce, siempre en
              edición castellana. Te lo conseguimos y llega en dos o cuatro días.
            </p>
          </div>

          <div className="w-full md:w-[360px]">
            <label htmlFor="encargos-busqueda" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Buscar en los encargos
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="encargos-busqueda"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Título, autor o editorial"
                className="w-full rounded-lg border border-line bg-paper py-3 pl-10 pr-10 text-sm text-ink placeholder-muted/80 outline-none transition-colors focus:border-clay/60"
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

        <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Qué enseñar">
          {[
            { key: 'todo' as const, label: 'Todo el catálogo' },
            { key: 'novedades' as const, label: 'Novedades' }
          ].map((opcion) => {
            const activo = vista === opcion.key;
            return (
              <button
                key={opcion.key}
                type="button"
                aria-pressed={activo}
                onClick={() => setVista(opcion.key)}
                className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  activo ? 'border-bark bg-bark text-paper' : 'border-line bg-paper text-muted-warm hover:border-muted/40'
                }`}
              >
                {opcion.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            <Truck className="h-3 w-3 text-clay" />
            {resumen}
          </p>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted/70">
            · ediciones en castellano
          </span>
        </div>

        {error && (
          <p className="mt-8 rounded-lg border border-line bg-paper p-4 text-[12.5px] text-muted-warm">
            No hemos podido cargar los encargos ahora mismo. Escríbenos a {CORREO} y lo buscamos a mano.
          </p>
        )}

        {!error && libros.length === 0 && cargando && (
          <p className="mt-10 flex items-center gap-2 text-[13px] text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Consultando el catálogo…
          </p>
        )}

        {!error && libros.length === 0 && !cargando && (
          <div className="mt-10 rounded-lg border border-dashed border-line px-6 py-12 text-center">
            <p className="font-display text-xl font-semibold text-ink">No hay nada con ese nombre</p>
            <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-muted-warm">
              Lo encargamos igual: si existe en España, lo conseguimos. Escríbenos y lo buscamos.
            </p>
          </div>
        )}

        <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {libros.map((libro) => (
            <li key={libro.id} className="group flex flex-col">
              <MINIATURA libro={libro} />
              <h3 className="mt-2.5 line-clamp-2 text-[12px] font-semibold leading-snug text-ink">
                {libro.titulo}
              </h3>
              <p className="mt-0.5 truncate text-[10.5px] text-muted">{libro.autor ?? 'Autoría sin datos'}</p>
              <p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.08em] text-muted/80">
                {libro.editorial ?? '—'} · {libro.anio ?? 's. f.'}
              </p>
              <button
                type="button"
                onClick={() => encargar(libro)}
                className="mt-2 inline-flex items-center gap-1 self-start text-[10.5px] font-semibold text-clay opacity-0 transition-opacity hover:underline group-hover:opacity-100 focus-visible:opacity-100"
              >
                Encargar <ArrowUpRight className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>

        {hayMas && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => void cargar(pagina + 1, false)}
              disabled={cargando}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-5 py-2.5 text-xs font-semibold text-ink transition-colors hover:border-ink/25 disabled:opacity-60"
            >
              {cargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Cargar más encargos
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
