# Librería AI Salamanca

Tienda de libros **de demostración** con IA: catálogo, buscador semántico, un librero que
recomienda con modelo de lenguaje, un asistente que responde con datos reales de la base
(stock, plazas, pedidos) y una sección de encargos que se rellena sola.

> **Proyecto de demostración.** No se realizan ventas reales: los pedidos se guardan en la
> base y el pago no está conectado. Está pensado como pieza de portfolio y como ejercicio
> de curso.

- **Web:** https://libreria-ai-lab.vercel.app
- **Código:** este repositorio · rama `main`

---

## Stack

| Capa | Tecnología |
|---|---|
| Front | Vite 8 · React 19 · TypeScript · Tailwind CSS v4 |
| Back | Funciones serverless de Vercel (`api/[...route].ts`, un único catch-all) |
| Datos | Neon Postgres (driver HTTP `@neondatabase/serverless` en producción, `pg` en scripts) |
| IA | Gemini (`gemini-3.8-flash`) con recuperación previa del catálogo |
| SEO | Página prerenderizada por libro + sitemap + robots + IndexNow |
| CI/CD | GitHub Actions: tipos, build, despliegue y aviso a buscadores en cada push |

---

## Qué hace

### Catálogo con estanterías
46 títulos propios con ficha, repartidos en tres estanterías — **Actual**, **Clásicos** y
**Fondo antiguo** — más una vista **Todo**. Solo se pintan 12 fichas por tanda: se pueden
tener cientos de libros sin que la página crezca.

### Búsqueda semántica
`src/lib/semantic.ts` expande la consulta por clústeres de conceptos (humanismo, derecho,
navegación, medicina…) y puntúa cada obra por título, autor, etiquetas, sinopsis y claves.
Funciona sin conexión y sin coste: es la red que sostiene al modelo cuando no hay clave.

### El Librero (recomendador)
Recibe una frase («poesía para una tarde de lluvia») o una materia y devuelve hasta tres
obras **del catálogo real**, con la razón de cada una. El modelo nunca inventa títulos:
recibe una lista corta de candidatos y elige entre ellos; si nada encaja, se abstiene.

### Asistente de la librería
Widget flotante que contesta lo que se pregunta por teléfono:

| Pregunta | Fuente |
|---|---|
| ¿Tenéis *Niebla*? ¿Cuántos quedan? | tabla `libros` (stock real) |
| ¿Hasta qué hora abrís? | datos de la casa |
| ¿Quedan plazas en la tertulia? | `eventos` + `reservas` en vivo |
| ¿Cómo va mi pedido? | `pedidos` con referencia + correo |

Responde solo con el contexto recuperado; si no lo sabe, lo dice y da el correo. Sin clave
de modelo cae a una plantilla con ese mismo contexto: nunca se queda en blanco.

### Opiniones
Tabla `resenas`, endpoint GET/POST con validación y límite por IP, media y distribución
calculadas, y las reseñas de la casa marcadas como tales. Cualquiera puede publicar sin
registrarse.

### Encargos automáticos
Un cron rellena 2.600 títulos de 35 editoriales españolas en castellano (originales y
traducciones), filtrando por edición en español. Se navegan por **Siglo XXI**, **Últimas
novedades** o **todo el fondo**, con precio orientativo por tramos y pedido por correo.

### SEO por libro
Cada obra tiene URL propia (`/libro/unamuno-niebla-1914`), título y descripción
específicos, canónica, Open Graph y datos estructurados `Book` con precio y
disponibilidad, generados en cada build.

---

## Automatizaciones

| Qué | Cuándo | Dónde |
|---|---|---|
| Novedades editoriales | semanal (lunes 06:00) | cron de Vercel |
| Barrido de fondo (50 editoriales, 40 años) | mensual (día 1, 04:00) | cron de Vercel |
| Precios orientativos | bajo demanda | `node scripts/precios.mjs` |
| Aviso a Bing/Yandex | cada despliegue | GitHub Action + `scripts/indexnow.mjs` |
| Tipos, build y despliegue | cada push a `main` | `.github/workflows/deploy.yml` |

---

## API (`api/[...route].ts`)

Una sola función con enrutado interno (Vercel no empaqueta imports locales en ESM):

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/stock` | Existencias por libro |
| GET | `/api/disponibilidad` | Plazas libres por tertulia |
| POST | `/api/pedidos` | Crea el pedido, valida y descuenta stock de forma atómica |
| POST | `/api/reservas` | Reserva de tertulia (aforo real) |
| POST | `/api/newsletter` | Alta idempotente de correo |
| GET | `/api/admin-resumen` | Panel privado (`Authorization: Bearer …`) |
| POST | `/api/ai-recommend` | El Librero con Gemini |
| GET | `/api/catalogo` | Fondo encargable, con búsqueda sin acentos y paginación |
| GET/POST | `/api/resenas` | Opiniones por libro y alta de una nueva |
| POST | `/api/asistente` | Asistente con stock, agenda y pedidos |
| GET/POST | `/api/novedades[-sync]` | Escaparate y sincronización con la fuente externa |

Detalles de implementación:

- El importe lo calcula Postgres con los precios de `libros`; el navegador no envía totales.
- `crear_pedido()` bloquea filas (`FOR UPDATE`), comprueba stock y descuenta en una sola
  transacción: dos compras simultáneas no pueden sobregirar existencias.
- `idempotencyKey` evita pedidos duplicados al reintentar.
- Límite de peticiones por IP e instancia y honeypot en todos los formularios.
- Los errores de stock devuelven 409 con el número de ejemplares restantes.

---

## Estructura

```
api/[...route].ts      todas las rutas de API
api/ai-recommend.ts    El Librero: recuperación + Gemini
src/data/              catálogo editorial, portadas y datos base
src/lib/               búsqueda semántica, stock, marca
src/components/        una pieza por sección de la página
scripts/               migraciones, sembrado, precios, prerender y pruebas
db/schema.sql          esquema completo, idempotente
```

## En local

```bash
npm install
cp .env.example .env.local     # DATABASE_URL, GEMINI_API_KEY, ADMIN_SECRET
npm run db:migrate             # crea las tablas en Neon
npm run dev                    # http://localhost:3000
```

Scripts útiles:

```bash
npm run build                              # vite build + prerender de 46 fichas y sitemap
npm run libro:add -- nuevo.json            # alta de un libro sin tocar código
node scripts/sync-catalogo.mjs --fondo     # rellena el fondo encargable
node scripts/precios.mjs                   # precios por tramos
node scripts/test-asistente.mjs            # prueba el asistente sin desplegar
```

## Variables de entorno

| Variable | Origen | Uso |
|---|---|---|
| `DATABASE_URL` | integración Neon (automática) | consultas (pooled, HTTP) |
| `DATABASE_URL_UNPOOLED` | integración Neon | migraciones |
| `ADMIN_SECRET` | manual | acceso a `/admin` y a `/api/admin-resumen` |
| `GEMINI_API_KEY` | manual | El Librero y el asistente |
| `ORACULO_MODEL` | manual, opcional | modelo de Gemini a usar |

---

## Decisiones que conviene poder explicar

- **Sin carrusel automático.** El destacado se elige con miniaturas y rota por día: los
  carruseles que giran solos se miran una vez y distraen.
- **Precios orientativos y marcados como tales.** El PVP real viene del distribuidor;
  presentarlo como definitivo sería un problema legal, así que la web lo dice y el correo
  pide confirmación antes de cobrar.
- **La IA no inventa.** El Librero y el asistente reciben contexto recuperado de la base y
  tienen instrucción explícita de abstenerse. Hay respaldo por plantilla.
- **Fondo antiguo aparte.** Los incunables dan identidad y SEO, pero no son escaparate:
  viven en su estantería y no compiten con lo que se vende.
- **Una sola función API.** Todo pasa por `api/[...route].ts` para evitar el problema de
  imports locales que no llegan al runtime de Vercel.

## Limitaciones conocidas

- El pago no está conectado: los pedidos quedan registrados y se confirman por correo.
- Los 2.600 encargos dependen de Open Library, que va con meses de retraso en novedades
  comerciales españolas; un lanzamiento de esta semana requiere alta manual.
- El fondo antiguo (anterior a 1800) se ofrece como consulta, no con carrito.
