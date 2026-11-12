/**
 * Trae las valoraciones reales de lectores desde Open Library.
 *
 *   node scripts/fetch-ratings.mjs            # solo las que falten
 *   node scripts/fetch-ratings.mjs --force    # rehace todo
 *
 * Open Library publica la media y el reparto de estrellas de cada obra:
 *   /works/{id}/ratings.json  → { summary: { average, count }, counts: {1..5} }
 * Son votos de personas reales, no una nota editorial. Si una obra no tiene
 * votos suficientes, se queda sin entrada y la ficha usa la nota de la casa.
 *
 * Resultado: src/data/ratings.json
 *   { "id-de-la-obra": { average, count, counts, key, source, fetched } }
 */
import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'src/data/ratings.json');
const force = process.argv.includes('--force');

const bundle = path.join(ROOT, 'tmp/ratings-bundle.mjs');
await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/data/library.ts')],
  bundle: true,
  format: 'esm',
  outfile: bundle,
  logLevel: 'error'
});
const { BOOKS } = await import(`file://${bundle.replace(/\\/g, '/')}?t=${Date.now()}`);

const UA = 'LibreriaAI-Salamanca/1.0 (demo; valoraciones)';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const normal = (s = '') =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Parecido suficiente para no coger otra obra con el mismo título. */
function pareceElMismo(titulo, candidato, autor, autoresCandidatos = []) {
  const a = normal(titulo);
  const b = normal(candidato);
  if (!a || !b) return false;
  if (b.includes(a) || a.includes(b)) return true;
  const palabras = a.split(' ').filter((p) => p.length > 3);
  const aciertos = palabras.length ? palabras.filter((p) => b.includes(p)).length / palabras.length : 0;
  if (aciertos >= 0.6) return true;
  // Título corto o traducción distinta: si el autor coincide, basta con que
  // comparta la primera palabra significativa («Alicia…» → «Alicia»).
  const apellido = normal(autor).split(' ').filter((p) => p.length > 3).pop();
  const autorCoincide = apellido && autoresCandidatos.some((n) => normal(n).includes(apellido));
  const primera = palabras[0];
  if (autorCoincide && primera && b.includes(primera)) return true;
  return false;
}

async function buscar(titulo, autor) {
  const q = `${titulo} ${autor}`;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5&fields=key,title,author_name,ratings_average,ratings_count,first_publish_year`;
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = await res.json();
  // Entre las obras con título parecido, nos quedamos con la que tenga más
  // votos: hay ediciones sueltas de la misma obra con 0 votos que si no
  // taparían a la ficha buena (p. ej. Alicia: 235 votos en una, 0 en otra).
  let mejor = null;
  for (const doc of data?.docs ?? []) {
    if (!pareceElMismo(titulo, doc.title, autor, doc.author_name || [])) continue;
    const votos = Number(doc.ratings_count ?? 0);
    if (!mejor || votos > Number(mejor.ratings_count ?? 0)) mejor = doc;
  }
  if (mejor) return mejor;
  // Traducciones: la ficha española puede no tener votos mientras la obra
  // original (misma autoría) sí. Si hay una sola candidata con votos, se usa.
  const apellido = normal(autor).split(' ').filter((p) => p.length > 3).pop();
  const conVotos = (data?.docs ?? []).filter(
    (d) => Number(d.ratings_count ?? 0) > 0 && apellido && (d.author_name || []).some((n) => normal(n).includes(apellido))
  );
  if (conVotos.length === 1) return conVotos[0];
  return null;
}

async function reparto(key) {
  const res = await fetch(`https://openlibrary.org${key}/ratings.json`, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) return null;
  const data = await res.json();
  const average = Number(data?.summary?.average ?? 0);
  const count = Number(data?.summary?.count ?? 0);
  if (!count || !average) return null;
  const counts = data?.counts ?? {};
  return {
    average: Math.round(average * 10) / 10,
    count,
    counts: {
      1: Number(counts['1'] ?? 0),
      2: Number(counts['2'] ?? 0),
      3: Number(counts['3'] ?? 0),
      4: Number(counts['4'] ?? 0),
      5: Number(counts['5'] ?? 0)
    },
    key,
    source: 'openlibrary',
    fetched: new Date().toISOString().slice(0, 10)
  };
}

const actual = force ? {} : fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const nuevas = [];
const sinDatos = [];

for (const libro of BOOKS) {
  if (!force && actual[libro.id]) {
    console.log(`· ya tenía    ${libro.id}`);
    continue;
  }
  try {
    const doc = await buscar(libro.title, libro.author);
    await dormir(350);
    if (!doc) {
      sinDatos.push(libro.id);
      console.log(`· sin obra    ${libro.id}`);
      continue;
    }
    const datos = await reparto(doc.key);
    await dormir(350);
    if (!datos) {
      sinDatos.push(libro.id);
      console.log(`· sin votos   ${libro.id}  (${doc.key})`);
      continue;
    }
    actual[libro.id] = datos;
    nuevas.push(libro.id);
    console.log(`✓ ${libro.id.padEnd(32)} ${datos.average} ★  ${datos.count} votos`);
  } catch (error) {
    console.log(`! error       ${libro.id}  ${error.message}`);
    sinDatos.push(libro.id);
    await dormir(1200);
  }
}

fs.writeFileSync(OUT, JSON.stringify(actual, null, 2) + '\n', 'utf8');
const conDatos = Object.keys(actual).length;
console.log(`\nValoraciones reales: ${conDatos}/${BOOKS.length} obras · ${nuevas.length} nuevas · ${sinDatos.length} sin datos`);
if (sinDatos.length) console.log('Sin datos:', sinDatos.join(', '));
