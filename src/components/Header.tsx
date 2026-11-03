import React, { useEffect, useState } from 'react';
import { Menu, Search, ShoppingBag, Sparkles, X } from 'lucide-react';
import { SECCION_IA } from '../lib/brand';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onSearch: () => void;
}

const LINKS = [
  { href: '#catalogo', label: 'Catálogo' },
  { href: '#encargos', label: 'Encargos' },
  { href: SECCION_IA.href, label: SECCION_IA.etiqueta, accent: true },
  { href: '#tertulias', label: 'Club de lectura' }
];

export const Header: React.FC<HeaderProps> = ({ cartCount, onOpenCart, onSearch }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-line bg-paper/92 backdrop-blur-md shadow-[0_1px_0_rgba(29,27,24,0.04)]'
          : 'border-transparent bg-paper/80 backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between gap-4 px-5 lg:px-10">
        <a href="#inicio" className="group flex min-w-0 items-center gap-2.5 sm:gap-3" aria-label="Librería AI Salamanca, inicio">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-bark font-display text-lg font-semibold text-paper shadow-sm transition-colors group-hover:bg-clay sm:h-10 sm:w-10 sm:text-xl">
            L
            <span className="absolute inset-[3px] rounded-[7px] border border-paper/15" />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="whitespace-nowrap font-display text-[17px] font-semibold tracking-tight text-ink sm:text-[21px]">
              Librería AI<span className="hidden sm:inline"> Salamanca</span>
            </span>
            <span className="mt-1 hidden truncate font-mono text-[9px] uppercase tracking-[0.22em] text-muted sm:block">
              Librería online · envíos a toda España
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 text-[13px] font-medium text-muted-warm lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`relative flex items-center gap-1.5 py-2 transition-colors hover:text-ink ${
                link.accent ? 'text-clay' : ''
              }`}
            >
              {link.accent && <Sparkles className="h-3.5 w-3.5" />}
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSearch}
            className="hidden items-center gap-2 rounded-lg border border-line bg-mist/70 px-3 py-2 text-xs font-medium text-muted-warm transition-colors hover:border-line hover:bg-mist hover:text-ink sm:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Buscar en el fondo</span>
            <kbd className="ml-1 rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] text-muted">
              /
            </kbd>
          </button>

          <button
            type="button"
            onClick={onSearch}
            aria-label="Buscar en el catálogo"
            className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted-warm transition-colors hover:text-ink sm:hidden"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className="relative flex h-10 items-center gap-2 rounded-lg bg-bark px-3.5 text-paper transition-colors hover:bg-ink"
            aria-label={`Abrir la cesta, ${cartCount} artículos`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="font-mono text-xs tabular-nums">{cartCount}</span>
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold ring-2 ring-paper" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="menu-movil"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="grid h-10 w-10 place-items-center rounded-lg border border-line text-ink lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="menu-movil" className="border-t border-line bg-paper px-5 pb-5 pt-2 lg:hidden animate-fade-in">
          <nav className="flex flex-col divide-y divide-line-soft text-sm">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between py-3.5 ${link.accent ? 'text-clay' : 'text-ink'}`}
              >
                {link.label}
                <span className="font-mono text-[10px] text-muted">0{LINKS.indexOf(link) + 1}</span>
              </a>
            ))}
          </nav>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Tienda online · envíos a toda España
          </p>
        </div>
      )}
    </header>
  );
};
