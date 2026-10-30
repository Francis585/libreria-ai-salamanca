import React from 'react';
import type { Book } from '../data/library';

interface BookCoverProps {
  book: Book;
  className?: string;
  compact?: boolean;
}

/**
 * Portada tipográfica generada con los colores del fondo de la obra.
 * No usamos imágenes externas: así el catálogo carga instantáneo y nunca
 * muestra una portada equivocada.
 */
export const BookCover: React.FC<BookCoverProps> = ({ book, className = '', compact = false }) => {
  const { from, to, accent } = book.cover;

  return (
    <div
      className={`relative overflow-hidden book-spine ${className}`}
      style={{ backgroundImage: `linear-gradient(150deg, ${from} 0%, ${to} 92%)` }}
      aria-hidden="true"
    >
      <div
        className="absolute -right-10 -top-12 h-40 w-40 rounded-full opacity-25 blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <div
        className="absolute inset-x-0 top-0 h-px opacity-40"
        style={{ backgroundColor: accent }}
      />
      <div className={`relative flex h-full flex-col justify-between ${compact ? 'p-2' : 'p-5'}`}>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <span
            className={`font-mono uppercase ${compact ? 'text-[8px]' : 'text-[10px]'} tracking-[0.18em]`}
            style={{ color: accent, opacity: 0.9 }}
          >
            {book.year}
          </span>
          {!compact && (
            <span
              className="shrink-0 text-right font-mono text-[9px] uppercase leading-tight tracking-[0.12em]"
              style={{ color: accent, opacity: 0.62 }}
            >
              {book.category}
            </span>
          )}
        </div>

        <div className={compact ? 'space-y-0.5' : 'space-y-2'}>
          {!compact && (
            <div className="mb-1 h-px w-8" style={{ backgroundColor: accent, opacity: 0.55 }} />
          )}
          <h4
            className={`font-display font-semibold leading-[1.08] tracking-tight ${
              compact ? 'line-clamp-4 text-[10.5px]' : 'line-clamp-4 text-xl sm:text-2xl'
            }`}
            style={{ color: accent }}
          >
            {book.title}
          </h4>
          <p
            className={`font-sans tracking-wide ${compact ? 'line-clamp-2 text-[7.5px]' : 'truncate text-[11px]'}`}
            style={{ color: accent, opacity: 0.78 }}
          >
            {book.author}
          </p>
        </div>

        {!compact && (
          <div
            className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em]"
            style={{ color: accent, opacity: 0.5 }}
          >
            {book.accessionCode ?? 'Librería AI · Salamanca'}
          </div>
        )}
      </div>
    </div>
  );
};
