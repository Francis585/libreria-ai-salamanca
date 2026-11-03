import React from 'react';
import type { Book } from '../data/library';

interface BookCoverProps {
  book: Book;
  className?: string;
  compact?: boolean;
}

/**
 * Portada de serie editorial, generada en SVG.
 *
 * Reglas de la casa:
 *  - nunca una imagen externa (el catálogo no puede mostrar la portada de otra
 *    edición, y una portada equivocada es peor que ninguna);
 *  - un ornamento distinto por materia, para que el estante se lea de un vistazo;
 *  - tipografía y filetes a la manera de las colecciones de clásicos;
 *  - variación determinista por obra (hash del id): ni dos portadas idénticas
 *    ni un patrón que cambie entre renderizados.
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

function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) % 100000;
  }
  return value;
}

const Pattern: React.FC<{ kind: string; id: string; accent: string }> = ({ kind, id, accent }) => {
  const seed = hash(id);
  const common = { stroke: accent, fill: 'none', strokeWidth: 0.6, opacity: 0.28 } as const;

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

      {/* filete de la casa: doble línea, arriba y abajo */}
      <rect x="5" y="5" width="110" height="158" {...common} strokeWidth={0.9} opacity={0.5} />
      <rect x="8" y="8" width="104" height="152" {...common} strokeWidth={0.4} opacity={0.35} />
      <line
        x1={20 + (seed % 12)}
        x2={100 - (seed % 12)}
        y1={34 + (seed % 6)}
        y2={34 + (seed % 6)}
        stroke={accent}
        strokeWidth={0.7}
        opacity={0.55}
      />
    </svg>
  );
};

export const BookCover: React.FC<BookCoverProps> = ({ book, className = '', compact = false }) => {
  const { from, to, accent } = book.cover;
  const ornament = ORNAMENTS[book.category] ?? 'lineas';
  const seed = hash(book.id);
  const initial = (book.author.match(/[A-ZÁÉÍÓÚÑ]/g) ?? ['L'])[0];

  return (
    <div
      className={`relative overflow-hidden book-spine ${className}`}
      style={{
        backgroundImage: `linear-gradient(${140 + (seed % 40)}deg, ${from} 0%, ${to} 92%)`
      }}
      aria-hidden="true"
    >
      {/* lomo */}
      <div
        className="absolute inset-y-0 left-0 w-[6%]"
        style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.45), rgba(255,255,255,.06) 70%, transparent)' }}
      />
      {/* grano del papel */}
      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(115deg, rgba(255,255,255,.16) 0 1px, transparent 1px 3px), radial-gradient(circle at 30% 20%, rgba(255,255,255,.12), transparent 60%)'
        }}
      />

      <Pattern kind={ornament} id={book.id} accent={accent} />

      <div
        className={`relative flex h-full flex-col justify-between ${
          compact ? 'px-[9%] py-[8%]' : 'px-[9%] pb-[9%] pt-[7%]'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={`font-mono uppercase ${compact ? 'text-[7px]' : 'text-[9px]'} tracking-[0.2em]`}
            style={{ color: accent, opacity: 0.85 }}
          >
            {book.year}
          </span>
          {!compact && (
            <span
              className="shrink-0 text-right font-mono text-[7px] uppercase leading-tight tracking-[0.14em]"
              style={{ color: accent, opacity: 0.55 }}
            >
              {book.epoch}
            </span>
          )}
        </div>

        {/* emblema */}
        <div className="flex items-center justify-center">
          <div
            className={`flex items-center justify-center rounded-full border ${
              compact ? 'h-6 w-6' : 'h-11 w-11'
            }`}
            style={{ borderColor: accent, opacity: 0.75 }}
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
            className={`font-display font-semibold leading-[1.06] tracking-tight ${
              compact ? 'line-clamp-4 text-[9.5px]' : 'line-clamp-4 text-[1.05rem] leading-[1.08] sm:text-lg'
            }`}
            style={{ color: accent }}
          >
            {book.title}
          </h4>
          <div className="h-px w-6" style={{ backgroundColor: accent, opacity: 0.5 }} />
          <p
            className={`font-sans uppercase tracking-[0.1em] ${
              compact ? 'line-clamp-2 text-[6.5px]' : 'truncate text-[9px]'
            }`}
            style={{ color: accent, opacity: 0.8 }}
          >
            {book.author}
          </p>
        </div>

        {!compact && (
          <div
            className="mt-1 font-mono text-[7px] uppercase leading-tight tracking-[0.16em]"
            style={{ color: accent, opacity: 0.45 }}
          >
            Librería AI · Rúa Mayor
          </div>
        )}
      </div>

      {/* brillo de estante */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, rgba(255,255,255,.14) 0%, transparent 35%, transparent 70%, rgba(0,0,0,.22) 100%)'
        }}
      />
    </div>
  );
};
