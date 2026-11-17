import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Coffee, Quote, Sparkles, Star } from 'lucide-react';
import type { Book } from '../data/library';
import { BOOKS } from '../data/library';
import { getRealRating } from '../data/ratings';
import { SECCION_IA } from '../lib/brand';
import { BookCover } from './BookCover';

interface HeroProps {
  /** Tres destacados: el visitante elige, no hay carrusel automático. */
  destacados: Book[];
  onOpenBook: (book: Book) => void;
  onAdd: (book: Book) => void;
}

/**
 * Cubierta del dossier: banda oscura a sangre, titular grande con la segunda
 * línea en contorno y ficha del ejemplar del mes. La estructura viene de las
 * webs de escudería (etiqueta, cifras, ficha), la piel sigue siendo la de una
 * librería: papel, tinta y serif.
 */
export const Hero: React.FC<HeroProps> = ({ destacados, onOpenBook, onAdd }) => {
  // El primero del día rota según la fecha: la portada cambia sin animaciones.
  const inicial = new Date().getDate() % Math.max(1, destacados.length);
  const [indice, setIndice] = useState(inicial);
  const featured = destacados[Math.min(indice, destacados.length - 1)] ?? destacados[0];
  // Cuántos títulos se pueden encargar, para que se vea de un vistazo que la
  // librería es más grande que la sala.
  const [encargables, setEncargables] = useState<number>(2600);

  useEffect(() => {
    let vivo = true;
    fetch('/api/catalogo?limite=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (vivo && typeof data?.total === 'number') setEncargables(data.total);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const real = getRealRating(featured.id);

  return (
    <section id="inicio" className="relative overflow-hidden bg-ink text-paper">
      <div aria-hidden="true" className="hero-ink pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px bg-paper/10 lg:block"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 pb-12 pt-9 lg:grid-cols-12 lg:gap-10 lg:px-10 lg:pb-16 lg:pt-14">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-1.5 w-1.5 bg-clay" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55">
              Librería online · Salamanca
            </span>
            <span aria-hidden="true" className="hidden h-px flex-1 bg-paper/15 sm:block" />
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-paper/40 sm:block">
              Desde 2026
            </span>
          </div>

          <h1 className="mt-7 max-w-[18ch] font-display text-[clamp(2.5rem,6.4vw,4.9rem)] font-semibold leading-[0.94] tracking-[-0.045em] text-paper text-balance">
            El libro que buscas,
            <span className="display-outline mt-1 block text-[1.02em] leading-[0.98]">
              aunque no sepas cómo se llama.
            </span>
          </h1>

          <p className="mt-6 max-w-[52ch] text-[15px] leading-[1.65] text-paper/65 sm:text-[16px]">
            Narrativa actual, ensayo, infantil y los clásicos que siguen vendiéndose. Escríbenos lo
            que buscas aunque no recuerdes el título: lo encontramos entre las fichas de la casa y
            más de dos mil quinientos títulos por encargo.
          </p>

          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <a
              href="#catalogo"
              className="group inline-flex items-center justify-center gap-2 rounded-lg bg-clay px-5 py-3 text-[13.5px] font-semibold text-white transition-all hover:bg-clay-deep hover:shadow-[0_10px_24px_-12px_rgba(59,59,245,0.8)]"
            >
              Explorar el catálogo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href={SECCION_IA.href}
              className="group inline-flex items-center justify-center gap-2 rounded-lg border border-paper/25 px-5 py-3 text-[13.5px] font-semibold text-paper transition-all hover:border-paper/60 hover:bg-paper/5"
            >
              <Sparkles className="h-4 w-4 text-clay" />
              {SECCION_IA.cta}
            </a>
          </div>

          <dl className="mt-10 grid max-w-xl grid-cols-3 divide-x divide-paper/15 border-t border-paper/15 pt-5">
            <div className="pr-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/45">En catálogo</dt>
              <dd className="mt-1 font-display text-[28px] font-semibold leading-none tabular-nums tracking-[-0.04em] text-paper">
                {BOOKS.length}
                <span className="ml-1 text-[11px] font-medium tracking-normal text-paper/45">títulos</span>
              </dd>
            </div>
            <div className="px-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/45">Para encargar</dt>
              <dd className="mt-1 font-display text-[28px] font-semibold leading-none tabular-nums tracking-[-0.04em] text-paper">
                {encargables.toLocaleString('es-ES')}
                <span className="ml-1 text-[11px] font-medium tracking-normal text-paper/45">títulos</span>
              </dd>
            </div>
            <div className="pl-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/45">Entrega</dt>
              <dd className="mt-1 font-display text-[28px] font-semibold leading-none tabular-nums tracking-[-0.04em] text-paper">
                24–48
                <span className="ml-1 text-[11px] font-medium tracking-normal text-paper/45">h</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative lg:col-span-5 lg:pl-4">
          <div className="relative mx-auto max-w-[340px]">
            <div
              key={featured.id}
              className="relative rounded-xl border border-paper/15 bg-paper/5 p-3 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)] animate-fade-in"
            >
              <button
                type="button"
                onClick={() => onOpenBook(featured)}
                className="block w-full overflow-hidden rounded-md text-left"
                aria-label={`Ver la ficha de ${featured.title}`}
              >
                <BookCover book={featured} className="aspect-[3/4.1] w-full" />
              </button>
              <div className="flex items-center justify-between px-1 pb-1 pt-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/50">
                  Recomendado del mes
                </span>
                <span
                  className="flex items-center gap-1 font-mono text-[11px] text-paper/70"
                  title={
                    real
                      ? `Media de ${real.count} votos de lectores en Open Library`
                      : 'Nota que le pone el equipo de la librería'
                  }
                >
                  <Star className="h-3 w-3 fill-clay text-clay" />
                  {(real?.average ?? featured.rating).toFixed(1)}
                  <span className="text-[9px] uppercase tracking-[0.1em] text-paper/40">
                    {real ? `${real.count} votos` : 'casa'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mx-auto mt-4 max-w-[340px] rounded-xl border border-paper/15 bg-paper/[0.04] p-4">
            <div className="flex items-start gap-3">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
              <div>
                <p className="text-[13px] leading-relaxed text-paper/70">
                  {featured.excerpt
                    ? `«${featured.excerpt.original.slice(0, 116).replace(/^«/, '')}…»`
                    : `${featured.synopsis.slice(0, 120).trimEnd()}…`}
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">
                  {featured.author} · {featured.year}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onAdd(featured)}
              className="mt-3 flex w-full items-center justify-between rounded-md bg-paper px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-clay hover:text-white"
            >
              <span>Añadir a la cesta · {featured.price.toFixed(2)} €</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {destacados.length > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2" role="group" aria-label="Elegir el libro destacado">
              {destacados.map((libro, i) => (
                <button
                  key={libro.id}
                  type="button"
                  onClick={() => setIndice(i)}
                  aria-pressed={i === indice}
                  aria-label={`Ver ${libro.title}`}
                  className={`overflow-hidden rounded-[3px] ring-1 transition-all ${
                    i === indice ? 'ring-2 ring-clay' : 'opacity-50 ring-paper/20 hover:opacity-100'
                  }`}
                >
                  <BookCover book={libro} compact className="h-[54px] w-[39px]" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-paper/45">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Envío gratis desde 35 €
            </span>
            <span className="h-3 w-px bg-paper/20" />
            <span className="flex items-center gap-1.5">
              <Coffee className="h-3.5 w-3.5" /> Envío a toda España
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
