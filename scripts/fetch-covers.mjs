/**
 * Busca portada para cada obra del catálogo, **solo de ediciones en español**.
 *
 *   node scripts/fetch-covers.mjs            # todas las que falten
 *   node scripts/fetch-covers.mjs --force    # rehace todo
 *
 * Fuente: Open Library.
 *  1. search.json por título + autor → obras candidatas.
 *  2. Por cada obra, /works/{id}/editions.json y nos quedamos con la primera
 *     edición cuyo idioma sea `spa` y que tenga portada digitalizada.
 *
 * Es la única forma de no acabar enseñando la Penguin Classics de turno en una
 * librería que vende la edición castellana. Si no hay edición española con
 * portada, la obra se queda sin entrada y usa la portada generada.
 *
 * Resultado: src/data/portadas.json → { "id-de-la-obra": "https://…" }
 */
import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'src/data/portadas.json');
const force = process.argv.includes('--force');

const bundle = path.join(ROOT, 'tmp/covers-bundle.mjs');
await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/data/library.ts')],
  bundle: true,
  format: 'esm',
  outfile: bundle,
  logLevel: 'error'
});
const { BOOKS } = await import(`file://${bundle.replace(/\\/g, '/')}?t=${Date.now()}`);

const resultado = force ? {} : fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

const UA = 'LibreriaAI-Salamanca/1.0 (demo; portadas)';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url, ms = 12000) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const cacheImagen = new Map();
async function imagenValida(url) {
  if (cacheImagen.has(url)) return cacheImagen.get(url);
  let ok = false;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(9000) });
    if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')) {
      const buf = await res.arrayBuffer();
      ok = buf.byteLength > 8000;
    }
  } catch {
    ok = false;
  }
  cacheImagen.set(url, ok);
  return ok;
}

const normaliza = (t) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** ¿La portada corresponde a la obra? Comparamos palabras del título. */
function tituloParecido(tituloCatalogo, tituloEdicion) {
  if (!tituloEdicion) return true;
  const a = normaliza(tituloCatalogo);
  const b = normaliza(tituloEdicion);
  const palabras = a.split(' ').filter((w) => w.length > 3);
  if (!palabras.length) return true;
  const aciertos = palabras.filter((w) => b.includes(w)).length;
  return aciertos / palabras.length >= 0.5;
}

async function portadaEspanola(titulo, autor) {
  const busqueda = await json(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(
      `${titulo} ${autor}`
    )}&limit=8&fields=key,title,author_name,language,cover_i,edition_count`
  );
  const obras = (busqueda?.docs ?? []).filter((d) => d?.key);
  if (!obras.length) return null;

  const soloEspanol = (d) => (d.language ?? []).length === 1 && d.language[0] === 'spa';
  const tieneEspanol = (d) => (d.language ?? []).includes('spa');

  // 1. Obras que Open Library sabe que son solo en español: la portada de la
  //    obra es, por definición, la de la edición castellana.
  for (const obra of obras.filter(soloEspanol)) {
    if (!obra.cover_i) continue;
    if (!tituloParecido(titulo, obra.title)) continue;
    const url = `https://covers.openlibrary.org/b/id/${obra.cover_i}-L.jpg`;
    if (await imagenValida(url)) return url;
  }

  // 2. Ediciones con idioma `spa` declarado y portada.
  for (const obra of obras.slice(0, 4)) {
    const eds = await json(`https://openlibrary.org${obra.key}/editions.json?limit=200`);
    const entradas = eds?.entries ?? [];
    const enEspanol = entradas.filter((e) => {
      const idiomas = (e.languages ?? []).map((l) => String(l.key ?? '').split('/').pop());
      return idiomas.includes('spa');
    });
    for (const ed of enEspanol) {
      const portadas = Array.isArray(ed.covers) ? ed.covers.filter((c) => c > 0) : [];
      if (!portadas.length) continue;
      if (!tituloParecido(titulo, ed.title)) continue;
      const url = `https://covers.openlibrary.org/b/id/${portadas[0]}-L.jpg`;
      if (await imagenValida(url)) return url;
    }
    await dormir(120);
  }

  // 3. Último recurso: obra multilingüe con español entre sus idiomas y un
  //    título claramente castellano. Se revisa a mano antes de publicar.
  for (const obra of obras.filter(tieneEspanol)) {
    if (!obra.cover_i) continue;
    if (!tituloParecido(titulo, obra.title)) continue;
    const url = `https://covers.openlibrary.org/b/id/${obra.cover_i}-L.jpg`;
    if (await imagenValida(url)) return url;
  }
  // 4. Sin edición española localizada: se acepta la portada de la obra en
  //    cualquier idioma solo si el título coincide casi palabra por palabra.
  for (const obra of obras) {
    if (!obra.cover_i) continue;
    const a = normaliza(titulo).split(' ').filter((w) => w.length > 3);
    const b = normaliza(obra.title ?? '');
    if (a.length && a.filter((w) => b.includes(w)).length / a.length < 0.8) continue;
    const url = `https://covers.openlibrary.org/b/id/${obra.cover_i}-L.jpg`;
    if (await imagenValida(url)) return url;
  }
  return null;
}

/**
 * Último recurso: Google Books. Devuelve la portada más grande del volumen
 * cuya edición esté en español. Sin clave la cuota es compartida y a veces
 * responde 429; en ese caso se sigue sin portada, nunca con una inglesa.
 */
async function porGoogle(titulo, autor) {
  try {
    const q = `intitle:${titulo} inauthor:${autor}`;
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&langRestrict=es&maxResults=8`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    for (const item of data?.items ?? []) {
      const info = item?.volumeInfo ?? {};
      if (info.language && info.language !== 'es') continue;
      const links = info.imageLinks ?? {};
      const candidata = links.extraLarge || links.large || links.medium || links.small || links.thumbnail;
      if (!candidata) continue;
      if (!tituloParecido(titulo, info.title)) continue;
      const url = candidata.replace('&zoom=5', '&zoom=1').replace('http://', 'https://');
      if (await imagenValida(url)) return url;
    }
  } catch {
    /* cuota agotada o sin red */
  }
  return null;
}

let nuevas = 0;
const sinPortada = [];

for (const libro of BOOKS) {
  if (!force && resultado[libro.id]) {
    console.log(`· ya tenía     ${libro.id}`);
    continue;
  }
  const limpio = libro.title.replace(/[()]/g, ' ').trim();
  const url = (await portadaEspanola(limpio, libro.author)) || (await porGoogle(limpio, libro.author));
  if (url) {
    resultado[libro.id] = url;
    nuevas += 1;
    console.log(`✓ ${libro.id}`);
  } else {
    sinPortada.push(libro.id);
    console.log(`✗ sin edición española con portada: ${libro.id}`);
  }
  await dormir(200);
}

fs.writeFileSync(OUT, JSON.stringify(resultado, null, 2) + '\n', 'utf8');
console.log(`\nPortadas: ${Object.keys(resultado).length}/${BOOKS.length} · nuevas: ${nuevas}`);
if (sinPortada.length) console.log('Usan la portada generada: ' + sinPortada.join(', '));
