import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Send, Star, ThumbsUp } from 'lucide-react';

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

/** Opiniones de una obra. Si el endpoint no responde, la ficha sigue funcionando sin ellas. */
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
        resenas: json.resenas ?? [],
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
  valoracionEditorial: number;
  /** Si la ficha ya pidió las opiniones, se reutilizan en vez de pedirlas otra vez. */
  datos?: ReturnType<typeof useResenas>;
}

export const Reviews: React.FC<ReviewsProps> = ({ libroId, valoracionEditorial, datos }) => {
  const propio = useResenas(datos ? undefined : libroId);
  const fuente = datos ?? propio;
  const { resenas, total, media, distribucion, cargando, error, recargar } = fuente;
  const [nombre, setNombre] = useState('');
  const [puntos, setPuntos] = useState(5);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);

  const mediaMostrada = media ?? valoracionEditorial;
  const maximo = Math.max(1, ...distribucion.map((d) => d.cuantas));

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
      <div className="grid gap-5 rounded-xl border border-line bg-mist/40 p-4 sm:grid-cols-[150px_1fr]">
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-semibold leading-none tabular-nums text-ink">
            {mediaMostrada.toFixed(1)}
          </span>
          <Estrellas valor={mediaMostrada} className="mt-1.5" />
          <span className="mt-2 rounded-full bg-clay/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-clay">
            Nota de la casa
          </span>
          <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {total > 0
              ? `${total} ${total === 1 ? 'opinión' : 'opiniones'}`
              : 'Sin opiniones de lectores'}
          </span>
        </div>

        <div className="space-y-1">
          {distribucion.length === 0 && (
            <p className="py-4 text-[12px] leading-relaxed text-muted-warm">
              Esta nota no es una media de usuarios: es la que le pone el equipo de la librería al
              recomendar el título. Cuando alguien deje su opinión desde la ficha, aparecerá aquí con
              su nombre y sin pasar por filtros.
            </p>
          )}
          {distribucion.map((fila) => (
            <div key={fila.estrellas} className="flex items-center gap-2">
              <span className="w-3 font-mono text-[10px] text-muted">{fila.estrellas}</span>
              <Star className="h-2.5 w-2.5 fill-muted text-muted" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-clay"
                  style={{ width: `${(fila.cuantas / maximo) * 100}%` }}
                />
              </div>
              <span className="w-4 text-right font-mono text-[10px] tabular-nums text-muted">
                {fila.cuantas}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-line bg-mist/50 p-3 text-[11.5px] text-muted-warm">
          No hemos podido cargar las opiniones ahora mismo. La ficha y la compra funcionan igual.
        </p>
      )}

      {/* Lista */}
      <div className="space-y-4">
        {cargando && (
          <p className="flex items-center gap-2 text-[12px] text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando opiniones…
          </p>
        )}

        {resenas.map((resena) => (
          <article key={resena.id} className="border-b border-line-soft pb-4 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="grid h-7 w-7 place-items-center rounded-full bg-bark font-mono text-[10px] font-semibold text-paper"
                aria-hidden="true"
              >
                {resena.nombre.trim().charAt(0).toUpperCase()}
              </span>
              <p className="text-[12.5px] font-semibold text-ink">{resena.nombre}</p>
              <Estrellas valor={resena.valoracion} />
              {resena.origen === 'casa' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-clay/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-clay">
                  <ThumbsUp className="h-2.5 w-2.5" /> Reseña de la casa
                </span>
              )}
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
          Se publica con tu nombre. No pedimos correo ni registro.
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
          className="mt-3 w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 text-[12.5px] leading-relaxed text-ink placeholder-muted outline-none focus:border-clay/60"
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
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {texto.length}/600
          </span>
          {enviada && <span className="text-[11px] font-medium text-emerald-700">Publicada. Gracias.</span>}
          {fallo && <span className="text-[11px] font-medium text-clay">{fallo}</span>}
        </div>
      </form>
    </div>
  );
};
