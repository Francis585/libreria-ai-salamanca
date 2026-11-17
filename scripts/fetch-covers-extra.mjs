/**
 * Segunda pasada de portadas, para las obras que `fetch-covers.mjs` deja sin
 * imagen. Misma regla de la casa: solo ediciones en español.
 *
 *   node scripts/fetch-covers-extra.mjs
 *
 * Qué hace distinto al script principal:
 *  1. Busca por título en español sin exigir que el autor coincida al pie de la
 *     letra (los clásicos aparecen con traductores y adaptadores en la lista de
 *     autores, y el filtro antiguo los descartaba).
 *  2. Acepta el `cover_i` de la obra encontrada y, si no lo hay, mira las
 *     ediciones de esa obra buscando una con idioma `spa` y portada.
 *  3. Verifica con una petición HEAD que la imagen existe de verdad antes de
 *     guardarla.
 *
 * Resultado: completa src/data/portadas.json (no borra lo que ya había).
 */
import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'src/data/portadas.json');
const UA = 'LibreriaAI-Salamanca/1.0 (demo; portadas)';

const bundle = path.join(ROOT, 'tmp/covers-extra-bundle.mjs');
await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/data/library.ts')],
  bundle: true,
  format: 'esm',
  outfile: bundle,
  logLevel: 'error'
});
const { BOOKS } = await import(`file://${bundle.replace(/\\/g, '/')}?t=${Date.now()}`);

const portadas = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const normal = (s = '') =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function json(url, ms = 14000) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function existeImagen(url) {
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return false;
    const tipo = res.headers.get('content-type') || '';
    if (!tipo.startsWith('image/')) return false;
    const buffer = await res.arrayBuffer();
    return buffer.byteLength > 2000;
  } catch {
    return false;
  }
}

/** Parecido de títulos: contención o mayoría de palabras significativas. */
function seParece(a, b) {
  const x = normal(a);
  const y = normal(b);
  if (!x || !y) return 0;
  if (y.includes(x) || x.includes(y)) return 1;
  const palabras = x.split(' ').filter((p) => p.length > 3);
  if (!palabras.length) return 0;
  return palabras.filter((p) => y.includes(p)).length / palabras.length;
}

const faltan = BOOKS.filter((b) => !portadas[b.id]);
console.log(`Sin portada: ${faltan.length} obras\n`);

let nuevas = 0;

for (const libro of faltan) {
  const consulta = `${libro.title} ${libro.author}`.slice(0, 120);
  const url =
    'https://openlibrary.org/search.json?q=' +
    encodeURIComponent(consulta) +
    '&language=spa&limit=8&fields=key,title,author_name,cover_i,language,first_publish_year';

  const datos = await json(url);
  const docs = (datos?.docs ?? []).filter((d) => d.cover_i || d.key);

  let elegida = null;
  let mejor = 0;
  for (const doc of docs) {
    const parecido = seParece(libro.title, doc.title);
    if (parecido < 0.6) continue;
    if (parecido > mejor) {
      mejor = parecido;
      elegida = doc;
    }
  }

  if (!elegida) {
    console.log(`✗ sin candidata      ${libro.id}`);
    await dormir(400);
    continue;
  }

  let coverId = elegida.cover_i;

  // Sin portada en la obra: mirar sus ediciones en español.
  if (!coverId && elegida.key) {
    const ediciones = await json(`https://openlibrary.org${elegida.key}/editions.json?limit=60`);
    const esp = (ediciones?.entries ?? []).filter(
      (e) => (e.languages ?? []).some((l) => (l.key ?? '').endsWith('/spa')) && e.covers?.some((c) => c > 0)
    );
    if (esp.length) coverId = esp[0].covers.find((c) => c > 0);
    await dormir(350);
  }

  if (!coverId) {
    console.log(`✗ sin imagen         ${libro.id}  (${elegida.title})`);
    await dormir(400);
    continue;
  }

  const imagen = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
  if (!(await existeImagen(imagen))) {
    console.log(`✗ imagen rota        ${libro.id}  (${coverId})`);
    await dormir(400);
    continue;
  }

  portadas[libro.id] = imagen;
  nuevas += 1;
  console.log(`✓ ${libro.id}  ← ${elegida.title} (${Math.round(mejor * 100)}%)`);
  await dormir(500);
}

fs.writeFileSync(OUT, JSON.stringify(portadas, null, 2) + '\n', 'utf8');

const total = BOOKS.filter((b) => portadas[b.id]).length;
console.log(`\nPortadas: ${total}/${BOOKS.length} · nuevas: ${nuevas}`);
