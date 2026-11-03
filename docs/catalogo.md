# Catálogo: 46 títulos, actualizable sin tocar código

## Qué hay ahora

| Bloque | Títulos | De dónde salen |
|---|---|---|
| Fondo histórico salmantino | 8 | `src/data/archive.ts` (1492–1612) |
| Humanismo & Ciencia | 5 | idem |
| Contemporáneo (Unamuno, Martín Gaite, ensayo IA) | 4 | `src/data/library.ts` |
| Fondo general (XIX, misterio, aventura, teatro, poesía) | 10 | `src/data/general.ts` |
| Infantil & Juvenil | 2 + 1 | `general.ts` + `catalogo.json` |
| Novedades 2025–2026 y siglo XXI | 16 | `src/data/catalogo.json` |

Total: **46 títulos**, **20 publicados en este siglo**, **10 categorías**. Todos los títulos y autores son reales y verificables; los precios y el stock son datos de la casa.

## Cómo se añade un libro en el futuro

```bash
npm run libro:add -- nuevo.json
```

El JSON debe traer `id`, `titulo`, `autor`, `anio`, `precio`, `paginas`, `categoria`, `sinopsis`, `etiquetas[]` y `claves[]`. Opcionales: `editorial`, `fecha`, `tematica`, `formato`, `valoracion`.

El script valida antes de escribir y **no escribe nada si algo falla**:

- campos obligatorios presentes;
- `id` que no exista ya (comprobado: un duplicado se rechaza);
- categoría dentro de las diez válidas;
- año entre 1450 y el año que viene.

Después: `npm run build` y desplegar. Las claves (`claves[]`) son lo que usa el Oráculo para encontrar el libro por tema, así que conviene escribir seis u ocho por título.

## Alta de stock

El catálogo vive en código; el stock vive en Postgres. Un título nuevo no se puede vender hasta que exista en la tabla `libros`:

```bash
node scripts/seed-stock.mjs   # inserta los títulos que falten, con 6 unidades
```

## Comprobado en vivo

Siete consultas contra la web desplegada, con el catálogo de 46:

| Consulta | Respuesta | Tiempo |
|---|---|---|
| un libro para mi hija de 9 años | Alicia · Pinocho (selección del fondo, sin modelo) | 0,5 s |
| algo de Isabel Allende, lo último | La hora antes del alba | 4,7 s |
| novela negra española | La bestia | 4,6 s |
| quiero leer ciencia ficción | El problema de los tres cuerpos | 3,2 s |
| misterio para el fin de semana | Espinas en el aire · El sabueso de los Baskerville | 3,2 s |
| un ensayo sobre la historia de la humanidad | Sapiens | 3,2 s |
| recetas de cocina vegana | *no hay nada de eso* | 0,1 s |

El banco de 32 casos sigue en 32/32 después de triplicar el catálogo.

## Límites

- **Precios y páginas de las novedades son estimaciones de la casa**, no datos del editor; las fechas de publicación y los títulos sí son reales (2025–2026).
- Las novedades **no tienen sinopsis editorial**: la ficha lleva una descripción propia. No se copia texto de contracubierta por derechos.
- El Oráculo solo ve 8 candidatos por consulta. Con 46 fichas eso ya importa: si el catálogo crece a cientos, hay que pasar la recuperación a embeddings.
- Las portadas son generadas; no se usa la cubierta real de ninguna edición.
