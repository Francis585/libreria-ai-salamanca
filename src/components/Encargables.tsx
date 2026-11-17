import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Loader2, Search, Truck, X } from 'lucide-react';
import { SectionLabel } from './SectionLabel';
import { Reveal } from './Reveal';

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
  precio: string | number | null;
  precio_origen: 'estimado' | 'manual' | null;
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
      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-mustard">{inicial}</span>
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
  const [vista, setVista] = useState<'novedades' | 'siglo21' | 'todo'>('siglo21');

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 320);
    return () => window.clearTimeout(t);
  }, [query]);

  const cargar = useCallback(
    async (paginaPedida: number, reemplazar: boolean) => {
      setCargando(true);
      setError(false);
      try {
        // Tres estanterías temporales: lo que acaba de salir, todo el siglo XXI
        // y el fondo completo. El siglo XXI es la vista por defecto porque es
        // donde está el 93 % del catálogo.
        const rango =
          vista === 'novedades'
            ? { desde: new Date().getFullYear() - 1, hasta: 0 }
            : vista === 'siglo21'
              ? { desde: 2000, hasta: new Date().getFullYear() - 2 }
              : { desde: 0, hasta: 0 };
        const res = await fetch(
          `/api/catalogo?q=${encodeURIComponent(debounced)}&pagina=${paginaPedida}&limite=24&desde=${rango.desde}&hasta=${rango.hasta}`
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
      libro.precio !== null
        ? `Precio que veo en la web: ${Number(libro.precio).toFixed(2).replace('.', ',')} €${
            libro.precio_origen === 'estimado' ? ' (orientativo)' : ''
          }.`
        : '',
      ``,
      `¿Me confirmáis precio final y plazo?`,
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
    <section id="encargos" className="relative scroll-mt-24 overflow-hidden border-y border-paper/10 bg-terra-deep text-paper">
      <div aria-hidden="true" className="stripes" />
      <div aria-hidden="true" className="hero-ink pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-24">
        <Reveal className="flex flex-col gap-6 border-b border-paper/15 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <SectionLabel n="04" tono="oscuro">Encargos</SectionLabel>
            <h2 className="mt-3 font-display text-[clamp(2.2rem,4.4vw,3.4rem)] font-semibold leading-[1.02] tracking-tight text-paper">
              Todo lo que se publica en España
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-paper/60">
              Arriba está el fondo de la sala, con su ficha y su ejemplar. Aquí va el resto del
              catálogo español: lo que escriben autores de aquí y lo que se traduce, siempre en
              edición castellana. Te lo conseguimos y llega en dos o cuatro días.
            </p>
          </div>

          <div className="w-full md:w-[360px]">
            <label htmlFor="encargos-busqueda" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-paper/45">
              Buscar en los encargos
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper/40" />
              <input
                id="encargos-busqueda"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Título, autor o editorial"
                className="w-full rounded-lg border border-paper/20 bg-paper/[0.06] py-3 pl-10 pr-10 text-sm text-paper placeholder-paper/35 outline-none transition-colors focus:border-mustard/70 focus:bg-paper/10"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Borrar búsqueda"
                  className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-paper/50 hover:bg-paper/10 hover:text-paper"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </Reveal>

        <Reveal delay={120} className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Qué enseñar">
          {[
            { key: 'siglo21' as const, label: 'Siglo XXI' },
            { key: 'novedades' as const, label: 'Últimas novedades' },
            { key: 'todo' as const, label: 'Todo el fondo' }
          ].map((opcion) => {
            const activo = vista === opcion.key;
            return (
              <button
                key={opcion.key}
                type="button"
                aria-pressed={activo}
                onClick={() => setVista(opcion.key)}
                className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  activo
                    ? 'border-paper bg-paper text-ink'
                    : 'border-paper/20 bg-transparent text-paper/55 hover:border-paper/45 hover:text-paper'
                }`}
              >
                {opcion.label}
              </button>
            );
          })}
        </Reveal>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/45">
            <Truck className="h-3 w-3 text-mustard" />
            {resumen}
          </p>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-paper/30">
            · ediciones en castellano · precio orientativo: te lo confirmamos al preparar el pedido
          </span>
        </div>

        {error && (
          <p className="mt-8 rounded-lg border border-paper/20 bg-paper/[0.06] p-4 text-[12.5px] text-paper/70">
            No hemos podido cargar los encargos ahora mismo. Escríbenos a {CORREO} y lo buscamos a mano.
          </p>
        )}

        {!error && libros.length === 0 && cargando && (
          <p className="mt-10 flex items-center gap-2 text-[13px] text-paper/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Consultando el catálogo…
          </p>
        )}

        {!error && libros.length === 0 && !cargando && (
          <div className="mt-10 rounded-lg border border-dashed border-paper/20 px-6 py-12 text-center">
            <p className="font-display text-xl font-semibold text-paper">No hay nada con ese nombre</p>
            <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-paper/55">
              Lo encargamos igual: si existe en España, lo conseguimos. Escríbenos y lo buscamos.
            </p>
          </div>
        )}

        <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {libros.map((libro, i) => (
            <Reveal
              as="li"
              key={libro.id}
              delay={(i % 12) * 40}
              y={14}
              className="group flex flex-col"
            >
              <MINIATURA libro={libro} />
              <h3 className="mt-2.5 line-clamp-2 text-[12px] font-semibold leading-snug text-paper">
                {libro.titulo}
              </h3>
              <p className="mt-0.5 truncate text-[11px] text-paper/50">{libro.autor ?? 'Autoría sin datos'}</p>
              <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-paper/35">
                {libro.editorial ?? '—'} · {libro.anio ?? 's. f.'}
              </p>
              {libro.precio !== null && (
                <p className="mt-1 text-[11.5px] font-semibold text-paper">
                  {Number(libro.precio).toFixed(2).replace('.', ',')} €
                  {libro.precio_origen === 'estimado' && (
                    <span className="ml-1 font-mono text-[10px] font-normal uppercase tracking-[0.06em] text-paper/40">
                      orient.
                    </span>
                  )}
                </p>
              )}
              <button
                type="button"
                onClick={() => encargar(libro)}
                className="mt-2 inline-flex items-center gap-1 self-start text-[11px] font-semibold text-mustard opacity-0 transition-opacity hover:underline group-hover:opacity-100 focus-visible:opacity-100"
              >
                Encargar <ArrowUpRight className="h-3 w-3" />
              </button>
            </Reveal>
          ))}
        </ul>

        {hayMas && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => void cargar(pagina + 1, false)}
              disabled={cargando}
              className="inline-flex items-center gap-2 rounded-lg border border-paper/25 px-5 py-2.5 text-xs font-semibold text-paper transition-colors hover:border-paper/60 hover:bg-paper/5 disabled:opacity-60"
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
