import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Coffee, Quote, Sparkles, Star } from 'lucide-react';
import type { Book } from '../data/library';
import { BOOKS } from '../data/library';
import { SECCION_IA } from '../lib/brand';
import { BookCover } from './BookCover';

interface HeroProps {
  featured: Book;
  onOpenBook: (book: Book) => void;
  onAdd: (book: Book) => void;
}

export const Hero: React.FC<HeroProps> = ({ featured, onOpenBook, onAdd }) => {
  // Cuántos títulos se pueden encargar, para que se vea de un vistazo que la
  // librería es más grande que la sala.
  const [encargables, setEncargables] = useState<number | null>(null);

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

  return (
    <section id="inicio" className="relative overflow-hidden">
      <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px bg-line/60 lg:block"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 pb-14 pt-12 lg:grid-cols-12 lg:gap-10 lg:px-10 lg:pb-20 lg:pt-16">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-sm border border-line bg-paper/80 px-2.5 py-1.5 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-clay" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-warm sm:text-[10px] sm:tracking-[0.18em]">
              Librería online desde Salamanca
            </span>
          </div>

          <h1 className="mt-6 max-w-[16ch] text-[clamp(2.55rem,6.2vw,4.5rem)] font-semibold leading-[0.97] tracking-[-0.04em] text-ink text-balance">
            El libro que buscas,
            <span className="accent-serif mt-1 block text-[1.04em] leading-[1.02] text-clay">
              aunque no sepas cómo se llama.
            </span>
          </h1>

          <p className="mt-6 max-w-[54ch] text-[15px] leading-[1.65] text-muted-warm sm:text-[16px]">
            Somos una librería online desde Salamanca: fondo salmantino, clásicos, novedades e
            infantil, y un equipo que todavía recomienda de viva voz. Escríbenos lo que buscas,
            aunque no recuerdes el título, y te lo encontramos.
          </p>

          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <a
              href="#catalogo"
              className="group inline-flex items-center justify-center gap-2 rounded-lg bg-clay px-5 py-3 text-[13.5px] font-semibold text-white transition-all hover:bg-clay-deep hover:shadow-[0_10px_24px_-12px_rgba(59,59,245,0.65)]"
            >
              Explorar el catálogo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href={SECCION_IA.href}
              className="group inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-paper px-5 py-3 text-[13.5px] font-semibold text-ink transition-all hover:border-ink/25"
            >
              <Sparkles className="h-4 w-4 text-clay" />
              {SECCION_IA.cta}
            </a>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-5">
            <div>
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">En catálogo</dt>
              <dd className="mt-1 text-[26px] font-semibold leading-none tabular-nums tracking-[-0.04em] text-ink">
                {BOOKS.length}
                <span className="ml-1 text-[11px] font-medium tracking-normal text-muted">títulos</span>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">Para encargar</dt>
              <dd className="mt-1 text-[26px] font-semibold leading-none tabular-nums tracking-[-0.04em] text-ink">
                {encargables === null ? '…' : encargables.toLocaleString('es-ES')}
                <span className="ml-1 text-[11px] font-medium tracking-normal text-muted">títulos</span>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">Entrega</dt>
              <dd className="mt-1 text-[26px] font-semibold leading-none tabular-nums tracking-[-0.04em] text-ink">
                24–48
                <span className="ml-1 text-[11px] font-medium tracking-normal text-muted">h</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative lg:col-span-5 lg:pl-4">
          <div className="relative mx-auto max-w-[330px]">
            <div className="relative rounded-xl border border-line bg-paper p-3 shadow-[0_24px_60px_-34px_rgba(14,14,16,0.55)]">
              <button
                type="button"
                onClick={() => onOpenBook(featured)}
                className="block w-full overflow-hidden rounded-md text-left"
                aria-label={`Ver la ficha de ${featured.title}`}
              >
                <BookCover book={featured} className="aspect-[3/4.1] w-full" />
              </button>
              <div className="flex items-center justify-between px-1 pb-1 pt-3">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                  Recomendado del mes
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-warm">
                  <Star className="h-3 w-3 fill-clay text-clay" />
                  {featured.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mx-auto mt-4 max-w-[330px] rounded-xl border border-line bg-paper p-4 shadow-[0_12px_32px_-24px_rgba(14,14,16,0.5)]">
            <div className="flex items-start gap-3">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
              <div>
                <p className="text-[13px] leading-relaxed text-muted-warm">
                  «{featured.excerpt?.original.slice(0, 116).replace(/^«/, '')}…»
                </p>
                <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
                  {featured.author} · {featured.year}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onAdd(featured)}
              className="mt-3 flex w-full items-center justify-between rounded-md bg-mist px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-clay hover:text-white"
            >
              <span>Añadir a la cesta · {featured.price.toFixed(2)} €</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Envío gratis desde 35 €
            </span>
            <span className="h-3 w-px bg-line" />
            <span className="flex items-center gap-1.5">
              <Coffee className="h-3.5 w-3.5" /> Envío a toda España
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
