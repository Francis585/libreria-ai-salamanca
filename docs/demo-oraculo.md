# Demo A · El Oráculo que no miente (ni expulsa)

Implementación sobre la web existente de la Librería AI Salamanca. Rama
`feat/oraculo-verificado`. No toca producción.

## El problema de partida

La web prometía tres cosas que no cumplía:

1. `POST /api/ai-recommend` devolvía `{"source":"unconfigured","recommendations":[]}`:
   no había modelo conectado.
2. El respaldo del cliente puntuaba **todo al 100 %** (`Math.min(99, Math.max(68, …))`),
   así que no discriminaba nada.
3. El modelo estaba fijado a `gemini-2.5-flash`, **retirado**: aunque se hubiera
   configurado la clave, habría respondido 404.

Además, el catálogo no tiene fondo infantil ni ediciones en inglés, y el
Oráculo no sabía decirlo: se limitaba a devolver los tres libros más parecidos.

## Qué se ha construido

```
consulta
   │
   ├─ 1. recuperación léxica ponderada por IDF  (título ×3, autor ×2, keywords ×2,
   │      entidades, materia, época, sinopsis)  → 8 candidatos de 18
   ├─ 2. restricciones escuchadas              → presupuesto ("menos de 20 €"),
   │      consulta sin tema ("un regalo", "no leo nunca")
   ├─ 3. puertas cerradas con mensaje propio   → fondo infantil, ediciones en inglés
   ├─ 4. generación (Gemini) con registro      → erudito | divulgativo | llano
   └─ 5. validación                            → ids del catálogo, sin premios
          inventados, sin títulos entrecomillados que no existan
```

- **Abstención en dos puertas.** Si la cobertura léxica es baja, se responde
  "no lo tengo" sin gastar llamada (≈2 ms). Si el modelo considera que nada
  encaja, también puede abstenerse (`"abstain": true`).
- **Registro configurable.** El mismo libro explicado de tres maneras: es la
  respuesta a que la web solo hablara a un público ya iniciado.
- **Presupuesto.** "Menos de 20 €" filtra candidatos antes de que el modelo
  escriba, y el rationale puede citar el precio real.
- **Sin tema no se abandona.** "No leo nunca" o "no sé qué regalar" no
  devuelven la pregunta: se ofrecen las puertas de entrada del fondo.
- **Las ausencias se declaran.** Fondo infantil y libros en inglés se
  rechazan con un mensaje explícito, en lugar de recomendar un clásico para
  adultos a quien pide un libro para una niña de nueve años.

## Resultados medidos

`npm run eval:oraculo` — 32 consultas (16 con tema, 8 de no lector, 6 fuera de
dominio, 2 ausencias) contra el mismo módulo que sirve en producción:

| Métrica | Valor |
|---|---|
| Acierto@1 (con tema) | 100 % (16/16) |
| Acierto@3 | 100 % |
| Abstención correcta (fuera de dominio) | 100 % (6/6) |
| Consultas de no lector atendidas | 100 % (8/8) |
| Ausencias declaradas (infantil, inglés) | 100 % (2/2) |
| Legibilidad media del rationale (INFLESZ) | 64,7 |
| Latencia p50 / p95 | 2,9 s / 4,9 s |
| Coste por consulta | ~1 llamada a `gemini-3.8-flash`, < 1 000 tokens de salida |

Lectura honesta de estos números: con 18 fichas y consultas escritas por
nosotros, el 100 % es el suelo, no el techo. Lo que hay que defender en la
presentación no es el porcentaje, sino (a) que la abstención funciona y (b) que
la recuperación escala: el modelo solo ve 8 fichas, no 18, y esa capa es la que
sirve cuando el fondo real tenga miles de referencias.

## Cómo ejecutarlo

```bash
npm run dev            # web en local (sin funciones: el Oráculo cae al motor local)
npm run eval:oraculo   # banco de pruebas completo
npm run build          # comprobación de tipos + build
```

Variables: `GEMINI_API_KEY` (obligatoria), `ORACULO_MODEL` (por defecto
`gemini-3.8-flash`). En Vercel están dadas de alta **solo para `preview`**.

## Límites conocidos

- La recuperación es léxica, no vectorial. Con sinónimos muy alejados
  ("tristeza" para *Niebla*) acierta por las keywords, no por semántica real.
  Sustituirla por embeddings es el siguiente paso lógico, y el banco de pruebas
  ya está montado para medir si mejora o empeora.
- Una consulta con presupuesto pero sin tema devuelve los libros más
  asequibles, no los más adecuados: falta el dato de "para quién".
- El registro "llano" mejora la legibilidad, pero no la garantiza: conviene
  añadir un umbral automático (INFLESZ < 60 → reintentar).
- "Algo en inglés" se rechaza por coincidencia léxica baja, no por una regla
  explícita: si el catálogo tuviera una edición bilingüe, la respuesta sería
  incorrecta.
