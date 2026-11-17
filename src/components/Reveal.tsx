import React, { useEffect, useRef, useState } from 'react';

/**
 * Aparición suave al entrar en pantalla. Se apoya en IntersectionObserver y
 * no en scroll: cero listeners, cero repintados por frame. Si el navegador no
 * lo soporta, o el lector pide menos movimiento, el contenido se muestra tal
 * cual, sin animación y sin quedarse invisible.
 */
type Props = {
  children: React.ReactNode;
  /** Retardo en ms para escalonar listas y rejillas. */
  delay?: number;
  /** Distancia inicial en px. */
  y?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article' | 'header' | 'figure';
  /** id opcional para anclas (#seccion) */
  id?: string;
  /** Atributos ARIA que se reenvían al nodo raíz. */
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
};

export const Reveal: React.FC<Props> = ({
  children,
  delay = 0,
  y = 18,
  className = '',
  as: Tag = 'div',
  id,
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    const sinMovimiento =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (sinMovimiento || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            setVisible(true);
            observador.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0 }
    );

    observador.observe(nodo);
    // Red de seguridad: el contenido nunca se queda invisible.
    const rescate = window.setTimeout(() => setVisible(true), 1600);
    return () => {
      window.clearTimeout(rescate);
      observador.disconnect();
    };
  }, []);

  return (
    <Tag
      // @ts-expect-error ref polimórfico: el nodo siempre es un HTMLElement
      ref={ref}
      id={id}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={
        {
          '--reveal-delay': `${delay}ms`,
          '--reveal-y': `${y}px`
        } as React.CSSProperties
      }
    >
      {children}
    </Tag>
  );
};
