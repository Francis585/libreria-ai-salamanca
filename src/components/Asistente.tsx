import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, MessageSquare, Send, X } from 'lucide-react';
import { BOOKS, getBook, type Book } from '../data/library';
import { BookCover } from './BookCover';

/**
 * Asistente de la librería.
 *
 * A diferencia de El Librero (que recomienda lecturas), este contesta a lo que
 * hoy se pregunta por teléfono: si hay ejemplares, hasta qué hora abrimos, qué
 * plazas quedan y cómo va un pedido. Todo lo que dice sale de la base; si no lo
 * sabe, lo dice y da el correo.
 */

interface Mensaje {
  autor: 'cliente' | 'librero';
  texto: string;
  acciones?: { id: string; titulo: string }[];
}

const ATAJOS = [
  '¿Tenéis Niebla?',
  '¿Hasta qué hora abrís?',
  '¿Quedan plazas en la tertulia?',
  'Quiero regalar un libro'
];

const CATALOGO_COMPACTO = BOOKS.map((book) => ({
  id: book.id,
  titulo: book.title,
  autor: book.author,
  temas: book.tags.slice(0, 4)
}));

interface AsistenteProps {
  onOpenBook: (book: Book) => void;
}

export const Asistente: React.FC<AsistenteProps> = ({ onOpenBook }) => {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [visible, setVisible] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  // El botón aparece al bajar: en la portada tapaba la mitad de la portada del libro.
  useEffect(() => {
    const alBajar = () => setVisible(window.scrollY > 420);
    alBajar();
    window.addEventListener('scroll', alBajar, { passive: true });
    return () => window.removeEventListener('scroll', alBajar);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensajes, pensando, abierto]);

  const enviar = async (consulta: string) => {
    const limpio = consulta.trim();
    if (!limpio || pensando) return;

    setMensajes((prev) => [...prev, { autor: 'cliente', texto: limpio }]);
    setTexto('');
    setPensando(true);

    try {
      const res = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: limpio, catalogo: CATALOGO_COMPACTO })
      });
      const data = await res.json();
      setMensajes((prev) => [
        ...prev,
        {
          autor: 'librero',
          texto:
            data?.respuesta ||
            'No he podido consultarlo ahora mismo. Escríbenos a hola@libreriaiasalamanca.es.',
          acciones: Array.isArray(data?.acciones) ? data.acciones : []
        }
      ]);
    } catch {
      setMensajes((prev) => [
        ...prev,
        {
          autor: 'librero',
          texto: 'Se me ha ido la conexión. Llámanos al 923 21 40 14 y te lo miro en un momento.'
        }
      ]);
    } finally {
      setPensando(false);
    }
  };

  return (
    <>
      {/* Botón flotante: invisible en la portada, aparece al bajar */}
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        aria-controls="asistente-panel"
        className={`fixed bottom-5 right-4 z-[70] inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-[12.5px] font-semibold text-paper shadow-[0_14px_34px_-14px_rgba(14,14,16,0.65)] transition-all duration-300 hover:-translate-y-0.5 sm:right-6 ${
          visible || abierto ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        {abierto ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
        <span className="hidden sm:inline">{abierto ? 'Cerrar' : '¿Te ayudo?'}</span>
      </button>

      {abierto && (
        <div
          id="asistente-panel"
          role="dialog"
          aria-label="Asistente de la librería"
          className="fixed bottom-[74px] right-3 z-[70] flex max-h-[min(560px,72vh)] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-xl border border-line bg-paper shadow-[0_30px_70px_-30px_rgba(14,14,16,0.55)] animate-fade-up sm:right-6 sm:w-[368px]"
        >
          <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-bark text-[11px] font-semibold text-paper">
              L
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold leading-none text-ink">El librero de guardia</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                Responde con el fondo y la agenda reales
              </p>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 thin-scroll">
            {mensajes.length === 0 && (
              <div className="space-y-3">
                <p className="text-[12.5px] leading-relaxed text-muted-warm">
                  Hola. Puedo mirarte si tenemos un libro, los horarios, las plazas que quedan en
                  las tertulias o cómo va un pedido.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ATAJOS.map((atajo) => (
                    <button
                      key={atajo}
                      type="button"
                      onClick={() => void enviar(atajo)}
                      className="rounded-full border border-line px-2.5 py-1.5 text-[11px] text-muted-warm transition-colors hover:border-ink/25 hover:text-ink"
                    >
                      {atajo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensajes.map((mensaje, indice) => (
              <div key={indice} className={mensaje.autor === 'cliente' ? 'flex justify-end' : ''}>
                <div
                  className={
                    mensaje.autor === 'cliente'
                      ? 'max-w-[86%] rounded-xl rounded-br-sm bg-clay px-3 py-2 text-[12.5px] leading-relaxed text-white'
                      : 'max-w-full text-[12.5px] leading-relaxed text-muted-warm'
                  }
                >
                  {mensaje.texto}
                </div>

                {mensaje.acciones && mensaje.acciones.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {mensaje.acciones.map((accion) => {
                      const libro = getBook(accion.id);
                      if (!libro) return null;
                      return (
                        <li key={accion.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onOpenBook(libro);
                              setAbierto(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg border border-line p-1.5 text-left transition-colors hover:border-clay/40"
                          >
                            <BookCover book={libro} compact className="h-12 w-9 shrink-0 rounded-[2px]" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[11.5px] font-semibold text-ink">
                                {libro.title}
                              </span>
                              <span className="block truncate text-[10px] text-muted">{libro.author}</span>
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-clay" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}

            {pensando && (
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                <Loader2 className="h-3 w-3 animate-spin" /> Mirando en el mostrador…
              </p>
            )}
            <div ref={finRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void enviar(texto);
            }}
            className="flex items-center gap-2 border-t border-line px-3 py-2.5"
          >
            <input
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              maxLength={500}
              placeholder="Escribe tu pregunta…"
              aria-label="Tu pregunta"
              className="min-w-0 flex-1 bg-transparent px-1 text-[12.5px] text-ink placeholder-muted outline-none"
            />
            <button
              type="submit"
              disabled={pensando || texto.trim().length < 2}
              aria-label="Enviar"
              className="grid h-8 w-8 place-items-center rounded-lg bg-clay text-white transition-colors hover:bg-clay-deep disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
