import { useEffect, useState } from 'react';

/**
 * Existencias reales del servidor. Se comparten entre componentes con una
 * caché de módulo para no repetir la petición en cada tarjeta.
 */
type StockMap = Record<string, number>;

let cache: StockMap | null = null;
let inflight: Promise<StockMap> | null = null;
const listeners = new Set<(stock: StockMap) => void>();

async function load(): Promise<StockMap> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch('/api/stock')
      .then((response) => (response.ok ? response.json() : { stock: [] }))
      .then((data: { stock?: { id: string; stock: number }[] }) => {
        const map: StockMap = {};
        for (const row of data.stock ?? []) map[row.id] = Number(row.stock);
        cache = map;
        listeners.forEach((listener) => listener(map));
        return map;
      })
      .catch(() => {
        cache = {};
        return cache;
      });
  }
  return inflight;
}

export function refreshStock(): void {
  cache = null;
  inflight = null;
  void load();
}

export function useStock(): StockMap {
  const [stock, setStock] = useState<StockMap>(cache ?? {});

  useEffect(() => {
    let active = true;
    const listener = (next: StockMap) => {
      if (active) setStock(next);
    };
    listeners.add(listener);
    void load().then((next) => {
      if (active) setStock(next);
    });
    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, []);

  return stock;
}
