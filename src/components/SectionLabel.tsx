import React from 'react';

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
  tono?: 'claro' | 'oscuro';
};

export const SectionLabel: React.FC<Props> = ({ n, children, tono = 'claro' }) => (
  <div className="flex items-center gap-3">
    <span className="font-mono text-[11px] tabular-nums tracking-[0.18em] text-clay">{n}</span>
    <span aria-hidden="true" className="h-px w-7 bg-clay/40" />
    <span
      className={`font-mono text-[11px] uppercase tracking-[0.18em] ${
        tono === 'oscuro' ? 'text-paper/55' : 'text-muted-warm'
      }`}
    >
      {children}
    </span>
  </div>
);
