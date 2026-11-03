import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ShoppingBag, Truck } from 'lucide-react';
import { getBook, FEATURED_ID, type Book } from './data/library';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Oracle } from './components/Oracle';
import { Catalog } from './components/Catalog';
import { FeedNovedades } from './components/FeedNovedades';
import { Encargables } from './components/Encargables';
import { Lab } from './components/Lab';
import { Events } from './components/Events';
import { Cafe } from './components/Cafe';
import { Footer } from './components/Footer';
import { BookModal } from './components/BookModal';
import { CartDrawer, type CartLine } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';

const STORAGE_KEY = 'libreria-ai-cart-v1';

function readStoredCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry: { id?: string; quantity?: number }) => {
        const book = entry?.id ? getBook(entry.id) : undefined;
        const quantity = Number(entry?.quantity);
        return book && Number.isFinite(quantity) && quantity > 0
          ? { book, quantity: Math.min(99, Math.floor(quantity)) }
          : null;
      })
      .filter((line): line is CartLine => line !== null);
  } catch {
    return [];
  }
}

export default function App() {
  const featured = useMemo(() => getBook(FEATURED_ID) ?? getBook('unamuno-sentimiento-1912')!, []);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);

  // Recuperar cesta guardada
  useEffect(() => {
    setCart(readStoredCart());
    setHydrated(true);
  }, []);

  // Persistir cesta
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(cart.map((line) => ({ id: line.book.id, quantity: line.quantity })))
      );
    } catch {
      /* modo privado: seguimos sin persistencia */
    }
  }, [cart, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const addToCart = useCallback((book: Book) => {
    setCart((current) => {
      const existing = current.find((line) => line.book.id === book.id);
      if (existing) {
        return current.map((line) =>
          line.book.id === book.id ? { ...line, quantity: Math.min(99, line.quantity + 1) } : line
        );
      }
      return [...current, { book, quantity: 1 }];
    });
    setToast({ text: `«${book.title}» en la cesta`, id: Date.now() });
  }, []);

  const changeQuantity = useCallback((id: string, delta: number) => {
    setCart((current) =>
      current
        .map((line) =>
          line.book.id === id ? { ...line, quantity: Math.min(99, line.quantity + delta) } : line
        )
        .filter((line) => line.quantity > 0)
    );
  }, []);

  const removeLine = useCallback((id: string) => {
    setCart((current) => current.filter((line) => line.book.id !== id));
  }, []);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const focusCatalogSearch = useCallback(() => {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => document.getElementById('catalogo-busqueda')?.focus(), 420);
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a
        href="#catalogo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-bark focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-paper"
      >
        Saltar al catálogo
      </a>

      <div className="border-b border-line bg-mist/70">
        <div className="mx-auto hidden max-w-7xl items-center justify-center gap-x-5 px-5 py-2 text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-warm sm:flex lg:px-10">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Truck className="h-3 w-3 text-clay" />
            Envío gratis desde 35 €
          </span>
          <span className="h-2.5 w-px bg-line" />
          <span className="whitespace-nowrap">Recogida en tienda en 2 horas</span>
          <span className="h-2.5 w-px bg-line" />
          <span className="whitespace-nowrap">Lun–Sáb · 09:00–21:00 · Rúa Mayor 14</span>
        </div>
        <p className="flex items-center justify-center gap-1.5 whitespace-nowrap px-4 py-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-warm sm:hidden">
          <Truck className="h-2.5 w-2.5 text-clay" />
          Envío gratis desde 35 € · Recogida en 2 h
        </p>
      </div>

      <Header cartCount={cartCount} onOpenCart={() => setCartOpen(true)} onSearch={focusCatalogSearch} />

      <main>
        <Hero featured={featured} onOpenBook={setSelectedBook} onAdd={addToCart} />
        <Oracle onOpenBook={setSelectedBook} onAdd={addToCart} />
        <FeedNovedades />
        <Catalog onOpenBook={setSelectedBook} onAdd={addToCart} />
        <Encargables />
        <Lab onOpenBook={setSelectedBook} onAdd={addToCart} />
        <Events />
        <Cafe />
      </main>

      <Footer />

      <BookModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onAdd={(book) => {
          addToCart(book);
          setSelectedBook(null);
        }}
        onOpenBook={setSelectedBook}
      />

      <CartDrawer
        open={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        onQuantity={changeQuantity}
        onRemove={removeLine}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        cart={cart}
        onClose={() => setCheckoutOpen(false)}
        onComplete={() => {
          setCart([]);
          setToast({ text: 'Gracias. Te escribimos en menos de un día.', id: Date.now() });
        }}
      />

      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm items-center gap-2.5 rounded-xl border border-line bg-paper px-4 py-3 shadow-[0_18px_40px_-16px_rgba(29,27,24,0.45)] animate-fade-up sm:left-6 sm:w-auto"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600/10 text-emerald-700">
            <Check className="h-3.5 w-3.5" />
          </span>
          <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{toast.text}</p>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-bark px-2.5 py-1.5 text-[10.5px] font-semibold text-paper hover:bg-ink"
          >
            <ShoppingBag className="h-3 w-3" />
            Ver
          </button>
        </div>
      )}
    </div>
  );
}
