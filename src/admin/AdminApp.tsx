import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  LogOut,
  Mail,
  RefreshCw,
  ShoppingBag,
  Wallet
} from 'lucide-react';

interface Pedido {
  id: number;
  referencia: string;
  nombre: string;
  email: string;
  entrega: 'recogida' | 'envio';
  ciudad: string | null;
  total: number;
  estado: string;
  creado_en: string;
  lineas: { titulo: string; cantidad: number }[];
}

interface Reserva {
  id: number;
  tipo: 'tertulia' | 'mesa';
  referencia: string;
  nombre: string;
  email: string | null;
  fecha: string | null;
  hora: string | null;
  personas: number;
  creado_en: string;
}

interface Suscriptor {
  email: string;
  creado_en: string;
}

interface Resumen {
  totales: { pedidos: number; facturado: string | number; reservas: number; suscriptores: number };
  pedidos: Pedido[];
  reservas: Reserva[];
  suscriptores: Suscriptor[];
  eventos: { id: string; plazas: number; ocupadas: number }[];
  stockBajo: { id: string; titulo: string; stock: number }[];
}

interface Correo {
  id: number;
  tipo: string;
  destinatario: string;
  asunto: string;
  estado: 'encolado' | 'enviado' | 'error' | 'simulado';
  proveedor: string | null;
  error: string | null;
  creado_en: string;
  enviado_en: string | null;
  html: string;
}

type Tab = 'pedidos' | 'reservas' | 'suscriptores' | 'stock' | 'correos';

const STORAGE_KEY = 'las-admin-token';

function fecha(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const AdminApp: React.FC = () => {
  const [token, setToken] = useState(() => sessionStorage.getItem(STORAGE_KEY) ?? '');
  const [input, setInput] = useState('');
  const [data, setData] = useState<Resumen | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('pedidos');
  const [correos, setCorreos] = useState<Correo[]>([]);
  const [correoSel, setCorreoSel] = useState<Correo | null>(null);
  const [avisoCorreo, setAvisoCorreo] = useState('');
  const [destinoPrueba, setDestinoPrueba] = useState('');
  const [ocupadoCorreo, setOcupadoCorreo] = useState(false);

  const cargar = useCallback(
    async (value: string) => {
      if (!value) return;
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/admin-resumen', {
          headers: { Authorization: `Bearer ${value}` }
        });

        if (response.status === 401) {
          sessionStorage.removeItem(STORAGE_KEY);
          setToken('');
          setData(null);
          setError('Ese token no es correcto.');
          return;
        }
        if (!response.ok) {
          setError('El servidor no ha respondido bien. Vuelve a intentarlo.');
          return;
        }

        const payload = (await response.json()) as Resumen;
        setData(payload);
        sessionStorage.setItem(STORAGE_KEY, value);
        setToken(value);
      } catch {
        setError('No hay conexión con el servidor.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (token) void cargar(token);
  }, [token, cargar]);

  const cargarCorreos = useCallback(async () => {
    if (!token) return;
    setOcupadoCorreo(true);
    try {
      const response = await fetch('/api/admin-emails', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(String(response.status));
      const payload = (await response.json()) as { correos: Correo[] };
      setCorreos(payload.correos ?? []);
      if (!correoSel && payload.correos?.length) setCorreoSel(payload.correos[0]);
    } catch {
      setAvisoCorreo('No se pudo leer la bandeja de salida.');
    } finally {
      setOcupadoCorreo(false);
    }
  }, [token, correoSel]);

  const generarPrueba = useCallback(async () => {
    if (!token || !destinoPrueba.trim()) {
      setAvisoCorreo('Escribe un correo de destino para la prueba.');
      return;
    }
    setOcupadoCorreo(true);
    setAvisoCorreo('');
    try {
      const response = await fetch('/api/emails-prueba', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: destinoPrueba.trim(), nombre: 'Prueba de la casa' })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? 'error');
      setAvisoCorreo(payload?.mensaje ?? 'Correos generados.');
      await cargarCorreos();
    } catch {
      setAvisoCorreo('No se pudieron generar los correos de prueba.');
    } finally {
      setOcupadoCorreo(false);
    }
  }, [token, destinoPrueba, cargarCorreos]);

  useEffect(() => {
    if (tab === 'correos' && token) void cargarCorreos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token]);

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
        <div className="rounded-2xl border border-line bg-paper p-7 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-bark font-display text-lg text-paper">L</span>
            <div>
              <p className="font-display text-xl font-semibold leading-none text-ink">Panel de la librería</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Acceso privado</p>
            </div>
          </div>

          <p className="mt-5 text-[12.5px] leading-relaxed text-muted-warm">
            Introduce el token de administración. Se guarda solo en esta pestaña y no viaja a ningún
            sitio que no sea este servidor.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void cargar(input.trim());
            }}
            className="mt-5 space-y-3"
          >
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Token</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="w-full rounded-lg border border-line bg-mist/60 px-3 py-2.5 font-mono text-sm outline-none focus:border-clay/60 focus:bg-paper"
              />
            </label>

            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-clay/30 bg-clay/[0.07] px-3 py-2.5 text-[12px] text-clay-deep">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-bark py-3 text-sm font-semibold text-paper hover:bg-ink disabled:opacity-70"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              Entrar
            </button>
          </form>

          <a href="/" className="mt-5 inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink">
            Volver a la web
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </main>
    );
  }

  const pedidos = data.pedidos;
  const reservas = data.reservas;
  const eventos = data.eventos;
  return (
    <div className="min-h-screen bg-mist/40">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-bark font-display text-lg text-paper">L</span>
            <div>
              <p className="font-display text-lg font-semibold leading-none text-ink">Panel de la librería</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Datos en vivo · Neon</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void cargar(token)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[11px] font-semibold text-muted-warm hover:text-ink"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem(STORAGE_KEY);
                setToken('');
                setData(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[11px] font-semibold text-muted-warm hover:text-clay"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShoppingBag, label: 'Pedidos', value: String(data.totales.pedidos ?? pedidos.length) },
            {
              icon: Wallet,
              label: 'Facturado',
              value: `${Number(data.totales.facturado ?? 0).toFixed(2)} €`
            },
            { icon: CalendarCheck, label: 'Reservas', value: String(data.totales.reservas ?? reservas.length) },
            { icon: Mail, label: 'Suscriptores', value: String(data.totales.suscriptores ?? data.suscriptores.length) }
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-line bg-paper p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">{label}</span>
                <Icon className="h-3.5 w-3.5 text-clay" />
              </div>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line no-scrollbar">
          {(
            [
              ['pedidos', `Pedidos (${pedidos.length})`],
              ['reservas', `Reservas (${reservas.length})`],
              ['suscriptores', `Suscriptores (${data.suscriptores.length})`],
              ['stock', 'Stock bajo'],
              ['correos', `Correos (${correos.length})`]
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative whitespace-nowrap px-3 py-3 text-xs font-semibold ${
                tab === key ? 'text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {label}
              {tab === key && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-clay" />}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-paper">
          {tab === 'pedidos' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[12px]">
                <thead className="bg-mist/60 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-4 py-2.5">Referencia</th>
                    <th className="px-4 py-2.5">Cliente</th>
                    <th className="px-4 py-2.5">Libros</th>
                    <th className="px-4 py-2.5">Entrega</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {pedidos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted">
                        Todavía no hay pedidos.
                      </td>
                    </tr>
                  )}
                  {pedidos.map((pedido) => (
                    <tr key={pedido.id} className="align-top">
                      <td className="px-4 py-3 font-mono text-[11px] text-ink">{pedido.referencia}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{pedido.nombre}</p>
                        <p className="text-[10.5px] text-muted">{pedido.email}</p>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-warm">
                        {pedido.lineas.map((linea) => `${linea.cantidad}× ${linea.titulo}`).join(' · ')}
                      </td>
                      <td className="px-4 py-3 text-[11px] capitalize text-muted-warm">
                        {pedido.entrega}
                        {pedido.ciudad ? ` · ${pedido.ciudad}` : ''}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[11px] tabular-nums">
                        {Number(pedido.total).toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-[10.5px] text-muted">{fecha(pedido.creado_en)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'reservas' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[12px]">
                <thead className="bg-mist/60 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-4 py-2.5">Tipo</th>
                    <th className="px-4 py-2.5">Evento / franja</th>
                    <th className="px-4 py-2.5">Persona</th>
                    <th className="px-4 py-2.5 text-right">Personas</th>
                    <th className="px-4 py-2.5">Registrada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {reservas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted">
                        Sin reservas por ahora.
                      </td>
                    </tr>
                  )}
                  {reservas.map((reserva) => (
                    <tr key={reserva.id}>
                      <td className="px-4 py-3 text-[11px] capitalize text-muted-warm">{reserva.tipo}</td>
                      <td className="px-4 py-3 text-[11px] text-ink">
                        {reserva.tipo === 'tertulia'
                          ? reserva.referencia
                          : `${reserva.fecha ?? ''} ${reserva.hora ?? ''}`}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{reserva.nombre}</p>
                        <p className="text-[10.5px] text-muted">{reserva.email ?? 'sin correo'}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{reserva.personas}</td>
                      <td className="px-4 py-3 text-[10.5px] text-muted">{fecha(reserva.creado_en)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'suscriptores' && (
            <ul className="divide-y divide-line-soft">
              {data.suscriptores.length === 0 && (
                <li className="px-4 py-10 text-center text-[12px] text-muted">Nadie apuntado todavía.</li>
              )}
              {data.suscriptores.map((suscriptor) => (
                <li key={suscriptor.email} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-[12px] text-ink">{suscriptor.email}</span>
                  <span className="font-mono text-[10px] text-muted">{fecha(suscriptor.creado_en)}</span>
                </li>
              ))}
            </ul>
          )}

          {tab === 'stock' && (
            <div className="p-4">
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                {eventos.map((evento) => (
                  <div key={evento.id} className="rounded-lg border border-line p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">{evento.id}</p>
                    <p className="mt-1 font-display text-lg font-semibold text-ink">
                      {evento.ocupadas}/{evento.plazas}
                    </p>
                    <p className="text-[10px] text-muted">plazas ocupadas</p>
                  </div>
                ))}
              </div>
              <ul className="divide-y divide-line-soft">
                {data.stockBajo.length === 0 && (
                  <li className="py-6 text-center text-[12px] text-muted">Todo el fondo tiene más de tres ejemplares.</li>
                )}
                {data.stockBajo.map((libro) => (
                  <li key={libro.id} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="flex items-center gap-2 text-[12px] text-ink">
                      <BookOpen className="h-3.5 w-3.5 text-clay" />
                      {libro.titulo}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-clay">{libro.stock} uds.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'correos' && (
            <div className="grid gap-0 lg:grid-cols-[330px_1fr]">
              <div className="border-b border-line p-4 lg:border-b-0 lg:border-r">
                <p className="text-[11px] leading-relaxed text-muted">
                  Bandeja de salida: todo correo se compone y se guarda antes de intentar enviarse. Sin
                  proveedor configurado queda como «simulado» y se lee aquí mismo.
                </p>

                <div className="mt-3 flex gap-2">
                  <input
                    value={destinoPrueba}
                    onChange={(event) => setDestinoPrueba(event.target.value)}
                    placeholder="tu@correo.com"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-[12px] text-ink outline-none focus:border-clay"
                  />
                  <button
                    type="button"
                    onClick={() => void generarPrueba()}
                    disabled={ocupadoCorreo}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[11px] font-semibold text-paper disabled:opacity-60"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Probar
                  </button>
                </div>
                {avisoCorreo && <p className="mt-2 text-[11px] leading-relaxed text-clay">{avisoCorreo}</p>}

                <ul className="mt-4 divide-y divide-line-soft">
                  {correos.length === 0 && (
                    <li className="py-6 text-center text-[12px] text-muted">Todavía no hay correos.</li>
                  )}
                  {correos.map((correo) => (
                    <li key={correo.id}>
                      <button
                        type="button"
                        onClick={() => setCorreoSel(correo)}
                        className={`w-full px-2 py-2.5 text-left ${correoSel?.id === correo.id ? 'bg-mist/60' : ''}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-semibold text-ink">{correo.asunto}</span>
                          <span
                            className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] ${
                              correo.estado === 'enviado'
                                ? 'text-emerald-700'
                                : correo.estado === 'error'
                                  ? 'text-red-700'
                                  : 'text-muted'
                            }`}
                          >
                            {correo.estado}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-muted">
                          {correo.destinatario} · {fecha(correo.creado_en)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4">
                {correoSel ? (
                  <>
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                      <span className="rounded-full border border-line px-2 py-0.5 font-mono uppercase tracking-[0.12em]">
                        {correoSel.tipo}
                      </span>
                      <span>{correoSel.destinatario}</span>
                      {correoSel.proveedor && <span>· {correoSel.proveedor}</span>}
                    </div>
                    {correoSel.error && (
                      <p className="mb-3 rounded-lg border border-line bg-mist/60 p-2 text-[11px] leading-relaxed text-muted-warm">
                        {correoSel.error}
                      </p>
                    )}
                    <iframe
                      title={`Correo ${correoSel.id}`}
                      srcDoc={correoSel.html}
                      sandbox="allow-same-origin"
                      referrerPolicy="no-referrer"
                      className="h-[540px] w-full rounded-lg border border-line bg-white"
                    />
                  </>
                ) : (
                  <p className="text-[12px] text-muted">Elige un correo de la lista para verlo.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
