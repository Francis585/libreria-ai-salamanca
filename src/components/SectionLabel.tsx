import React from 'react';

/**
 * Cabecera de sección numerada.
 *
 * La idea viene de las webs de escudería: cada capítulo lleva su número y su
 * etiqueta antes del titular. No añade contenido, pero ordena el scroll y hace
 * que la página se lea como un dossier y no como una sucesión de bloques.
 */
export const SectionLabel: React.FC<{ n: string; children: React.ReactNode }> = ({ n, children }) => (
  <div className="flex items-center gap-3">
    <span className="font-mono text-[11px] tabular-nums tracking-[0.18em] text-clay">{n}</span>
    <span aria-hidden="true" className="h-px w-7 bg-clay/40" />
    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-warm">{children}</span>
  </div>
);
