import React from 'react';
import { BOOKS, type Book } from '../data/library';
import { BookCover } from './BookCover';
import { SectionLabel } from './SectionLabel';

interface ShelfMarqueeProps {
  onOpenBook: (book: Book) => void;
}

/**
 * Estantería en movimiento: todas las fichas de la casa pasan en horizontal.
 * Es el motion graphic de contenido de la página (no decorativo): enseña el
 * fondo real de la librería sin coste de scroll. Se detiene al pasar el ratón
 * y se queda quieta si el lector pide menos movimiento.
 */
export const ShelfMarquee: React.FC<ShelfMarqueeProps> = ({ onOpenBook }) => {
  const fila = [...BOOKS, ...BOOKS];

  return (
    <section aria-label="Estantería de la casa" className="overflow-hidden border-b border-line bg-paper">
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-4 px-5 pt-8 lg:px-10">
        <SectionLabel n="—">La estantería</SectionLabel>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
          {BOOKS.length} fichas · pasa el ratón para detenerla
        </p>
      </div>

      <div className="shelf relative mt-5 pb-8">
        <div className="shelf-track flex w-max items-end gap-3 px-5 sm:gap-4">
          {fila.map((book, i) => (
            <button
              key={`${book.id}-${i}`}
              type="button"
              onClick={() => onOpenBook(book)}
              aria-label={`Ver la ficha de ${book.title}`}
              className="group w-[86px] shrink-0 text-left sm:w-[104px]"
              tabIndex={i < BOOKS.length ? 0 : -1}
            >
              <span className="block overflow-hidden rounded-[3px] ring-1 ring-line shadow-[0_8px_20px_-14px_rgba(45,40,34,0.5)] transition-transform duration-300 group-hover:-translate-y-1.5">
                <BookCover book={book} compact className="aspect-[3/4.15] w-full" />
              </span>
              <span className="mt-2 block truncate font-display text-[11.5px] font-semibold text-ink">
                {book.title}
              </span>
              <span className="block truncate font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                {book.author}
              </span>
            </button>
          ))}
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-paper to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-paper to-transparent"
        />
      </div>
    </section>
  );
};
