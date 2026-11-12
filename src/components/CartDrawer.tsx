import React from 'react';
import { BookOpen, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { Book } from '../data/library';
import { BookCover } from './BookCover';
import { Modal } from './Modal';

export interface CartLine {
  book: Book;
  quantity: number;
}

interface CartDrawerProps {
  open: boolean;
  cart: CartLine[];
  onClose: () => void;
  onQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  cart,
  onClose,
  onQuantity,
  onRemove,
  onCheckout
}) => {
  const subtotal = cart.reduce((sum, line) => sum + line.book.price * line.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 35 ? 0 : 4.5;
  const total = subtotal + shipping;
  const units = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="cesta-titulo"
      align="right"
      panelClassName="max-w-md h-full"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-clay" />
            <h2 id="cesta-titulo" className="font-display text-xl font-semibold text-ink">
              Tu cesta
            </h2>
            <span className="rounded-full bg-mist px-2 py-0.5 font-mono text-[10px] text-muted-warm">
              {units}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar cesta"
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 thin-scroll">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <BookOpen className="h-9 w-9 text-muted/50" />
              <p className="mt-4 font-display text-xl font-semibold text-ink">Todavía no hay libros</p>
              <p className="mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-muted-warm">
                Elige en el catálogo o deja que el librero te proponga tres lecturas.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-lg bg-clay px-4 py-2.5 text-xs font-semibold text-white hover:bg-clay-deep"
              >
                Seguir mirando
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {cart.map(({ book, quantity }) => (
                <li key={book.id} className="flex gap-3 rounded-xl border border-line p-3">
                  <BookCover book={book} compact className="h-[96px] w-[70px] shrink-0 rounded-[2px]" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-clay">{book.category}</p>
                    <p className="mt-0.5 font-display text-[15px] font-semibold leading-snug text-ink">
                      {book.title}
                    </p>
                    <p className="text-[11px] text-muted">{book.author}</p>

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onQuantity(book.id, -1)}
                          aria-label={`Quitar una unidad de ${book.title}`}
                          className="grid h-6 w-6 place-items-center rounded border border-line text-ink hover:bg-mist"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center font-mono text-[11px] tabular-nums">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => onQuantity(book.id, 1)}
                          aria-label={`Añadir una unidad de ${book.title}`}
                          className="grid h-6 w-6 place-items-center rounded border border-line text-ink hover:bg-mist"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(book.id)}
                          aria-label={`Quitar ${book.title} de la cesta`}
                          className="ml-1 grid h-6 w-6 place-items-center rounded text-muted hover:bg-mist hover:text-clay"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-mono text-[12px] tabular-nums text-ink">
                        {(book.price * quantity).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-line bg-mist/50 px-5 py-4">
            <dl className="space-y-1.5 text-[12px]">
              <div className="flex justify-between text-muted-warm">
                <dt>Subtotal</dt>
                <dd className="font-mono tabular-nums">{subtotal.toFixed(2)} €</dd>
              </div>
              <div className="flex justify-between text-muted-warm">
                <dt>Envío {subtotal < 35 && <span className="text-muted">(gratis desde 35 €)</span>}</dt>
                <dd className="font-mono tabular-nums">{shipping === 0 ? 'Gratis' : `${shipping.toFixed(2)} €`}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-2 text-ink">
                <dt className="text-[13px] font-semibold">Total</dt>
                <dd className="font-display text-2xl font-semibold tabular-nums">{total.toFixed(2)} €</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={onCheckout}
              className="mt-3 w-full rounded-xl bg-clay py-3 text-sm font-semibold text-paper transition-colors hover:bg-clay-deep"
            >
              Continuar con el pedido
            </button>
            <p className="mt-2 text-center text-[10px] leading-relaxed text-muted">
              Pago al confirmar disponibilidad · Devolución en 14 días
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
