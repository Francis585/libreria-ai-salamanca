import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, Send, Star } from 'lucide-react';
import { etiquetaVotos, getOpiniones, getValoracion, NOMBRE_FUENTE, reparto } from '../data/valoraciones';

export interface Resena {
  id: number;
  nombre: string;
  valoracion: number;
  texto: string;
  origen: 'casa' | 'lector';
  creado_en: string;
}

interface ResenasPayload {
  resenas: Resena[];
  total: number;
  media: number | null;
  distribucion: { estrellas: number; cuantas: number }[];
}

const VACIO: ResenasPayload = { resenas: [], total: 0, media: null, distribucion: [] };

/** Opiniones dejadas desde la propia web. Si el endpoint no responde, la ficha sigue igual. */
export function useResenas(libroId: string | undefined) {
  const [data, setData] = useState<ResenasPayload>(VACIO);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    if (!libroId) {
      setData(VACIO);
      return;
    }
    setCargando(true);
    setError(false);
    try {
      const res = await fetch(`/api/resenas?libro=${encodeURIComponent(libroId)}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as ResenasPayload;
      setData({
        resenas: (json.resenas ?? []).filter((r) => r.origen === 'lector'),
        total: json.total ?? 0,
        media: json.media ?? null,
        distribucion: json.distribucion ?? []
      });
    } catch {
      setError(true);
      setData(VACIO);
    } finally {
      setCargando(false);
    }
  }, [libroId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { ...data, cargando, error, recargar: cargar };
}

const Estrellas: React.FC<{ valor: number; className?: string }> = ({ valor, className = '' }) => (
  <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${valor} de 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`h-3 w-3 ${n <= Math.round(valor) ? 'fill-clay text-clay' : 'text-line'}`}
      />
    ))}
  </span>
);

interface ReviewsProps {
  libroId: string;
  /** Si la ficha ya pidió las opiniones, se reutilizan en vez de pedirlas otra vez. */
  datos?: ReturnType<typeof useResenas>;
}

export const Reviews: React.FC<ReviewsProps> = ({ libroId, datos }) => {
  const propio = useResenas(datos ? undefined : libroId);
  const fuente = datos ?? propio;
  const { resenas, cargando, error, recargar } = fuente;
  const [nombre, setNombre] = useState('');
  const [puntos, setPuntos] = useState(5);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);

  const valoracion = getValoracion(libroId);
  const opiniones = getOpiniones(libroId);
  const barras = reparto(valoracion);
  const maximo = Math.max(1, ...(barras?.map((d) => d.cuantas) ?? [0]));

  // La media que se enseña es la de la fuente con más votos. Si no hay datos,
  // no hay: no se rellena con una nota inventada.
  const mediaMostrada = valoracion?.average ?? null;

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    setFallo(null);
    if (nombre.trim().length < 2) return setFallo('Pon tu nombre, aunque sea el de pila.');
    if (texto.trim().length < 12) return setFallo('Cuéntanos algo un poco más largo, aunque sea una línea.');

    setEnviando(true);
    try {
      const res = await fetch('/api/resenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libro_id: libroId, nombre: nombre.trim(), valoracion: puntos, texto: texto.trim() })
      });
      const json = await res.json();
      if (!res.ok) {
        const mensajes: Record<string, string> = {
          nombre_corto: 'El nombre es demasiado corto.',
          texto_corto: 'El texto es demasiado corto.',
          valoracion_invalida: 'Elige de 1 a 5 estrellas.',
          demasiadas_peticiones: 'Demasiadas opiniones seguidas. Prueba en un minuto.'
        };
        throw new Error(mensajes[json?.error] ?? 'No hemos podido guardar tu opinión.');
      }
      setEnviada(true);
      setNombre('');
      setTexto('');
      setPuntos(5);
      await recargar();
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No hemos podido guardar tu opinión.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Resumen */}
      <div className="grid gap-5 rounded-xl border border-line bg-mist/40 p-4 sm:grid-cols-[196px_1fr]">
        <div className="flex flex-col items-center justify-center text-center">
          {mediaMostrada === null ? (
            <>
              <span className="font-display text-3xl leading-none text-ink/25">—</span>
              <span className="mt-2 rounded-full bg-clay/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-clay">
                Sin valoraciones
              </span>
              <span className="mt-1.5 max-w-[150px] font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-muted">
                Este título aún no tiene votos de lectores
              </span>
            </>
          ) : (
            <>
              <span className="font-display text-4xl font-semibold leading-none tnum text-ink">
                {mediaMostrada.toFixed(1)}
              </span>
              <Estrellas valor={mediaMostrada} className="mt-1.5" />
              <span className="mt-2 rounded-full bg-forest px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper">
                Lectores reales
              </span>
              <a
                href={valoracion!.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1.5 inline-flex items-center gap-1 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.1em] text-muted underline decoration-line underline-offset-2 hover:text-ink"
                title={`Ver la ficha de la obra en ${NOMBRE_FUENTE[valoracion!.source]}`}
              >
                {etiquetaVotos(valoracion!)}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </>
          )}
        </div>

        <div className="space-y-1">
          {!barras && (
            <p className="py-4 text-[12px] leading-relaxed text-muted-warm">
              {mediaMostrada === null
                ? 'No hay una media de lectores que podamos enseñar sin inventarla. Cuando alguien vote, aparecerá aquí con su nombre.'
                : `La media viene de ${NOMBRE_FUENTE[valoracion!.source]}, que no publica el reparto por estrellas. Los votos son de lectores, no de la librería.`}
            </p>
          )}
          {barras?.map((fila) => (
            <div key={fila.estrellas} className="flex items-center gap-2">
              <span className="w-3 font-mono text-[10px] text-muted">{fila.estrellas}</span>
              <Star className="h-2.5 w-2.5 fill-muted text-muted" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-clay"
                  style={{ width: `${(fila.cuantas / maximo) * 100}%` }}
                />
              </div>
              <span className="w-5 text-right font-mono text-[10px] tnum text-muted">{fila.cuantas}</span>
            </div>
          ))}
          {barras && (
            <p className="pt-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted">
              Reparto de votos en {NOMBRE_FUENTE[valoracion!.source]}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-line bg-mist/50 p-3 text-[11.5px] text-muted-warm">
          No hemos podido cargar las opiniones dejadas en la web. Las de lectores externos sí se ven.
        </p>
      )}

      {/* Opiniones escritas por lectores reales (Goodreads) */}
      {opiniones.length > 0 && (
        <section aria-label="Opiniones de lectores">
          <h4 className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
            Opiniones de lectores
            <span className="text-muted">
              {opiniones.length} · {NOMBRE_FUENTE.goodreads}
            </span>
          </h4>
          <div className="mt-3 space-y-4">
            {opiniones.slice(0, 8).map((opinion, indice) => (
              <article key={`${opinion.nombre}-${indice}`} className="border-b border-line-soft pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-bark font-mono text-[10px] font-semibold text-paper" aria-hidden="true">
                    {opinion.nombre.trim().charAt(0).toUpperCase()}
                  </span>
                  <p className="text-[12.5px] font-semibold text-ink">{opinion.nombre}</p>
                  {opinion.estrellas ? <Estrellas valor={opinion.estrellas} /> : null}
                  {opinion.enlace && (
                    <a
                      href={opinion.enlace}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="ml-auto inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted hover:text-clay"
                    >
                      Ver en Goodreads <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-warm">{opinion.texto}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Opiniones dejadas desde la web */}
      <div className="space-y-4">
        {cargando && (
          <p className="flex items-center gap-2 text-[12px] text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando opiniones de la web…
          </p>
        )}
        {resenas.map((resena) => (
          <article key={resena.id} className="border-b border-line-soft pb-4 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-clay font-mono text-[10px] font-semibold text-paper" aria-hidden="true">
                {resena.nombre.trim().charAt(0).toUpperCase()}
              </span>
              <p className="text-[12.5px] font-semibold text-ink">{resena.nombre}</p>
              <Estrellas valor={resena.valoracion} />
              <time className="ml-auto font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                {new Date(resena.creado_en).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              </time>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-warm">{resena.texto}</p>
          </article>
        ))}
      </div>

      {/* Formulario */}
      <form onSubmit={enviar} className="rounded-xl border border-line p-4">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink">Deja tu opinión</h4>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Se publica con tu nombre, sin registro. Tu voto queda como opinión de esta web y no se suma a
          la media de Goodreads.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Tu valoración">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={puntos === n}
                aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
                onClick={() => setPuntos(n)}
                className="grid h-7 w-7 place-items-center rounded transition-transform hover:scale-110"
              >
                <Star className={`h-4 w-4 ${n <= puntos ? 'fill-clay text-clay' : 'text-line'}`} />
              </button>
            ))}
          </div>
          <input
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            maxLength={40}
            placeholder="Tu nombre"
            aria-label="Tu nombre"
            className="w-40 rounded-lg border border-line bg-paper px-3 py-2 text-[12px] text-ink placeholder-muted outline-none focus:border-clay/60"
          />
        </div>

        <textarea
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          maxLength={600}
          rows={3}
          placeholder="Qué te ha parecido, a quién se lo recomendarías…"
          aria-label="Tu opinión"
          className="mt-3 w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 pull-quote text-[14px] leading-snug text-ink placeholder-muted outline-none focus:border-clay/60"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center gap-2 rounded-lg bg-clay px-4 py-2 text-[11.5px] font-semibold text-white transition-colors hover:bg-clay-deep disabled:opacity-60"
          >
            {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {enviando ? 'Enviando…' : 'Publicar opinión'}
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{texto.length}/600</span>
          {enviada && <span className="text-[11px] font-medium text-emerald-700">Publicada. Gracias.</span>}
          {fallo && <span className="text-[11px] font-medium text-clay">{fallo}</span>}
        </div>
      </form>
    </div>
  );
};
