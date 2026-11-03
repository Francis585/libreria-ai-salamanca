import React, { useEffect, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle, Clock, Loader2, MapPin, Users, X } from 'lucide-react';
import { Modal } from './Modal';

interface EventItem {
  id: string;
  day: string;
  month: string;
  weekday: string;
  title: string;
  time: string;
  location: string;
  description: string;
  speaker: string;
  plazas: number;
}

const EVENTS: EventItem[] = [
  {
    id: 'oraculo-poetico',
    day: '14',
    month: 'NOV',
    weekday: 'Jueves',
    title: 'El Oráculo: ¿puede una máquina escribir un soneto?',
    time: '19:00 h',
    location: 'Bodega de la librería · Rúa Mayor 14',
    description:
      'Demostración en directo con Elena Sotomayor: escribimos un soneto entre todos y la IA propone variantes. Después lo corregimos a mano, que es donde está la gracia.',
    speaker: 'Elena Sotomayor',
    plazas: 9
  },
  {
    id: 'club-niebla',
    day: '21',
    month: 'NOV',
    weekday: 'Jueves',
    title: 'Club de lectura: Niebla, de Unamuno',
    time: '18:30 h',
    location: 'Patio de arenisca · Café Melchor Cano',
    description:
      'Tertulia abierta sobre Augusto Pérez y su discusión con el autor. Trae el libro subrayado; el café corre de nuestra cuenta.',
    speaker: 'Bernardo Carvajal',
    plazas: 14
  },
  {
    id: 'taller-archivo',
    day: '29',
    month: 'NOV',
    weekday: 'Sábado',
    title: 'Taller: leer un incunable sin miedo',
    time: '11:00 h',
    location: 'Sala de fondo antiguo',
    description:
      'Una hora y media con guantes de algodón: abrimos la Gramática de Nebrija de 1492 y explicamos cómo se coteja un ejemplar, qué mira un bibliófilo y por qué huele así el papel.',
    speaker: 'Equipo de fondo antiguo',
    plazas: 6
  }
];

export const Events: React.FC = () => {
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [form, setForm] = useState({ name: '', email: '', seats: '1', website: '' });
  const [plazas, setPlazas] = useState<Record<string, number>>({});
  const [success, setSuccess] = useState<{ restantes: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/disponibilidad')
      .then((response) => (response.ok ? response.json() : { eventos: [] }))
      .then((data: { eventos?: { id: string; restantes: number }[] }) => {
        if (!active) return;
        const map: Record<string, number> = {};
        for (const evento of data.eventos ?? []) map[evento.id] = Number(evento.restantes);
        setPlazas(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const restantesDe = (evento: EventItem) =>
    evento.id in plazas ? plazas[evento.id] : evento.plazas;

  const open = (event: EventItem) => {
    setSelected(event);
    setSuccess(null);
    setError('');
    setForm({ name: '', email: '', seats: '1', website: '' });
  };

  const close = () => {
    setSelected(null);
    setSuccess(null);
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || sending) return;

    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'tertulia',
          referencia: selected.id,
          nombre: form.name,
          email: form.email,
          personas: Number(form.seats),
          website: form.website
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.mensaje ?? 'No hemos podido guardar la reserva. Inténtalo de nuevo.');
        if (typeof data?.plazasRestantes === 'number') {
          setPlazas((current) => ({ ...current, [selected.id]: data.plazasRestantes }));
        }
        return;
      }

      setPlazas((current) => ({ ...current, [selected.id]: Number(data.plazasRestantes) }));
      setSuccess({ restantes: Number(data.plazasRestantes) });
    } catch {
      setError('No hay conexión con la librería. Prueba otra vez en un momento.');
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-line bg-mist/60 px-3 py-2.5 text-sm outline-none focus:border-clay/60 focus:bg-paper';

  return (
    <section id="tertulias" className="scroll-mt-24 bg-parchment/60">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-24">
        <div className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-clay">Agenda de la casa</span>
            <h2 className="mt-3 font-display text-[clamp(2.2rem,4.4vw,3.4rem)] font-semibold leading-[1.02] tracking-tight text-ink">
              Tertulias y talleres
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-warm">
              Tres citas al mes, nunca más. En la bodega, en el patio o entre los incunables.
              Aforo pequeño y conversación larga.
            </p>
          </div>
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            <Calendar className="h-3.5 w-3.5 text-clay" />
            Noviembre 2026 · plazas actualizadas en vivo
          </p>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {EVENTS.map((event) => {
            const restantes = restantesDe(event);
            const completo = restantes === 0;
            return (
              <article
                key={event.id}
                className="group flex flex-col rounded-xl border border-line bg-paper p-5 transition-all hover:-translate-y-0.5 hover:border-clay/35 hover:shadow-[0_18px_36px_-28px_rgba(45,40,34,0.6)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-semibold leading-none text-ink">{event.day}</span>
                    <div className="flex flex-col">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-clay">{event.month}</span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{event.weekday}</span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-mist px-2 py-1 font-mono text-[10px] text-muted-warm">
                    <Clock className="h-3 w-3" />
                    {event.time}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-[22px] font-semibold leading-[1.15] text-ink">
                  {event.title}
                </h3>
                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-clay/70" />
                  {event.location}
                </p>
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted-warm">{event.description}</p>

                <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-4">
                  <div>
                    <p className="text-[11px] font-medium text-ink">{event.speaker}</p>
                    <p
                      className={`mt-0.5 flex items-center gap-1 font-mono text-[9.5px] ${
                        completo ? 'text-clay' : 'text-muted'
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      {completo ? 'Completo' : `${restantes} plazas libres`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => open(event)}
                    disabled={completo}
                    className="rounded-lg border border-line px-3 py-2 text-[11px] font-semibold text-ink transition-colors hover:border-clay/50 hover:bg-clay/[0.06] hover:text-clay disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {completo ? 'Sin plazas' : 'Reservar plaza'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <Modal open={Boolean(selected)} onClose={close} labelledBy="reserva-titulo" panelClassName="max-w-md">
        {selected && (
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
                <h3 className="mt-4 font-display text-2xl font-semibold text-ink">Plaza reservada</h3>
                <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-muted-warm">
                  Te esperamos el {selected.day} de {selected.month.toLowerCase()} a las {selected.time} en{' '}
                  {selected.location.split('·')[0].trim()}. Te escribimos a {form.email} con el recordatorio.
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  {success.restantes === 0
                    ? 'Última plaza de ese encuentro'
                    : `Quedan ${success.restantes} plazas`}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-6 rounded-lg bg-clay px-5 py-2.5 text-xs font-semibold text-white hover:bg-clay-deep"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-clay">
                    {selected.weekday} {selected.day} {selected.month} · {selected.time}
                  </span>
                  <h3 id="reserva-titulo" className="mt-2 pr-8 font-display text-2xl font-semibold leading-tight text-ink">
                    {selected.title}
                  </h3>
                  <p className="mt-1 text-[11.5px] text-muted">{selected.location}</p>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Nombre y apellidos</span>
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
                  <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Correo electrónico</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    placeholder="tucorreo@ejemplo.com"
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Personas</span>
                  <select
                    value={form.seats}
                    onChange={(event) => setForm({ ...form, seats: event.target.value })}
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
                      Reservando…
                    </>
                  ) : (
                    'Confirmar asistencia'
                  )}
                </button>
                <p className="text-center text-[10px] text-muted">
                  Gratis. Si no puedes venir, avísanos y liberamos la plaza.
                </p>
              </form>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
};
