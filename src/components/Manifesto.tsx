import React from 'react';
import { ArrowDownRight, Quote } from 'lucide-react';
import { Reveal } from './Reveal';

/**
 * Banda de manifiesto: el único sitio donde la web levanta la voz.
 *
 * Es el motion graphic de verdad del sitio: el titular se descubre palabra a
 * palabra con un golpe de tinta, y el libro del lateral se dibuja solo (trazo
 * SVG con pathLength normalizado). Todo con CSS y un IntersectionObserver, sin
 * librería de animación. Si el lector pide menos movimiento, se ve quieto.
 */

const FRASE = 'Un libro no se busca por el título. Se busca por lo que te pasa.';

const REGLAS = [
  ['01', 'Se lee antes de venderse', 'Cada ficha la escribe alguien que ha abierto el libro.'],
  ['02', 'Si no está, se consigue', 'Más de dos mil quinientos títulos por encargo, en castellano.'],
  ['03', 'Nadie te llama para venderte', 'Sin correos de más. Solo el aviso de tu pedido.']
];

const CINTA = [
  'Narrativa',
  'Ensayo',
  'Poesía',
  'Infantil',
  'Clásicos',
  'Traducción',
  'Salamanca',
  'Libros en castellano'
];

export const Manifesto: React.FC = () => {
  const palabras = FRASE.split(' ');

  return (
    <section
      id="manifiesto"
      aria-label="Cómo trabaja la librería"
      className="relative overflow-hidden border-y border-paper/10 bg-ink text-paper"
    >
      <div aria-hidden="true" className="hero-ink pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-5 py-20 lg:grid-cols-12 lg:gap-14 lg:px-10 lg:py-28">
        <div className="lg:col-span-7">
          <Reveal className="flex items-center gap-3" y={10}>
            <span aria-hidden="true" className="h-1.5 w-1.5 bg-clay" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/55">
              Manifiesto de la casa
            </span>
            <span aria-hidden="true" className="h-px flex-1 bg-paper/15" />
          </Reveal>

          <h2 className="mt-7 max-w-[22ch] font-display text-[clamp(2.3rem,5.4vw,4.4rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            <Reveal as="div" className="word-reveal" y={0}>
              {palabras.map((palabra, i) => {
                const esCorte = i >= 6;
                return (
                  <span
                    key={`${palabra}-${i}`}
                    className={`word ${esCorte ? 'display-outline' : 'text-paper'}`}
                    style={{ '--wd': `${i * 55}ms` } as React.CSSProperties}
                  >
                    {palabra}
                    {i < palabras.length - 1 ? '\u00A0' : ''}
                  </span>
                );
              })}
            </Reveal>
          </h2>

          <Reveal delay={220} className="mt-7 max-w-[54ch] text-[14.5px] leading-[1.7] text-paper/60">
            No pedimos que recuerdes el título ni el autor. Cuéntanos qué te apetece leer, qué
            te ha gustado antes o qué no aguantas, y lo buscamos entre nuestras estanterías y el
            fondo español por encargo. Si no existe, te lo decimos a la cara.
          </Reveal>

          <Reveal delay={300} className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#encargos"
              className="group inline-flex items-center gap-2 rounded-lg bg-clay px-5 py-3 text-[13px] font-semibold text-white transition-all hover:bg-clay-deep hover:shadow-[0_12px_28px_-14px_rgba(59,59,245,0.85)]"
            >
              Ver el fondo por encargo
              <ArrowDownRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
            </a>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/40">
              Sin registro · sin llamadas
            </span>
          </Reveal>
        </div>

        <div className="lg:col-span-5">
          <Reveal as="figure" className="mg-draw relative mx-auto max-w-[380px]" delay={120} y={12}>
            <svg
              viewBox="0 0 360 280"
              role="img"
              aria-label="Libro abierto dibujado con una sola línea"
              className="w-full"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Lomo y tapas */}
              <path pathLength={1} d="M180 56v190" stroke="#a9a9ff" style={{ '--d': '0ms' } as React.CSSProperties} />
              <path pathLength={1} d="M180 56C150 40 108 34 72 44v178c36-10 78-4 108 12" stroke="#f3eee3" strokeOpacity="0.75" style={{ '--d': '120ms' } as React.CSSProperties} />
              <path pathLength={1} d="M180 56c30-16 72-22 108-12v178c-36-10-78-4-108 12" stroke="#f3eee3" strokeOpacity="0.75" style={{ '--d': '220ms' } as React.CSSProperties} />
              {/* Hojas: líneas de texto que se dibujan después */}
              <path pathLength={1} d="M96 78c26-4 54 0 68 10" stroke="#f3eee3" strokeOpacity="0.35" style={{ '--d': '620ms' } as React.CSSProperties} />
              <path pathLength={1} d="M96 96c26-4 54 0 68 10" stroke="#f3eee3" strokeOpacity="0.35" style={{ '--d': '700ms' } as React.CSSProperties} />
              <path pathLength={1} d="M96 114c26-4 54 0 68 10" stroke="#f3eee3" strokeOpacity="0.35" style={{ '--d': '780ms' } as React.CSSProperties} />
              <path pathLength={1} d="M96 132c26-4 54 0 68 10" stroke="#f3eee3" strokeOpacity="0.2" style={{ '--d': '860ms' } as React.CSSProperties} />
              <path pathLength={1} d="M196 88c26-4 54 0 68 10" stroke="#f3eee3" strokeOpacity="0.35" style={{ '--d': '660ms' } as React.CSSProperties} />
              <path pathLength={1} d="M196 106c26-4 54 0 68 10" stroke="#f3eee3" strokeOpacity="0.35" style={{ '--d': '740ms' } as React.CSSProperties} />
              <path pathLength={1} d="M196 124c26-4 54 0 68 10" stroke="#f3eee3" strokeOpacity="0.35" style={{ '--d': '820ms' } as React.CSSProperties} />
              <path pathLength={1} d="M196 142c26-4 54 0 68 10" stroke="#f3eee3" strokeOpacity="0.2" style={{ '--d': '900ms' } as React.CSSProperties} />
              {/* Marcapáginas cobalto */}
              <path pathLength={1} d="M180 56v96l-12-10-12 10V56" stroke="#a9a9ff" strokeWidth="1.2" style={{ '--d': '1000ms' } as React.CSSProperties} />
            </svg>

            <figcaption className="mt-6 flex items-start gap-2.5 border-t border-paper/15 pt-5">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
              <p className="font-serif text-[17px] italic leading-snug text-paper/80">
                «Una librería no vende libros: encuentra el que te hace falta.»
              </p>
            </figcaption>
          </Reveal>

          <ul className="mt-8 space-y-3">
            {REGLAS.map(([n, titulo, detalle], i) => (
              <Reveal as="li" key={n} delay={140 + i * 90} y={14} className="flex gap-3 border-t border-paper/10 pt-3">
                <span className="mt-0.5 font-mono text-[10px] tracking-[0.16em] text-clay">{n}</span>
                <span>
                  <strong className="block text-[12.5px] font-semibold text-paper">{titulo}</strong>
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-paper/50">{detalle}</span>
                </span>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>

      {/* Kinetic type: la cinta de materias en contorno, en sentido contrario */}
      <div className="relative overflow-hidden border-t border-paper/10 py-3">
        <div className="marquee marquee-reverse flex w-max items-center gap-8 whitespace-nowrap pr-8">
          {[0, 1].map((copia) => (
            <React.Fragment key={copia}>
              {CINTA.map((materia) => (
                <span key={`${copia}-${materia}`} className="flex items-center gap-8">
                  <span className="display-outline font-display text-[22px] font-semibold uppercase tracking-[0.02em] opacity-60">
                    {materia}
                  </span>
                  <span aria-hidden="true" className="h-1 w-1 bg-clay/70" />
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
