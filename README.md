# Librería AI Salamanca

Web de la librería (Rúa Mayor 14, Salamanca): catálogo, búsqueda semántica sobre el
fondo, ficha con entidades y extractos, oráculo literario con IA, agenda de tertulias,
reserva del café y tienda con pedidos reales.

Reúne lo mejor de las dos versiones anteriores:

- **v1** aporta el fondo documental (obras con entidades, extractos y métricas), el motor
  de búsqueda semántica y el inspector de fichas.
- **v2** aporta el lenguaje visual (papel cálido, Cormorant + Jakarta), el oráculo IA,
  la cesta y los formularios de reserva.

## Stack

- Vite 8 + React 19 + TypeScript, Tailwind CSS v4
- Vercel: sitio estático + funciones serverless
- Neon Postgres (instalado desde el Marketplace de Vercel)
- `@neondatabase/serverless` (driver HTTP) en producción, `pg` solo para migraciones

## Datos

| Qué | Dónde |
|---|---|
| Catálogo editorial (fichas, textos, entidades) | `src/data/archive.ts` + `src/data/library.ts`, compilado en el bundle |
| Precio y stock | tabla `libros` en Neon |
| Pedidos y líneas | `pedidos` + `pedido_lineas` |
| Reservas de tertulia y café | `reservas` (aforo en `eventos`) |
| Carta de novedades | `suscriptores` |
| Cesta del visitante | `localStorage`, se reconcilia con el stock al pagar |

## API (`api/[...route].ts`)

Una sola función con enrutado interno (Vercel no empaqueta imports locales en ESM):

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/stock` | Existencias por libro |
| GET | `/api/disponibilidad` | Plazas libres por tertulia |
| POST | `/api/pedidos` | Crea el pedido, valida y descuenta stock de forma atómica |
| POST | `/api/reservas` | Reserva de tertulia (aforo real) o mesa de café |
| POST | `/api/newsletter` | Alta idempotente de correo |
| GET | `/api/admin-resumen` | Panel privado (`Authorization: Bearer ADMIN_SECRET`) |
| POST | `/api/ai-recommend` | Oráculo con Gemini (opcional) |

Detalles de implementación:

- El importe lo calcula Postgres con los precios de `libros`; el navegador no envía totales.
- `crear_pedido()` bloquea las filas (`FOR UPDATE`), comprueba stock y descuenta en una
  sola transacción: dos compras simultáneas no pueden sobregirar existencias.
- `idempotencyKey` evita pedidos duplicados al reintentar.
- Límite de peticiones por IP e instancia y honeypot en todos los formularios.
- Los errores de stock devuelven 409 con el número de ejemplares restantes.

## Variables de entorno

| Variable | Origen | Uso |
|---|---|---|
| `DATABASE_URL` | integración Neon (automática) | consultas (pooled, HTTP) |
| `DATABASE_URL_UNPOOLED` | integración Neon | migraciones |
| `ADMIN_SECRET` | manual | acceso a `/admin` y a `/api/admin-resumen` |
| `GEMINI_API_KEY` | manual, opcional | oráculo con IA real |

Para desarrollo local: `vercel env pull .env.local`. Nunca se suben al repositorio.

## Base de datos

```bash
npm run db:migrate   # aplica db/schema.sql (idempotente) y siembra libros/eventos
npm run db:reset     # borra pedidos/reservas/suscriptores de prueba y restaura stock
```

El esquema incluye tablas, índices y las funciones `crear_pedido()` y
`reservar_tertulia()`. Reejecutar el script no duplica datos ni pisa el stock.

## Panel privado

`https://libreria-ai-salamanca.vercel.app/admin` → pide el token (`ADMIN_SECRET`).
Guarda el token solo en `sessionStorage`. Muestra pedidos con sus líneas, reservas,
suscriptores, ocupación de cada tertulia y libros con tres o menos ejemplares.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000 (sin funciones: usa `vercel dev` para la API)
vercel dev         # web + funciones + .env.local
npm run build
npx tsc --noEmit
```

## Despliegue

```bash
vercel deploy --prod --yes --name libreria-ai-salamanca
```

Región de las funciones: `fra1` (junto a la base, en Fráncfort).

## Notas de contenido

Las fichas del fondo histórico provienen de v1. Los precios, el stock inicial, los
formatos y las obras contemporáneas son contenido de demostración: ajústalos en
`src/data/library.ts` y en la tabla `libros`. Los pedidos no cobran: registran la
solicitud y descuentan stock; el pago se cierra por correo.
