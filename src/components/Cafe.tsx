import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Coffee, Loader2, MapPin, Sun, X } from 'lucide-react';
import { Modal } from './Modal';

const HOURS = [
  ['Lunes a jueves', '09:00 – 21:00'],
  ['Viernes y sábado', '09:00 – 23:00'],
  ['Domingo', '10:00 – 20:00']
];

const MENU = [
  ['Café de origen (Etiopía, filtro)', '2,40 €'],
  ['Cortado de la casa', '1,80 €'],
  ['Infusión de hierbas del Tormes', '2,20 €'],
  ['Tarta de queso de Villamayor', '3,60 €']
];

export const Cafe: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', date: '', time: '17:00', guests: '2', website: '' });
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setOpen(false);
    setSuccess(false);
    setError('');
  };

  const today = new Date().toISOString().slice(0, 10);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'mesa',
          referencia: 'cafe',
          nombre: form.name,
          email: form.email,
          fecha: form.date,
          hora: form.time,
          personas: Number(form.guests),
          website: form.website
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          data?.mensaje ??
            {
              sin_mesas: 'Esa franja está completa. Prueba otra hora.',
              fecha_invalida: 'Elige un día entre hoy y los próximos tres meses.',
              hora_invalida: 'Esa hora no está en la carta del patio.',
              demasiadas_peticiones: 'Demasiados intentos seguidos. Espera un minuto.'
            }[data?.error as string] ??
            'No hemos podido guardar la reserva. Inténtalo de nuevo.'
        );
        return;
      }

      setSuccess(true);
    } catch {
      setError('No hay conexión con la librería. Comprueba tu red y vuelve a intentarlo.');
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-line bg-mist/60 px-3 py-2.5 text-sm outline-none focus:border-clay/60 focus:bg-paper';

  return (
    <section id="cafe" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 lg:px-10 lg:py-24">
      <div className="grid items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-clay">
            <Coffee className="h-3 w-3" />
            El patio de arenisca
          </span>
          <h2 className="mt-3 font-display text-[clamp(2.2rem,4.4vw,3.4rem)] font-semibold leading-[1.02] tracking-tight text-ink">
            Café Melchor Cano
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-warm">
            Doce mesas bajo los arcos, al fondo de la librería. Se puede leer, se puede
            callar y se puede discutir de libros, en ese orden. El café lo tostamos a
            cuatro calles de aquí.
          </p>

          <ul className="mt-7 space-y-3">
            {[
              'Café de origen y repostería artesanal de la provincia',
              'Sobres de versos en cada mesa: te llevas el que más te guste',
              'Zona interior sin música para leer de verdad',
              'Se puede reservar mesa para tertulias de hasta seis personas'
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-warm">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-7 rounded-xl border border-line bg-mist/50 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">De la pizarra</p>
            <ul className="mt-2 divide-y divide-line-soft">
              {MENU.map(([item, price]) => (
                <li key={item} className="flex items-baseline justify-between gap-4 py-1.5 text-[12px]">
                  <span className="text-muted-warm">{item}</span>
                  <span className="font-mono tabular-nums text-ink">{price}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setSuccess(false);
              setError('');
            }}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-clay-deep"
          >
            <Coffee className="h-4 w-4" />
            Reservar mesa
          </button>
        </div>

        <div className="lg:col-span-6">
          <div className="relative h-full overflow-hidden rounded-2xl bg-bark p-7 text-paper sm:p-9">
            <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-40 opacity-[0.07]"
              style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f7f7f5 0 1px, transparent 1px 34px)' }}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl font-semibold text-paper">Horario y casa</h3>
                <Sun className="h-5 w-5 text-gold" />
              </div>

              <dl className="mt-6 divide-y divide-[#2a2a31]/60">
                {HOURS.map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="text-[13px] text-[#c9c9d0]">{label}</dt>
                    <dd className="font-mono text-[12px] tabular-nums text-paper">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 space-y-3 border-t border-[#2a2a31]/60 pt-6 text-[12px] text-[#c9c9d0]">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                  Calle Rúa Mayor 14, 37002 Salamanca
                </p>
                <p className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                  Cocina hasta una hora antes del cierre
                </p>
                <p className="flex items-start gap-2">
                  <Coffee className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                  hola@libreriaaisalamanca.es · 923 21 40 14
                </p>
              </div>

              <a
                href="https://www.openstreetmap.org/search?query=R%C3%BAa%20Mayor%2014%2C%20Salamanca"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-1.5 border-b border-gold/40 pb-0.5 text-[11px] font-medium text-gold transition-colors hover:border-gold hover:text-paper"
              >
                Cómo llegar
              </a>
            </div>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={close} labelledBy="mesa-titulo" panelClassName="max-w-md">
        <div className="relative max-h-[88vh] overflow-y-auto rounded-2xl bg-paper p-6 shadow-2xl thin-scroll sm:p-7">
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>

          {success ? (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto h-11 w-11 text-emerald-600" />
              <h3 className="mt-4 font-display text-2xl font-semibold text-ink">Mesa guardada</h3>
              <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-muted-warm">
                Te esperamos el {form.date || 'día elegido'} a las {form.time} h, {form.guests}{' '}
                {form.guests === '1' ? 'persona' : 'personas'}. La reserva queda a nombre de {form.name}.
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-6 rounded-lg bg-bark px-5 py-2.5 text-xs font-semibold text-paper hover:bg-ink"
              >
                Entendido
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h3 id="mesa-titulo" className="font-display text-2xl font-semibold text-ink">
                  Reservar mesa en el patio
                </h3>
                <p className="mt-1 text-[11.5px] text-muted">
                  Hasta seis personas. Te confirmamos por correo si hay sitio.
                </p>
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Nombre</span>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Ej. Carmen Martín"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-warm">
                  Correo <span className="font-normal text-muted">(opcional)</span>
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="tucorreo@ejemplo.com"
                  className={inputClass}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Día</span>
                  <input
                    type="date"
                    required
                    min={today}
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Hora</span>
                  <select
                    value={form.time}
                    onChange={(event) => setForm({ ...form, time: event.target.value })}
                    className={inputClass}
                  >
                    {['11:00', '12:30', '17:00', '18:30', '20:00'].map((hour) => (
                      <option key={hour} value={hour}>
                        {hour} h
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Personas</span>
                <select
                  value={form.guests}
                  onChange={(event) => setForm({ ...form, guests: event.target.value })}
                  className={inputClass}
                >
                  {['1', '2', '3', '4', '5', '6'].map((value) => (
                    <option key={value} value={value}>
                      {value} {value === '1' ? 'persona' : 'personas'}
                    </option>
                  ))}
                </select>
              </label>

              <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(event) => setForm({ ...form, website: event.target.value })}
                />
              </div>

              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-clay/30 bg-clay/[0.07] px-3 py-2.5 text-[12px] text-clay-deep">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-clay py-3 text-sm font-semibold text-paper transition-colors hover:bg-clay-deep disabled:cursor-wait disabled:opacity-70"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  'Pedir mesa'
                )}
              </button>
            </form>
          )}
        </div>
      </Modal>
    </section>
  );
};
