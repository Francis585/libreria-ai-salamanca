import OPEN_LIBRARY from './ratings.json';
import GOODREADS from './goodreads.json';
import RESENAS_REALES from './resenas.json';

/**
 * Valoraciones y opiniones reales.
 *
 * Dos fuentes, ninguna inventada:
 *   · Open Library → media, nº de votos y reparto 1–5 de una edición concreta.
 *   · Goodreads    → media, nº de votos y las opiniones escritas por lectores.
 *
 * Si una obra tiene datos en las dos, se queda la que tenga más votos, porque
 * una media de 3 votos no dice nada y una de 26.000 sí. Siempre se guarda de
 * dónde viene para poder enlazarla y para no disfrazar el dato.
 */
export type Fuente = 'openlibrary' | 'goodreads';

export interface Valoracion {
  average: number;
  count: number;
  source: Fuente;
  /** Ficha original, para enlazar desde la web. */
  url: string;
  /** Reparto 1–5, solo cuando la fuente lo da (Open Library). */
  counts?: Record<string, number>;
}

export interface Opinion {
  nombre: string;
  estrellas: number | null;
  texto: string;
  fecha: string | null;
  enlace: string | null;
}

type CrudoOL = { average: number; count: number; key: string; counts?: Record<string, number> };
type CrudoGR = { average: number; count: number; url: string };

const OL = OPEN_LIBRARY as Record<string, CrudoOL>;
const GR = GOODREADS as Record<string, CrudoGR>;
const OPINIONES = RESENAS_REALES as Record<string, Opinion[]>;

export const NOMBRE_FUENTE: Record<Fuente, string> = {
  openlibrary: 'Open Library',
  goodreads: 'Goodreads'
};

export function getValoracion(id: string | undefined): Valoracion | undefined {
  if (!id) return undefined;
  const ol = OL[id];
  const gr = GR[id];
  const candidatas: Valoracion[] = [];
  if (ol?.count > 0) {
    candidatas.push({
      average: ol.average,
      count: ol.count,
      source: 'openlibrary',
      url: `https://openlibrary.org${ol.key}`,
      counts: ol.counts
    });
  }
  if (gr?.count > 0) {
    candidatas.push({
      average: gr.average,
      count: gr.count,
      source: 'goodreads',
      url: gr.url
    });
  }
  if (!candidatas.length) return undefined;
  return candidatas.sort((a, b) => b.count - a.count)[0];
}

/** Reparto 1–5 para las barras; null cuando la fuente no lo publica. */
export function reparto(v: Valoracion | undefined): { estrellas: number; cuantas: number }[] | null {
  if (!v?.counts) return null;
  return [5, 4, 3, 2, 1].map((estrellas) => ({
    estrellas,
    cuantas: Number(v.counts?.[String(estrellas)] ?? 0)
  }));
}

/** Opiniones escritas por lectores reales (Goodreads). */
export function getOpiniones(id: string | undefined): Opinion[] {
  if (!id) return [];
  return OPINIONES[id] ?? [];
}

/** Texto corto para pintar junto a la nota: «246 votos · Open Library». */
export function etiquetaVotos(v: Valoracion): string {
  return `${v.count.toLocaleString('es-ES')} ${v.count === 1 ? 'voto' : 'votos'} · ${NOMBRE_FUENTE[v.source]}`;
}
