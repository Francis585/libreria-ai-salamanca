import React from 'react';
import { BOOKS } from '../data/library';
import { getOpiniones, getValoracion } from '../data/valoraciones';
import { CountUp } from './CountUp';
import { Reveal } from './Reveal';

/**
 * Banda de cifras reales bajo la portada, al estilo de la ficha de escudería:
 * números grandes y etiqueta pequeña. Nada inventado: cuenta las fichas del
 * catálogo, las obras con votos de lectores y los votos sumados. Los números
 * suben desde cero al entrar en pantalla; «24–48 h» se queda quieto.
 */
const obras = BOOKS.length;
const valoraciones = BOOKS.map((b) => getValoracion(b.id)).filter((v) => Boolean(v));
const conVotos = valoraciones.length;
const votos = valoraciones.reduce((suma, v) => suma + (v?.count ?? 0), 0);
const opiniones = BOOKS.reduce((suma, b) => suma + getOpiniones(b.id).length, 0);
const materias = new Set(BOOKS.map((b) => b.category)).size;

type Cifra = { valor: number; etiqueta: string; nota?: string; texto?: string };

const TINTAS = ['text-terra', 'text-mustard', 'text-paper', 'text-paper/70', 'text-paper'];

const CIFRAS: Cifra[] = [
  { valor: obras, etiqueta: 'Fichas en catálogo' },
  { valor: conVotos, etiqueta: 'Con votos de lectores', nota: 'Open Library · Goodreads' },
  { valor: votos, etiqueta: 'Valoraciones de lectores' },
  { valor: opiniones || materias, etiqueta: opiniones ? 'Opiniones escritas' : 'Materias' },
  { valor: 0, etiqueta: 'Envío península', texto: '24–48 h' }
];

export const StatsBand: React.FC = () => (
  <section aria-label="La librería en cifras" className="relative border-y border-paper/10 bg-forest">
    <div aria-hidden="true" className="stripes" />
    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-5 py-6 sm:grid-cols-3 lg:grid-cols-5">
      {CIFRAS.map((c, i) => (
        <Reveal key={c.etiqueta} delay={i * 70} y={12} className="px-1">
          <p className={`font-display text-2xl font-semibold leading-none tabular-nums sm:text-3xl ${TINTAS[i % TINTAS.length]}`}>
            {c.texto ?? <CountUp valor={c.valor} />}
          </p>
          <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper/45">
            {c.etiqueta}
          </p>
          {c.nota && (
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-paper/30">{c.nota}</p>
          )}
        </Reveal>
      ))}
    </div>
  </section>
);
