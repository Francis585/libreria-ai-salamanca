import React from 'react';
import { BOOKS } from '../data/library';
import { REAL_RATINGS } from '../data/ratings';

/**
 * Banda de cifras reales bajo la portada, al estilo de la ficha de escudería:
 * números grandes y etiqueta pequeña. Nada inventado: cuenta las fichas del
 * catálogo, las obras con votos de lectores y los votos sumados.
 */
const obras = BOOKS.length;
const conVotos = Object.keys(REAL_RATINGS).length;
const votos = Object.values(REAL_RATINGS).reduce((suma, r) => suma + r.count, 0);
const materias = new Set(BOOKS.map((b) => b.category)).size;

const CIFRAS: { valor: string; etiqueta: string; nota?: string }[] = [
  { valor: String(obras), etiqueta: 'Fichas en catálogo' },
  { valor: String(conVotos), etiqueta: 'Con votos de lectores', nota: 'Open Library' },
  { valor: votos.toLocaleString('es-ES'), etiqueta: 'Valoraciones reales' },
  { valor: String(materias), etiqueta: 'Materias' },
  { valor: '24–48 h', etiqueta: 'Envío península' }
];

export const StatsBand: React.FC = () => (
  <section aria-label="La librería en cifras" className="border-y border-line bg-mist/60">
    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-5 py-6 sm:grid-cols-3 lg:grid-cols-5">
      {CIFRAS.map((c) => (
        <div key={c.etiqueta} className="px-1">
          <p className="font-display text-2xl font-semibold leading-none tabular-nums text-ink sm:text-3xl">
            {c.valor}
          </p>
          <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
            {c.etiqueta}
          </p>
          {c.nota && (
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted/70">{c.nota}</p>
          )}
        </div>
      ))}
    </div>
  </section>
);
