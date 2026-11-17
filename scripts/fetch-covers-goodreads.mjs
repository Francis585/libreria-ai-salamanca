/**
 * Tercera pasada de portadas: las que Open Library no tiene, se buscan en la
 * ficha de Goodreads que ya tenemos guardada en `src/data/goodreads.json`.
 *
 *   node scripts/fetch-covers-goodreads.mjs
 *
 * Goodreads publica la portada en el `og:image` de cada ficha. Se descarga a
 * `public/portadas/{id}.jpg` (servida por la propia web, sin depender de que
 * Amazon permita el hotlink) y se apunta en `src/data/portadas.json` con la
 * ruta local. Si la imagen no se puede bajar, la obra se queda con la portada
 * generada: nunca se inventa una imagen.
 */
import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'src/data/portadas.json');
const DIR = path.join(ROOT, 'public/portadas');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const bundle = path.join(ROOT, 'tmp/covers-gr-bundle.mjs');
await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/data/library.ts')],
  bundle: true,
  format: 'esm',
  outfile: bundle,
  logLevel: 'error'
});
const { BOOKS } = await import(`file://${bundle.replace(/\\/g, '/')}?t=${Date.now()}`);

const portadas = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const goodreads = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/goodreads.json'), 'utf8'));

fs.mkdirSync(DIR, { recursive: true });

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const faltan = BOOKS.filter((b) => !portadas[b.id]);
console.log(`Sin portada: ${faltan.length} obras\n`);

let nuevas = 0;

for (const libro of faltan) {
  const ficha = goodreads[libro.id];
  if (!ficha?.url) {
    console.log(`✗ sin ficha GR       ${libro.id}`);
    continue;
  }

  try {
    const res = await fetch(ficha.url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' },
      signal: AbortSignal.timeout(20000)
    });
    if (!res.ok) {
      console.log(`✗ HTTP ${res.status}        ${libro.id}`);
      await dormir(1500);
      continue;
    }
    const html = await res.text();
    const og =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];

    if (!og) {
      console.log(`✗ sin og:image      ${libro.id}`);
      await dormir(1200);
      continue;
    }

    const limpia = og.replace(/&amp;/g, '&');
    const img = await fetch(limpia, {
      headers: { 'User-Agent': UA, Referer: 'https://www.goodreads.com/' },
      signal: AbortSignal.timeout(20000)
    });
    if (!img.ok) {
      console.log(`✗ imagen HTTP ${img.status}  ${libro.id}`);
      await dormir(1200);
      continue;
    }
    const buffer = Buffer.from(await img.arrayBuffer());
    if (buffer.byteLength < 3000) {
      console.log(`✗ imagen vacía      ${libro.id}`);
      await dormir(1200);
      continue;
    }

    const archivo = path.join(DIR, `${libro.id}.jpg`);
    fs.writeFileSync(archivo, buffer);
    portadas[libro.id] = `/portadas/${libro.id}.jpg`;
    nuevas += 1;
    console.log(`✓ ${libro.id}  (${Math.round(buffer.byteLength / 1024)} KB)`);
  } catch (error) {
    console.log(`! error             ${libro.id}  ${error.message}`);
  }
  await dormir(1200);
}

fs.writeFileSync(OUT, JSON.stringify(portadas, null, 2) + '\n', 'utf8');
const total = BOOKS.filter((b) => portadas[b.id]).length;
console.log(`\nPortadas: ${total}/${BOOKS.length} · nuevas: ${nuevas}`);
