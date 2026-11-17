import React from 'react';
import { CATEGORIES } from '../data/library';

/**
 * Cinta de materias bajo la portada.
 *
 * La idea está tomada de las webs de escudería: una franja que corre despacio y
 * dice de un vistazo qué hay dentro. Aquí sustituye a un menú de filtros que el
 * visitante todavía no sabe usar, y no cuesta ni una petición.
 */
const PIEZAS = [
  ...CATEGORIES,
  'Envío en 24–48 h',
  'Gratis desde 35 €',
  'Salamanca',
  '2.600 títulos por encargo',
  'Te recomienda una persona'
];

export const Ticker: React.FC = () => {
  // Dos copias exactas: el keyframe traslada el -50 % y el bucle no se nota.
  const fila = [...PIEZAS, ...PIEZAS];

  return (
    <div className="relative overflow-hidden border-y border-paper/10 bg-ink" aria-hidden="true">
      <div className="marquee flex w-max items-center py-2.5">
        {fila.map((pieza, i) => (
          <span key={`${pieza}-${i}`} className="flex shrink-0 items-center">
            <span className="px-4 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/55 sm:px-5">
              {pieza}
            </span>
            <span className="h-[3px] w-[3px] rotate-45 bg-clay/70" />
          </span>
        ))}
      </div>
      {/* Difumina los extremos para que la cinta no arranque en seco */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent" />
    </div>
  );
};
