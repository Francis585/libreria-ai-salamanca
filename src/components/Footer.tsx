import React, { useState } from 'react';
import { ArrowRight, Check, Instagram, Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { SECCION_IA } from '../lib/brand';

type Estado = 'inicial' | 'enviando' | 'nuevo' | 'repetido' | 'error';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<Estado>('inicial');

  const suscribir = async (event: React.FormEvent) => {
    event.preventDefault();
    if (estado === 'enviando') return;

    setEstado('enviando');
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setEstado('error');
        return;
      }
      setEstado(data.nuevo ? 'nuevo' : 'repetido');
      setEmail('');
    } catch {
      setEstado('error');
    }
  };

  return (
    <footer className="border-t border-line bg-bark text-paper">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-10 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold font-display text-lg font-semibold text-ink">
                L
              </span>
              <span className="font-display text-xl font-semibold tracking-tight">Librería AI Salamanca</span>
            </div>
            <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-[#8b8b95]">
              Librería de fondo antiguo y narrativa viva en la Rúa Mayor. Digitalizamos lo que
              tenemos para que puedas encontrarlo mejor, pero seguimos recomendando a viva voz.
            </p>
            <div className="mt-5 space-y-2 text-[11.5px] text-[#c9c9d0]">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                Calle Rúa Mayor 14, 37002 Salamanca
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-gold" />
                923 21 40 14
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-gold" />
                hola@libreriaaisalamanca.es
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">La casa</h3>
            <ul className="mt-4 space-y-2.5 text-[12px] text-[#c9c9d0]">
              {[
                ['#catalogo', 'Catálogo completo'],
                ['#laboratorio', 'Laboratorio del fondo'],
                [SECCION_IA.href, 'El librero'],
                ['#tertulias', 'Tertulias y talleres'],
                ['#cafe', 'Café Melchor Cano']
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="transition-colors hover:text-paper">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Servicios</h3>
            <ul className="mt-4 space-y-2.5 text-[12px] text-[#c9c9d0]">
              {[
                ['Fondo antiguo y facsímiles', '#catalogo'],
                ['Búsqueda por entidades', '#laboratorio'],
                ['Encargos y novedades', '#encargos'],
                ['Club de lectura', '#tertulias'],
                ['Visitas al archivo', '#tertulias']
              ].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="transition-colors hover:text-paper">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Carta de novedades</h3>
            <p className="mt-4 text-[12px] leading-relaxed text-[#8b8b95]">
              Una recomendación cada quince días, escrita por quien la ha leído. Sin ruido.
            </p>

            {estado === 'nuevo' || estado === 'repetido' ? (
              <p className="mt-4 flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2.5 text-[11.5px] leading-relaxed text-gold">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {estado === 'nuevo'
                  ? 'Apuntado. La primera carta llega el jueves.'
                  : 'Ya estabas en la lista: no te escribimos dos veces.'}
              </p>
            ) : (
              <form onSubmit={suscribir} className="mt-4">
                <label htmlFor="newsletter-email" className="sr-only">
                  Correo electrónico
                </label>
                <div className="flex overflow-hidden rounded-lg border border-[#2a2a31] bg-bark-soft focus-within:border-gold/60">
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (estado === 'error') setEstado('inicial');
                    }}
                    placeholder="tu@correo.es"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[12px] text-paper placeholder-[#6f6f79] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={estado === 'enviando'}
                    aria-label="Suscribirme a la carta de novedades"
                    className="grid w-10 place-items-center bg-gold text-ink transition-colors hover:bg-gold-deep disabled:opacity-70"
                  >
                    {estado === 'enviando' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {estado === 'error' && (
                  <p role="alert" className="mt-2 text-[11px] text-[#ff9d8a]">
                    No se ha podido guardar. Revisa el correo o inténtalo más tarde.
                  </p>
                )}
              </form>
            )}

            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram de la librería"
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#2a2a31] text-[#c9c9d0] transition-colors hover:border-gold/50 hover:text-paper"
              >
                <Instagram className="h-3.5 w-3.5" />
              </a>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#6f6f79]">
                @libreriaaisalamanca
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[#2a2a31]/60 pt-5 text-[10.5px] text-[#8b8b95] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Librería AI Salamanca · Todos los derechos reservados</p>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#" className="transition-colors hover:text-paper">Aviso legal</a>
            <a href="#" className="transition-colors hover:text-paper">Privacidad</a>
            <a href="#" className="transition-colors hover:text-paper">Cookies</a>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#6f6f79]">Hecho en Salamanca</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
