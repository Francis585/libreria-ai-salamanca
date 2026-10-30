import React from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Coffee, Quote, Sparkles, Star } from 'lucide-react';
import type { Book } from '../data/library';
import { BOOKS } from '../data/library';
import { BookCover } from './BookCover';

interface HeroProps {
  featured: Book;
  onOpenBook: (book: Book) => void;
  onAdd: (book: Book) => void;
}

export const Hero: React.FC<HeroProps> = ({ featured, onOpenBook, onAdd }) => {
  return (
    <section id="inicio" className="relative overflow-hidden">
      {/* Arco de piedra de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-10 hidden h-[520px] w-[420px] rounded-t-full border border-line/80 lg:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 top-24 hidden h-[440px] w-[300px] rounded-t-full border border-line/50 lg:block"
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 pb-16 pt-14 lg:grid-cols-12 lg:gap-8 lg:px-10 lg:pb-24 lg:pt-20">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-mist/60 px-3 py-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-clay" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-warm sm:text-[10px] sm:tracking-[0.18em]">
              Librería abierta · Rúa Mayor 14
            </span>
          </div>

          <h1 className="mt-7 max-w-[15ch] font-display text-[clamp(2.9rem,7vw,5.1rem)] font-semibold leading-[0.94] tracking-[-0.02em] text-ink text-balance">
            Ocho siglos de letras.
            <span className="mt-1 block italic text-clay">Una forma nueva de encontrarlas.</span>
          </h1>

          <p className="mt-7 max-w-xl text-[15px] leading-[1.75] text-muted-warm sm:text-base">
            Somos la librería de la Rúa Mayor: fondo salmantino, ediciones cuidadas y un
            mostrador de madera donde todavía se recomienda de viva voz. Ahora ese mostrador
            también entiende lo que buscas cuando no recuerdas el título.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#catalogo"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-bark px-6 py-3.5 text-sm font-semibold text-paper transition-all hover:bg-ink hover:shadow-lg hover:shadow-bark/15"
            >
              Explorar el catálogo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#oraculo"
              className="group inline-flex items-center justify-center gap-2 rounded-xl border border-clay/35 bg-clay/[0.06] px-6 py-3.5 text-sm font-semibold text-clay transition-all hover:border-clay/60 hover:bg-clay/10"
            >
              <Sparkles className="h-4 w-4" />
              Pedir al Oráculo
            </a>
          </div>

          <dl className="mt-11 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">En sala</dt>
              <dd className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">
                {BOOKS.length}
                <span className="ml-1 font-sans text-xs font-medium text-muted">títulos</span>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Fondo digitalizado</dt>
              <dd className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">
                1.200
                <span className="ml-1 font-sans text-xs font-medium text-muted">dpi</span>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">En la Rúa</dt>
              <dd className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">
                1987
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative lg:col-span-5 lg:pl-6">
          <div className="relative mx-auto max-w-[340px]">
            <div className="absolute -inset-3 rounded-[4px] bg-mist/70" aria-hidden="true" />
            <div className="relative rotate-[-1.6deg] bg-paper p-3 shadow-[0_18px_50px_-18px_rgba(45,40,34,0.45)] ring-1 ring-line transition-transform duration-500 hover:rotate-0">
              <button
                type="button"
                onClick={() => onOpenBook(featured)}
                className="block w-full text-left"
                aria-label={`Ver la ficha de ${featured.title}`}
              >
                <BookCover book={featured} className="aspect-[3/4.1] w-full" />
              </button>
              <div className="flex items-center justify-between px-1 pb-1 pt-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Recomendado del mes
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-warm">
                  <Star className="h-3 w-3 fill-gold text-gold" />
                  {featured.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mx-auto mt-5 max-w-[340px] rounded-xl border border-line bg-paper/95 p-4 shadow-[0_10px_30px_-18px_rgba(45,40,34,0.4)] backdrop-blur sm:-mt-2">
            <div className="flex items-start gap-3">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
              <div>
                <p className="text-[13px] leading-relaxed text-muted-warm">
                  «{featured.excerpt?.original.slice(0, 116).replace(/^«/, '')}…»
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {featured.author} · {featured.year}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onAdd(featured)}
              className="mt-3 flex w-full items-center justify-between rounded-lg bg-mist px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-line"
            >
              <span>
                Añadir a la cesta · {featured.price.toFixed(2)} €
              </span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Envío gratis desde 35 €
            </span>
            <span className="h-3 w-px bg-line" />
            <span className="flex items-center gap-1.5">
              <Coffee className="h-3.5 w-3.5" /> Café en el patio
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
