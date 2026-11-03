import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Store, Truck, X } from 'lucide-react';
import type { CartLine } from './CartDrawer';
import { Modal } from './Modal';
import { refreshStock } from '../lib/useStock';

interface CheckoutModalProps {
  open: boolean;
  cart: CartLine[];
  onClose: () => void;
  onComplete: () => void;
}

type Delivery = 'recogida' | 'envio';

interface OrderResult {
  referencia: string;
  total: number;
}

const ENVIO_GRATIS_DESDE = 35;
const COSTE_ENVIO = 4.5;

const ERRORES: Record<string, string> = {
  sin_stock: 'Uno de los libros se ha quedado sin ejemplares. Revisa la cesta.',
  email_invalido: 'Ese correo no parece válido.',
  nombre_invalido: 'Escribe tu nombre completo.',
  cesta_vacia: 'La cesta está vacía.',
  demasiadas_peticiones: 'Has hecho varios intentos seguidos. Espera un minuto.',
  direccion_invalida: 'Revisa la dirección de envío.',
  cp_invalido: 'El código postal debe tener cinco cifras.',
  libro_desconocido: 'Algún libro ya no está en el catálogo.'
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ open, cart, onClose, onComplete }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    city: 'Salamanca',
    postalCode: '37002',
    notes: ''
  });
  const [honeypot, setHoneypot] = useState('');
  const [delivery, setDelivery] = useState<Delivery>('recogida');
  const [done, setDone] = useState<OrderResult | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  const subtotal = cart.reduce((sum, line) => sum + line.book.price * line.quantity, 0);
  const shipping = delivery === 'recogida' || subtotal >= ENVIO_GRATIS_DESDE ? 0 : COSTE_ENVIO;
  const total = subtotal + shipping;

  const close = () => {
    onClose();
    if (done) {
      onComplete();
      setDone(null);
      setForm({ name: '', email: '', address: '', city: 'Salamanca', postalCode: '37002', notes: '' });
      setError('');
      idempotencyKey.current = crypto.randomUUID();
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending || cart.length === 0) return;

    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.name,
          email: form.email,
          entrega: delivery,
          direccion: form.address,
          ciudad: form.city,
          cp: form.postalCode,
          notas: form.notes,
          items: cart.map((line) => ({ id: line.book.id, cantidad: line.quantity })),
          idempotencyKey: idempotencyKey.current,
          website: honeypot
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          data?.mensaje ??
            ERRORES[data?.error as string] ??
            'No hemos podido registrar el pedido. Inténtalo de nuevo en un momento.'
        );
        return;
      }

      setDone({ referencia: data.referencia, total: Number(data.total) });
      idempotencyKey.current = crypto.randomUUID();
      refreshStock();
    } catch {
      setError('No hay conexión con la librería. Comprueba tu red e inténtalo otra vez.');
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-line bg-mist/60 px-3 py-2.5 text-sm outline-none focus:border-clay/60 focus:bg-paper disabled:opacity-60';

  return (
    <Modal open={open} onClose={close} labelledBy="pedido-titulo" panelClassName="max-w-lg">
      <div className="relative max-h-[90vh] overflow-y-auto rounded-2xl bg-paper p-6 shadow-2xl thin-scroll sm:p-8">
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        {done ? (
          <div className="py-6 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
            <h3 className="mt-4 font-display text-[28px] font-semibold leading-tight text-ink">
              Pedido registrado
            </h3>
            <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-muted-warm">
              Hemos apartado tus {cart.reduce((sum, line) => sum + line.quantity, 0)} ejemplares y te
              escribimos a <span className="font-medium text-ink">{form.email}</span> para confirmar la
              entrega y el pago. Total: <strong>{done.total.toFixed(2)} €</strong>.
            </p>
            <div className="mx-auto mt-5 w-fit rounded-lg border border-line bg-mist/60 px-4 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Referencia</p>
              <p className="font-mono text-sm font-semibold tracking-wide text-ink">{done.referencia}</p>
            </div>
            <button
              type="button"
              onClick={close}
              className="mt-6 rounded-lg bg-clay px-5 py-2.5 text-xs font-semibold text-white hover:bg-clay-deep"
            >
              Volver a la librería
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <h3 id="pedido-titulo" className="font-display text-[26px] font-semibold text-ink">
                Cómo te lo hacemos llegar
              </h3>
              <p className="mt-1 text-[11.5px] text-muted">
                Reservamos los ejemplares al confirmar. El pago se cierra por correo: ahora no se cobra nada.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Forma de entrega">
              <button
                type="button"
                role="radio"
                aria-checked={delivery === 'recogida'}
                onClick={() => setDelivery('recogida')}
                className={`flex items-start gap-2 rounded-xl border p-3 text-left transition-colors ${
                  delivery === 'recogida' ? 'border-clay/60 bg-clay/[0.06]' : 'border-line hover:border-muted/40'
                }`}
              >
                <Store className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                <span>
                  <span className="block text-[12px] font-semibold text-ink">Recoger en tienda</span>
                  <span className="block text-[10.5px] text-muted">Gratis · en 2 horas</span>
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={delivery === 'envio'}
                onClick={() => setDelivery('envio')}
                className={`flex items-start gap-2 rounded-xl border p-3 text-left transition-colors ${
                  delivery === 'envio' ? 'border-clay/60 bg-clay/[0.06]' : 'border-line hover:border-muted/40'
                }`}
              >
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                <span>
                  <span className="block text-[12px] font-semibold text-ink">Enviar a casa</span>
                  <span className="block text-[10.5px] text-muted">
                    24/48 h · {subtotal >= ENVIO_GRATIS_DESDE ? 'gratis' : '4,50 €'}
                  </span>
                </span>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Nombre y apellidos</span>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Correo</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className={inputClass}
                />
              </label>
            </div>

            {delivery === 'envio' && (
              <>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Dirección</span>
                  <input
                    type="text"
                    required
                    autoComplete="street-address"
                    value={form.address}
                    onChange={(event) => setForm({ ...form, address: event.target.value })}
                    placeholder="Calle, número, piso"
                    className={inputClass}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Ciudad</span>
                    <input
                      type="text"
                      required
                      value={form.city}
                      onChange={(event) => setForm({ ...form, city: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-muted-warm">Código postal</span>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      pattern="[0-9]{5}"
                      value={form.postalCode}
                      onChange={(event) => setForm({ ...form, postalCode: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
              </>
            )}

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-muted-warm">
                Nota para el librero <span className="font-normal text-muted">(opcional)</span>
              </span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Ej. si es para regalo, lo envolvemos"
                className={`${inputClass} resize-none`}
              />
            </label>

            {/* Honeypot anti-spam */}
            <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label>
                No rellenar
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                />
              </label>
            </div>

            <div className="rounded-xl border border-line bg-mist/50 p-3.5">
              <dl className="space-y-1 text-[11.5px]">
                <div className="flex justify-between text-muted-warm">
                  <dt>{cart.reduce((sum, line) => sum + line.quantity, 0)} ejemplares</dt>
                  <dd className="font-mono tabular-nums">{subtotal.toFixed(2)} €</dd>
                </div>
                <div className="flex justify-between text-muted-warm">
                  <dt>Entrega</dt>
                  <dd className="font-mono tabular-nums">{shipping === 0 ? 'Gratis' : `${shipping.toFixed(2)} €`}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-line pt-1.5 text-ink">
                  <dt className="text-[12px] font-semibold">Total</dt>
                  <dd className="font-display text-xl font-semibold tabular-nums">{total.toFixed(2)} €</dd>
                </div>
              </dl>
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-clay/30 bg-clay/[0.07] px-3 py-2.5 text-[12px] leading-relaxed text-clay-deep"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-clay py-3 text-sm font-semibold text-paper transition-colors hover:bg-clay-deep disabled:cursor-wait disabled:opacity-70"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando el pedido…
                </>
              ) : (
                'Confirmar pedido'
              )}
            </button>
            <p className="text-center text-[10px] leading-relaxed text-muted">
              Al confirmar aceptas que te contactemos por correo. Sin pago automático ni suscripciones.
            </p>
          </form>
        )}
      </div>
    </Modal>
  );
};
