import React, { useState } from 'react';
import type { Book } from '../data/library';
import PORTADAS from '../data/portadas.json';

interface BookCoverProps {
  book: Book;
  className?: string;
  compact?: boolean;
}

/**
 * Portada de la obra.
 *
 * Dos caminos:
 *  1. Portada real de una edición en español (src/data/portadas.json, la rellena
 *     `npm run portadas` desde Google Books y Open Library). Se muestra tal cual,
 *     sin recortes ni marcos añadidos.
 *  2. Si no hay portada localizable, o la imagen falla, se dibuja la portada de
 *     serie editorial en SVG: nunca queda un hueco gris ni una portada de otra
 *     edición distinta a la que se vende.
 *
 * El respaldo generado mantiene la regla de la casa: un ornamento por materia y
 * variación determinista por obra (hash del id).
 */

const ORNAMENTS: Record<string, 'lineas' | 'rombos' | 'arcos' | 'cruces' | 'ondas'> = {
  'Clásicos Salmantinos': 'lineas',
  'Humanismo & Ciencia': 'rombos',
  Poesía: 'ondas',
  'Ensayo & Pensamiento IA': 'cruces',
  'Narrativa Contemporánea': 'arcos',
  'Novela & Aventura': 'rombos',
  'Misterio & Policíaco': 'arcos',
  Teatro: 'lineas',
  Novedades: 'cruces',
  'Infantil & Juvenil': 'ondas'
};

const PORTADAS_POR_ID = PORTADAS as Record<string, string>;

function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) % 100000;
  }
  return value;
}

/** Lleva un color hacia un gris tinta: quita el caramelo de cuero viejo sin perder la materia. */
function towardNeutral(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const target = { r: 0x14, g: 0x15, b: 0x1b };
  const r = Math.round(((num >> 16) & 255) * (1 - amount) + target.r * amount);
  const g = Math.round(((num >> 8) & 255) * (1 - amount) + target.g * amount);
  const b = Math.round((num & 255) * (1 - amount) + target.b * amount);
  return `rgb(${r} ${g} ${b})`;
}

const Pattern: React.FC<{ kind: string; id: string; accent: string }> = ({ kind, id, accent }) => {
  const seed = hash(id);
  const common = { stroke: accent, fill: 'none', strokeWidth: 0.45, opacity: 0.22 } as const;

  return (
    <svg
      viewBox="0 0 120 168"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {kind === 'lineas' &&
        Array.from({ length: 26 }).map((_, i) => (
          <line key={i} x1="0" x2="120" y1={8 + i * 6} y2={8 + i * 6} {...common} />
        ))}

      {kind === 'rombos' &&
        Array.from({ length: 7 }).flatMap((_, row) =>
          Array.from({ length: 5 }).map((__, column) => {
            const x = 8 + column * 26 + (row % 2 ? 13 : 0);
            const y = 10 + row * 24;
            return (
              <rect
                key={`${row}-${column}`}
                x={x}
                y={y}
                width="9"
                height="9"
                transform={`rotate(45 ${x + 4.5} ${y + 4.5})`}
                {...common}
              />
            );
          })
        )}

      {kind === 'ondas' &&
        Array.from({ length: 9 }).map((_, i) => (
          <path
            key={i}
            d={`M0 ${18 + i * 18} q15 -9 30 0 t30 0 t30 0 t30 0`}
            {...common}
          />
        ))}

      {kind === 'cruces' &&
        Array.from({ length: 6 }).flatMap((_, row) =>
          Array.from({ length: 4 }).map((__, column) => {
            const x = 14 + column * 28;
            const y = 16 + row * 26;
            return (
              <g key={`${row}-${column}`} {...common}>
                <line x1={x - 5} x2={x + 5} y1={y} y2={y} />
                <line x1={x} x2={x} y1={y - 5} y2={y + 5} />
              </g>
            );
          })
        )}

      {kind === 'arcos' &&
        Array.from({ length: 5 }).map((_, i) => (
          <circle
            key={i}
            cx={60}
            cy={150}
            r={22 + i * 24}
            {...common}
            strokeDasharray={i % 2 ? '2 3' : undefined}
          />
        ))}

      {/* Un solo filete: fuera el marco doble de colección antigua */}
      <line
        x1={16 + (seed % 12)}
        x2={104 - (seed % 12)}
        y1={34 + (seed % 6)}
        y2={34 + (seed % 6)}
        stroke={accent}
        strokeWidth={0.8}
        opacity={0.5}
      />
    </svg>
  );
};

const GeneratedCover: React.FC<{ book: Book; compact: boolean }> = ({ book, compact }) => {
  const { from, to, accent } = book.cover;
  const base = towardNeutral(from, 0.42);
  const deep = towardNeutral(to, 0.5);
  const seed = hash(book.id);
  const initial = (book.author.match(/[A-ZÁÉÍÓÚÑ]/g) ?? ['L'])[0];

  return (
    <div
      className="absolute inset-0"
      style={{ backgroundImage: `linear-gradient(${140 + (seed % 40)}deg, ${base} 0%, ${deep} 92%)` }}
      aria-hidden="true"
    >
      <Pattern kind={ORNAMENTS[book.category] ?? 'lineas'} id={book.id} accent={accent} />

      <div
        className={`relative flex h-full flex-col justify-between ${
          compact ? 'px-[9%] py-[8%]' : 'px-[9%] pb-[9%] pt-[7%]'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={`font-mono uppercase ${compact ? 'text-[7px]' : 'text-[9px]'} tracking-[0.2em]`}
            style={{ color: accent, opacity: 0.8 }}
          >
            {book.year}
          </span>
          {!compact && (
            <span
              className="shrink-0 text-right font-mono text-[7px] uppercase leading-tight tracking-[0.14em]"
              style={{ color: accent, opacity: 0.5 }}
            >
              {book.epoch}
            </span>
          )}
        </div>

        <div className="flex items-center justify-center">
          <div
            className={`flex items-center justify-center rounded-full border ${
              compact ? 'h-6 w-6' : 'h-11 w-11'
            }`}
            style={{ borderColor: accent, opacity: 0.7 }}
          >
            <span
              className={`font-display ${compact ? 'text-[9px]' : 'text-base'} leading-none`}
              style={{ color: accent }}
            >
              {initial}
            </span>
          </div>
        </div>

        <div className={compact ? 'space-y-0.5' : 'space-y-1.5'}>
          <h4
            className={`font-display font-semibold leading-[1.06] tracking-[-0.02em] ${
              compact ? 'line-clamp-4 text-[9.5px]' : 'line-clamp-4 text-[1.05rem] leading-[1.08] sm:text-lg'
            }`}
            style={{ color: accent }}
          >
            {book.title}
          </h4>
          <div className="h-px w-6" style={{ backgroundColor: accent, opacity: 0.45 }} />
          <p
            className={`font-sans uppercase tracking-[0.1em] ${
              compact ? 'line-clamp-2 text-[6.5px]' : 'truncate text-[9px]'
            }`}
            style={{ color: accent, opacity: 0.75 }}
          >
            {book.author}
          </p>
        </div>

        {!compact && (
          <div
            className="mt-1 font-mono text-[7px] uppercase leading-tight tracking-[0.16em]"
            style={{ color: accent, opacity: 0.4 }}
          >
            Librería AI · Rúa Mayor
          </div>
        )}
      </div>
    </div>
  );
};

export const BookCover: React.FC<BookCoverProps> = ({ book, className = '', compact = false }) => {
  const remota = PORTADAS_POR_ID[book.id];
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'falla'>('cargando');

  return (
    <div className={`relative overflow-hidden bg-mist ${className}`} aria-hidden="true">
      {/*
        La portada diseñada se pinta siempre debajo. La foto real entra encima
        cuando termina de cargar: así el estante nunca enseña un hueco gris
        mientras Open Library responde, y si la imagen falla no se nota.
      */}
      <GeneratedCover book={book} compact={compact} />

      {remota && estado !== 'falla' && (
        <>
          <img
            src={remota}
            alt=""
            loading={compact ? 'lazy' : 'eager'}
            decoding="async"
            onLoad={() => setEstado('lista')}
            onError={() => setEstado('falla')}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              estado === 'lista' ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {/* velo tenue: las portadas llegan con blancos distintos y el estante tiene que leerse parejo */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/[0.10] via-transparent to-white/[0.04]" />
        </>
      )}
    </div>
  );
};
