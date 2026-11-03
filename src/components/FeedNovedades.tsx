import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

/**
 * Novedades de las editoriales, traídas de la fuente externa y guardadas en la
 * base por el cron semanal. No se venden desde aquí: son escaparate, para que
 * la librería no parezca congelada en el fondo antiguo.
 */

interface FeedBook {
  id: string;
  titulo: string;
  autor: string | null;
  anio: number | null;
  editorial: string | null;
  paginas: number | null;
  portada_url: string | null;
  fuente: string;
}

export const FeedNovedades: React.FC = () => {
  const [libros, setLibros] = useState<FeedBook[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'vacio' | 'error'>('cargando');

  useEffect(() => {
    let vivo = true;
    fetch('/api/novedades')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data) => {
        if (!vivo) return;
        const lista: FeedBook[] = Array.isArray(data?.libros) ? data.libros : [];
        setLibros(lista);
        setEstado(lista.length ? 'ok' : 'vacio');
      })
      .catch(() => vivo && setEstado('error'));
    return () => {
      vivo = false;
    };
  }, []);

  if (estado === 'error' || estado === 'vacio') return null;

  return (
    <section className="mx-auto max-w-7xl px-5 pt-16 lg:px-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-clay">
            Recién salido de las editoriales
          </span>
          <h2 className="mt-2 font-display text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-tight tracking-tight text-ink">
            Lo que llega este año
          </h2>
        </div>
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          <RefreshCw className={`h-3 w-3 ${estado === 'cargando' ? 'animate-spin' : ''}`} />
          Se actualiza solo · fuente: Open Library
        </p>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {(estado === 'cargando' ? Array.from({ length: 6 }) : libros.slice(0, 6)).map((libro, index) => {
          if (estado === 'cargando') {
            return (
              <li key={`skeleton-${index}`} className="animate-pulse">
                <div className="aspect-[3/4.2] rounded-md bg-mist/70" />
                <div className="mt-2 h-3 w-4/5 rounded bg-mist/70" />
                <div className="mt-1 h-2 w-1/2 rounded bg-mist/50" />
              </li>
            );
          }

          const item = libro as FeedBook;
          return (
            <li key={item.id} className="group">
              <div className="relative aspect-[3/4.2] overflow-hidden rounded-md border border-line bg-mist/40 shadow-sm">
                {item.portada_url ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img
                    src={item.portada_url}
                    alt={`Portada de ${item.titulo}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-3 text-center">
                    <span className="font-display text-[13px] leading-tight text-muted-warm">{item.titulo}</span>
                  </div>
                )}
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-paper/92 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-clay shadow-sm backdrop-blur">
                  <Sparkles className="h-2.5 w-2.5" />
                  {item.anio ?? 'novedad'}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 font-display text-[13px] font-semibold leading-tight text-ink">
                {item.titulo}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted">{item.autor ?? 'Autor sin datos'}</p>
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-muted/80">
                {item.editorial ?? 'editorial sin datos'}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        Escaparate de novedades del sector, no fondo propio: para comprar cualquiera de estos títulos
        hay que encargarlo en el mostrador.
      </p>
    </section>
  );
};
