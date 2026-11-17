import React, { useEffect, useRef, useState } from 'react';

/**
 * Cuenta desde 0 hasta el valor cuando entra en pantalla. Los valores que no
 * son números (por ejemplo «24–48 h») se pintan tal cual, sin animación.
 * Respeta prefers-reduced-motion mostrando el número final de golpe.
 */
type Props = {
  valor: number;
  /** Texto que se añade detrás del número ya formateado. */
  sufijo?: string;
  /** Texto que se antepone. */
  prefijo?: string;
  duracion?: number;
  className?: string;
};

export const CountUp: React.FC<Props> = ({
  valor,
  sufijo = '',
  prefijo = '',
  duracion = 1100,
  className = ''
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [actual, setActual] = useState(0);
  const [arrancado, setArrancado] = useState(false);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (sinMovimiento || typeof IntersectionObserver === 'undefined') {
      setActual(valor);
      setArrancado(true);
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          setArrancado(true);
          observador.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    observador.observe(nodo);
    const rescate = window.setTimeout(() => setArrancado(true), 1800);
    return () => {
      window.clearTimeout(rescate);
      observador.disconnect();
    };
  }, [valor]);

  useEffect(() => {
    if (!arrancado) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setActual(valor);
      return;
    }

    let frame = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      // Curva de salida: rápido al principio, frena al final.
      const suave = 1 - Math.pow(1 - t, 3);
      setActual(Math.round(valor * suave));
      if (t < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    // Si el navegador congela rAF (pestaña en segundo plano), fijamos el valor final.
    const remate = window.setTimeout(() => setActual(valor), duracion + 400);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(remate);
    };
  }, [arrancado, valor, duracion]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefijo}
      {actual.toLocaleString('es-ES')}
      {sufijo}
    </span>
  );
};
