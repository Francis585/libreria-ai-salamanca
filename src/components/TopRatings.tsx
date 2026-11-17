import React from 'react';
import { ArrowUpRight, Star } from 'lucide-react';
import { BOOKS, CATEGORY_ACCENTS, type Book } from '../data/library';
import { Reveal } from './Reveal';
import { getValoracion } from '../data/valoraciones';
import { SectionLabel } from './SectionLabel';

interface TopRatingsProps {
  onOpenBook: (book: Book) => void;
}

/**
 * Clasificación de lectores, al estilo de la tabla de un campeonato: puesto,
 * obra, materia, nota y votos con barra comparativa. Solo entran obras con
 * votos reales de Open Library; no hay nada ponderado a mano.
 */
export const TopRatings: React.FC<TopRatingsProps> = ({ onOpenBook }) => {
  // Media ponderada: una nota de 5 con un solo voto no puede adelantar a una de
  // 4,3 con 246. Se acerca cada media a la media del catálogo (4 de 5) según
  // los votos que tenga, así el orden aguanta una lectura rápida.
  const PESO = 25;
  const MEDIA_CATALOGO = 4;
  const ponderada = (average: number, count: number) => (average * count + MEDIA_CATALOGO * PESO) / (count + PESO);

  const filas = BOOKS.map((libro) => ({ libro, real: getValoracion(libro.id) }))
    .filter((fila): fila is { libro: Book; real: NonNullable<ReturnType<typeof getValoracion>> } => Boolean(fila.real) && fila.real!.count >= 3)
    .sort((a, b) => ponderada(b.real.average, b.real.count) - ponderada(a.real.average, a.real.count))
    .slice(0, 8);

  if (!filas.length) return null;
  const maxVotos = Math.max(...filas.map((f) => f.real.count));

  return (
    <Reveal as="section" id="clasificacion" className="border-t border-line bg-paper">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-10 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel n="02" tono="terra">Clasificación de lectores</SectionLabel>
            <h2 className="mt-4 max-w-[24ch] font-display text-[clamp(1.9rem,3.6vw,2.9rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
              Lo que de verdad puntúan los lectores.
            </h2>
          </div>
          <p className="max-w-[34ch] text-[12.5px] leading-relaxed text-muted-warm">
            Medias y votos traídos de Open Library, actualizados solos. Las obras sin votos
            suficientes no entran aquí; su ficha lo dice sin inventar una media.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-line">
          <div className="hidden grid-cols-[3.2rem_1fr_9rem_6.5rem_9rem] gap-4 border-b border-line bg-mist/60 px-4 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted sm:grid">
            <span>#</span>
            <span>Obra</span>
            <span>Materia</span>
            <span className="text-right">Nota</span>
            <span className="text-right">Votos</span>
          </div>

          <ul>
            {filas.map(({ libro, real }, i) => (
              <Reveal
                as="li"
                key={libro.id}
                delay={Math.min(i, 7) * 45}
                y={10}
                className="border-b border-line-soft last:border-0"
              >
                <button
                  type="button"
                  onClick={() => onOpenBook(libro)}
                  className="group grid w-full grid-cols-[2.2rem_1fr_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-mist/50 sm:grid-cols-[3.2rem_1fr_9rem_6.5rem_9rem] sm:gap-4"
                  aria-label={`Ver la ficha de ${libro.title}`}
                >
                  <span className="font-display text-[18px] font-semibold tabular-nums text-clay">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-ink group-hover:text-clay">
                      {libro.title}
                    </span>
                    <span className="block truncate font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                      {libro.author}
                    </span>
                  </span>

                  <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted sm:flex">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: CATEGORY_ACCENTS[libro.category] ?? '#3b3bf5' }}
                    />
                    <span className="truncate">{libro.category}</span>
                  </span>

                  <span className="flex items-center justify-end gap-1 font-display text-[15px] font-semibold tabular-nums text-ink">
                    <Star className="h-3 w-3 fill-clay text-clay" />
                    {real.average.toFixed(1)}
                  </span>

                  <span className="hidden items-center justify-end gap-2 sm:flex">
                    <span className="h-1 w-16 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full bg-clay"
                        style={{ width: `${(real.count / maxVotos) * 100}%` }}
                      />
                    </span>
                    <span className="w-9 text-right font-mono text-[10px] tabular-nums text-muted">
                      {real.count}
                    </span>
                  </span>

                  <span className="flex items-center gap-2 sm:hidden">
                    <span className="font-mono text-[10px] text-muted">{real.count} v.</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
                  </span>
                </button>
              </Reveal>
            ))}
          </ul>
        </div>

        <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
          Fuente: Open Library · {filas.reduce((suma, f) => suma + f.real.count, 0)} votos en estas ocho obras
        </p>
      </div>
    </Reveal>
  );
};
