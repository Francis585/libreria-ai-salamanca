import React from 'react';
import { Reveal } from './Reveal';

/**
 * Cabecera de sección numerada.
 *
 * La idea viene de las webs de escudería: cada capítulo lleva su número y su
 * etiqueta antes del titular. No añade contenido, pero ordena el scroll y hace
 * que la página se lea como un dossier y no como una sucesión de bloques.
 */
type Props = {
  n: string;
  children: React.ReactNode;
  /** 'oscuro' invierte el texto para secciones sobre fondo de tinta. */
  tono?: 'claro' | 'oscuro' | 'terra' | 'olive' | 'mustard' | 'plum' | 'teal';
};

const TINTA: Record<NonNullable<Props['tono']>, string> = {
  claro: 'text-clay',
  oscuro: 'text-paper/55',
  terra: 'text-terra',
  olive: 'text-olive',
  mustard: 'text-mustard',
  plum: 'text-plum',
  teal: 'text-teal'
};

const REGLA: Record<NonNullable<Props['tono']>, string> = {
  claro: 'bg-clay/40',
  oscuro: 'bg-paper/20',
  terra: 'bg-terra/40',
  olive: 'bg-olive/40',
  mustard: 'bg-mustard/40',
  plum: 'bg-plum/40',
  teal: 'bg-teal/40'
};

export const SectionLabel: React.FC<Props> = ({ n, children, tono = 'claro' }) => (
  <Reveal className="flex items-center gap-3" y={8}>
    <span className="sr-only">{n}</span>
    <span className={`font-mono text-[11px] tabular-nums tracking-[0.18em] ${TINTA[tono]}`}>{n}</span>
    <span aria-hidden="true" className={`rule-draw h-px w-7 ${REGLA[tono]}`} />
    <span
      className={`font-mono text-[11px] uppercase tracking-[0.18em] ${
        tono === 'oscuro' ? 'text-paper/55' : 'text-muted-warm'
      }`}
    >
      {children}
    </span>
  </Reveal>
);
