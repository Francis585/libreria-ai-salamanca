import React, { useEffect, useRef } from 'react';

/**
 * Hilo de progreso de lectura en el borde superior. Un solo listener de scroll
 * con rAF: no bloquea el hilo ni dispara repintados fuera de frame. En móvil
 * también funciona porque se mide el documento, no el viewport.
 */
export const ReadProgress: React.FC = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const barra = ref.current;
    if (!barra) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let pendiente = false;
    let ultimo = 0;

    const pintar = () => {
      pendiente = false;
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      const avance = alto > 0 ? Math.min(1, Math.max(0, window.scrollY / alto)) : 0;
      // Solo escribimos si cambia de verdad (evita repintados inútiles).
      if (Math.abs(avance - ultimo) < 0.002) return;
      ultimo = avance;
      barra.style.setProperty('--read-progress', avance.toFixed(4));
      barra.style.opacity = avance > 0.005 ? '1' : '0';
    };

    const alScroll = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(pintar);
    };

    pintar();
    window.addEventListener('scroll', alScroll, { passive: true });
    window.addEventListener('resize', alScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', alScroll);
      window.removeEventListener('resize', alScroll);
    };
  }, []);

  return <div ref={ref} className="read-progress" aria-hidden="true" />;
};
