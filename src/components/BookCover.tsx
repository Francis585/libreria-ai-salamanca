import React, { useState } from 'react';
import { CATEGORY_ACCENTS, type Book } from '../data/library';
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

const PAPEL = '#f6f4ee';

/**
 * Rota el tono de un color y fija su luminosidad. Se usa para que dos libros de
 * la misma materia no salgan con la misma portada: el tono base es el de la
 * materia y cada obra lo gira unos grados según su id.
 */
function hsl(hex: string, dh: number, ds: number, luz: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  h = (h + dh + 360) % 360;
  s = Math.min(1, Math.max(0, s * ds));

  const c = (1 - Math.abs(2 * luz - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = luz - c / 2;
  let rr = 0;
  let gg = 0;
  let bb = 0;
  if (h < 60) { rr = c; gg = x; }
  else if (h < 120) { rr = x; gg = c; }
  else if (h < 180) { gg = c; bb = x; }
  else if (h < 240) { gg = x; bb = c; }
  else if (h < 300) { rr = x; bb = c; }
  else { rr = c; bb = x; }
  const a255 = (v: number) => Math.round((v + m) * 255);
  return `rgb(${a255(rr)} ${a255(gg)} ${a255(bb)})`;
}

/** Mezcla dos colores: t = 0 devuelve `a`, t = 1 devuelve `b`. */
function mix(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  };
  const A = parse(a);
  const B = parse(b);
  const r = Math.round(A.r * (1 - t) + B.r * t);
  const g = Math.round(A.g * (1 - t) + B.g * t);
  const bl = Math.round(A.b * (1 - t) + B.b * t);
  return `rgb(${r} ${g} ${bl})`;
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

/**
 * Portada de colección para las obras sin imagen localizable (y para los
 * títulos inventados del catálogo).
 *
 * Antes era un bloque casi negro: en el estante leía como hueco, no como
 * portada. Ahora es un bloque de color de verdad —tinte de la materia con el
 * título en serif oscuro, franja sólida arriba y pie de autor— así que la
 * portada generada se reconoce como portada y no como un hueco en el grid.
 */
const GeneratedCover: React.FC<{ book: Book; compact: boolean }> = ({ book, compact }) => {
  // El color del bloque sale de la materia, no del palmo de la obra: los palmos
  // guardados son marrones muy oscuros y, subidos a tono medio, se vuelven
  // grises indistinguibles. La materia sí da diez colores de verdad, y el giro
  // de tono por obra evita que tres libros de la misma materia salgan iguales.
  const base = CATEGORY_ACCENTS[book.category] ?? '#3b3bf5';
  const giro = (hash(book.id) % 90) - 45;
  const campo = hsl(base, giro, 0.66, compact ? 0.52 : 0.45);
  const franja = hsl(base, giro, 0.95, 0.27);
  const ornamento = hsl(base, giro, 1, 0.86);

  return (
    <div className="absolute inset-0" style={{ backgroundColor: campo }} aria-hidden="true">
      <Pattern kind={ORNAMENTS[book.category] ?? 'lineas'} id={book.id} accent={ornamento} />

      {/* Franja de materia: el único borde duro de la portada */}
      <div className="absolute inset-x-0 top-0" style={{ height: compact ? '3px' : '5px', backgroundColor: franja }} />

      <div className={`relative flex h-full flex-col text-paper ${compact ? 'px-[9%] pb-[9%] pt-[14%]' : 'px-[9%] pb-[7%] pt-[10%]'}`}>
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`font-mono uppercase text-paper/80 ${compact ? 'text-[6px]' : 'text-[7.5px]'} tracking-[0.18em]`}
          >
            {book.year}
          </span>
          {!compact && (
            <span className="shrink-0 font-mono text-[6.5px] uppercase tracking-[0.14em] text-paper/70">
              {book.epoch}
            </span>
          )}
        </div>

        <h4
          className={`mt-[11%] text-left font-serif font-normal text-paper ${
            compact
              ? 'line-clamp-4 text-[9.5px] leading-[1.12]'
              : 'line-clamp-4 text-[1.45rem] leading-[1.02] tracking-[-0.015em] sm:text-[1.7rem]'
          }`}
        >
          {book.title}
        </h4>

        <div className="mt-auto pt-[9%]">
          <div className="h-px w-full bg-paper/40" />
          <p className="mt-2 truncate font-mono text-[8px] uppercase tracking-[0.12em] text-paper/80">
            {book.author}
          </p>
          {!compact && (
            <p className="mt-1 truncate font-mono text-[6.5px] uppercase tracking-[0.16em] text-paper/55">
              {book.collection ?? 'Librería AI · Salamanca'}
            </p>
          )}
        </div>
      </div>

      {/* Lomo: una sombra vertical en el canto izquierdo */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/20 via-black/[0.03] to-transparent" />
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
