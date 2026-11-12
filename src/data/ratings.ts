import ratingsData from './ratings.json';

/**
 * Valoraciones reales de lectores, traídas de Open Library con
 * `scripts/fetch-ratings.mjs`. Son votos de personas, no una nota editorial:
 * la media y el reparto vienen tal cual de la ficha de la obra.
 *
 * Solo están las obras con votos suficientes. Las demás se quedan con la
 * nota de la casa y así se dice en la ficha.
 */
export interface RealRating {
  average: number;
  count: number;
  counts: Record<string, number>;
  key: string;
  source: 'openlibrary';
  fetched: string;
}

export const REAL_RATINGS = ratingsData as unknown as Record<string, RealRating>;

export function getRealRating(id: string | undefined): RealRating | undefined {
  if (!id) return undefined;
  return REAL_RATINGS[id];
}

/** Reparto en el formato que espera la ficha: 5 arriba, 1 abajo. */
export function distribucionReal(r: RealRating): { estrellas: number; cuantas: number }[] {
  return [5, 4, 3, 2, 1].map((estrellas) => ({
    estrellas,
    cuantas: Number(r.counts?.[String(estrellas)] ?? 0)
  }));
}

export const SOURCE_URL = 'https://openlibrary.org';
