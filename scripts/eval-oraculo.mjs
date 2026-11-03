/**
 * Banco de pruebas del Oráculo.
 *
 *   npm run eval:oraculo
 *
 * 30 consultas de tres tipos (con tema, de no lector, fuera de dominio) y cuatro
 * métricas: acierto@1, acierto@3, abstención correcta y legibilidad (INFLESZ).
 * El mismo módulo que sirve en producción se ejecuta aquí, sin red de por medio
 * salvo la llamada al modelo.
 */
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.eval');

/* --------------------------------------------------------------- casos */

// expect: ids aceptables (aquel que se considera correcto). null = debe abstenerse.
const CASES = [
  // --- con tema (16) ---
  { q: 'derechos de los indígenas en la conquista de América', expect: ['vitoria-relectio-1539'], kind: 'tema' },
  { q: 'la primera gramática del castellano', expect: ['nebrija-gramatica-1492'], kind: 'tema' },
  { q: 'un pícaro que sirve a muchos amos y pasa hambre', expect: ['lazarillo-tormes-1554'], kind: 'tema' },
  { q: 'brujería y superstición en el siglo XVI', expect: ['castanega-supersticiones-1529'], kind: 'tema' },
  { q: 'cómo se navegaba con astrolabio y brújula', expect: ['cortes-sphera-1551'], kind: 'tema' },
  { q: 'el cerebro y los humores, por qué somos distintos', expect: ['huarte-examen-1575'], kind: 'tema' },
  { q: 'poesía mística, la unión del alma con Dios', expect: ['sanjuan-cantico-1584', 'luis-leon-nombres-1583'], kind: 'tema' },
  { q: 'memoria de la posguerra y la infancia en Salamanca', expect: ['martin-gaite-cuarto-1978'], kind: 'tema' },
  { q: 'Unamuno y el miedo a la muerte', expect: ['unamuno-sentimiento-1912', 'unamuno-niebla-1914'], kind: 'tema' },
  { q: 'discutir con tu propio creador, ficción dentro de la ficción', expect: ['unamuno-niebla-1914'], kind: 'tema' },
  { q: 'el poder político nace del pueblo, ley natural', expect: ['suarez-tractatus-1612'], kind: 'tema' },
  { q: 'cómo escribe y traduce una inteligencia artificial', expect: ['sotomayor-algoritmos-2025', 'debaran-redes-2026'], kind: 'tema' },
  { q: 'Augusto Pérez', expect: ['unamuno-niebla-1914'], kind: 'tema' },
  { q: 'Calisto y Melibea', expect: ['celestina-rojas-1499'], kind: 'tema' },
  { q: 'fray Luis y la ribera del Tormes', expect: ['luis-leon-nombres-1583'], kind: 'tema' },
  { q: 'la universidad de Salamanca y sus bibliotecas', expect: ['usal-universidad-2023'], kind: 'tema' },

  // --- no lector / restricciones (8): no deben quedarse en blanco ---
  { q: 'no leo nunca, algo para empezar', expect: '*', kind: 'no_lector' },
  { q: 'un regalo de menos de 20 euros para mi madre', expect: '*', kind: 'no_lector' },
  { q: 'algo barato para el tren', expect: '*', kind: 'no_lector' },
  { q: 'poesía corta para leer en el café', expect: '*', kind: 'no_lector' },
  { q: 'algo que se lea en una tarde', expect: '*', kind: 'no_lector' },
  { q: 'quiero entender qué es la inteligencia artificial, sin tecnicismos', expect: '*', kind: 'no_lector' },
  { q: 'no sé qué regalar, algo bonito', expect: '*', kind: 'no_lector' },
  { q: 'un libro para leer en voz alta', expect: '*', kind: 'no_lector' },

  // --- fuera de dominio / ausencias declaradas (6) ---
  { q: 'recetas de cocina vegana', expect: null, kind: 'fuera' },
  { q: 'aprender a programar en Python', expect: null, kind: 'fuera' },
  { q: 'novela negra nórdica contemporánea', expect: null, kind: 'fuera' },
  { q: 'un libro de autoayuda para adelgazar', expect: null, kind: 'fuera' },
  { q: 'historia del fútbol español', expect: null, kind: 'fuera' },
  { q: 'un manual de fontanería', expect: null, kind: 'fuera' },

  // --- ausencias que la casa debería reconocer (2) ---
  { q: 'un libro para mi hija de 9 años', expect: null, kind: 'ausencia' },
  { q: 'algo en inglés para un turista', expect: null, kind: 'ausencia' }
];

/* ------------------------------------------------------------ métricas */

function inflesz(text) {
  const clean = text.toLowerCase().replace(/[^a-záéíóúüñ\s]/g, ' ');
  const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 5) return null;
  const syllables = words.reduce((sum, word) => {
    const groups = word.match(/[aeiouáéíóúü]+/g);
    return sum + Math.max(1, groups ? groups.length : 1);
  }, 0);
  const syllablesPer100 = (syllables / words.length) * 100;
  const wordsPerSentence = words.length / sentences;
  return 206.84 - 0.6 * syllablesPer100 - 1.02 * wordsPerSentence;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

/* ------------------------------------------------------------- ejecución */

async function main() {
  await mkdir(outDir, { recursive: true });

  // Compilamos el mismo código que va a producción.
  const [lib, api] = await Promise.all([
    build({
      entryPoints: [path.join(root, 'src/data/library.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: path.join(outDir, 'library.mjs'),
      logLevel: 'error'
    }),
    build({
      entryPoints: [path.join(root, 'api/ai-recommend.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: path.join(outDir, 'oraculo.mjs'),
      logLevel: 'error'
    })
  ]);
  void lib;
  void api;

  const { BOOKS } = await import(`file://${path.join(outDir, 'library.mjs')}?t=${Date.now()}`);
  const { default: handler } = await import(`file://${path.join(outDir, 'oraculo.mjs')}?t=${Date.now()}`);

  const catalogue = BOOKS.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    year: b.year,
    price: b.price,
    category: b.category,
    thematic: b.thematic,
    epoch: b.epoch,
    tags: b.tags,
    keywords: b.keywords,
    synopsis: b.synopsis,
    entities: b.entities
  }));

  const call = (query, mood, registro = 'divulgativo') =>
    new Promise((resolve) => {
      const started = Date.now();
      let payload = null;
      const req = { method: 'POST', body: { query, mood, registro, catalogue } };
      const res = {
        status() {
          return this;
        },
        setHeader() {
          return this;
        },
        end(body) {
          payload = JSON.parse(body);
        }
      };
      handler(req, res)
        .then(() => resolve({ payload, ms: Date.now() - started }))
        .catch((error) => resolve({ payload: { source: 'crash', message: error.message }, ms: Date.now() - started }));
    });

  const results = [];
  const started = Date.now();

  for (const testCase of CASES) {
    const { payload, ms } = await call(testCase.q, '');
    const ids = (payload?.recommendations ?? []).map((r) => r.id);
    const rationales = (payload?.recommendations ?? []).map((r) => r.rationale);
    const readabilities = rationales.map(inflesz).filter((v) => v !== null);

    let pass = false;
    if (testCase.expect === null) pass = payload?.source === 'no_match' || ids.length === 0;
    else if (testCase.expect === '*') pass = ids.length > 0;
    else pass = ids.some((id) => testCase.expect.includes(id));

    results.push({
      q: testCase.q,
      kind: testCase.kind,
      expect: testCase.expect,
      source: payload?.source,
      ids,
      titles: ids.map((id) => BOOKS.find((b) => b.id === id)?.title ?? id),
      rationales,
      readability: readabilities.length ? readabilities.reduce((a, b) => a + b, 0) / readabilities.length : null,
      pass,
      ms,
      message: payload?.message ?? null
    });

    process.stdout.write(`${pass ? '✓' : '✗'} ${testCase.q}\n`);
  }

  const byKind = (kind) => results.filter((r) => r.kind === kind);
  const topical = byKind('tema');
  const nonReader = byKind('no_lector');
  const outside = byKind('fuera');
  const absence = byKind('ausencia');

  const at1 = topical.filter((r) => r.expect !== '*' && r.expect !== null && r.expect.includes(r.ids[0])).length / topical.length;
  const at3 = topical.filter((r) => r.expect !== '*' && r.expect !== null && r.ids.some((id) => r.expect.includes(id))).length / topical.length;
  const abstention = outside.filter((r) => r.pass).length / outside.length;
  const nonReaderServed = nonReader.filter((r) => r.pass).length / nonReader.length;
  const absenceDeclared = absence.filter((r) => r.pass).length / absence.length;
  const latencies = results.map((r) => r.ms);
  const readability = results.map((r) => r.readability).filter((v) => v !== null);

  const summary = {
    casos: results.length,
    acierto_at_1: Number(at1.toFixed(3)),
    acierto_at_3: Number(at3.toFixed(3)),
    abstencion_correcta: Number(abstention.toFixed(3)),
    no_lector_atendido: Number(nonReaderServed.toFixed(3)),
    ausencia_declarada: Number(absenceDeclared.toFixed(3)),
    inflesz_medio: readability.length
      ? Number((readability.reduce((a, b) => a + b, 0) / readability.length).toFixed(1))
      : null,
    latencia_p50_ms: percentile(latencies, 50),
    latencia_p95_ms: percentile(latencies, 95),
    duracion_total_s: Number(((Date.now() - started) / 1000).toFixed(1)),
    modelo: results.find((r) => r.source === 'gemini') ? 'gemini' : 'desconocido'
  };

  await writeFile(path.join(outDir, 'results.json'), JSON.stringify({ summary, results }, null, 2), 'utf8');

  const pct = (v) => `${(v * 100).toFixed(0)} %`;
  console.log('\n—— Resumen ——');
  console.log(`Casos: ${summary.casos}`);
  console.log(`Acierto@1 (con tema): ${pct(at1)}   Acierto@3: ${pct(at3)}`);
  console.log(`Abstención correcta (fuera de dominio): ${pct(abstention)}`);
  console.log(`Consultas de no lector atendidas: ${pct(nonReaderServed)}`);
  console.log(`Ausencias declaradas (infantil/inglés): ${pct(absenceDeclared)}`);
  console.log(`Legibilidad media (INFLESZ): ${summary.inflesz_medio}`);
  console.log(`Latencia p50/p95: ${summary.latencia_p50_ms} / ${summary.latencia_p95_ms} ms`);
  console.log(`Resultados en .eval/results.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
