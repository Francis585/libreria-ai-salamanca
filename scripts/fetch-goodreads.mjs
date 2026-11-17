/**
 * Trae valoraciones y opiniones reales de lectores desde Goodreads.
 *
 *   node scripts/fetch-goodreads.mjs             # solo lo que falte
 *   node scripts/fetch-goodreads.mjs --force     # rehace todo
 *   node scripts/fetch-goodreads.mjs --limit 5   # prueba con 5 libros
 *
 * Para cada libro del catálogo busca la ficha en Goodreads, verifica que el
 * título y el autor coincidan y guarda:
 *   src/data/goodreads.json  → media, nº de votos y enlace a la ficha
 *   src/data/resenas.json    → opiniones reales (nombre, estrellas, texto, enlace)
 *
 * No inventa nada: si un libro no aparece o no tiene opiniones, se queda sin
 * entrada y la interfaz lo dice en vez de rellenar con datos falsos.
 */
import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';

const ROOT = process.cwd();
const OUT_RATINGS = path.join(ROOT, 'src/data/goodreads.json');
const OUT_REVIEWS = path.join(ROOT, 'src/data/resenas.json');
const force = process.argv.includes('--force');
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const bundle = path.join(ROOT, 'tmp/library-bundle.mjs');
await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/data/library.ts')],
  bundle: true,
  format: 'esm',
  outfile: bundle,
  logLevel: 'error'
});
const { BOOKS } = await import(`file://${bundle.replace(/\\/g, '/')}?t=${Date.now()}`);

const normal = (s = '') =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const limpiar = (html = '') =>
  html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

async function get(url, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, {
        // Sin cabecera Accept: Goodreads entra en bucle de redirecciones si
        // se le pide HTML explícitamente. Con solo el User-Agent responde 200.
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.7'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(20000)
      });
      if (res.status === 429 || res.status === 403) {
        await dormir(4000 * (i + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (error) {
      if (i === intentos - 1) {
        const causa = error.cause ? ` (${error.cause.code || error.cause.message})` : '';
        throw new Error(`${error.message}${causa} → ${url}`);
      }
      await dormir(2500 * (i + 1));
    }
  }
  return null;
}

/** Busca la ficha de Goodreads y comprueba que sea la misma obra. */
/** Lee los resultados del buscador y se queda con la edición más votada. */
function leerResultados(html) {
  const filas = html.split('<tr itemscope').slice(1);
  const out = [];
  for (const fila of filas) {
    const hrefRaw = (fila.match(/<a class="bookTitle"[^>]*href="([^"]+)"/) || [])[1];
    if (!hrefRaw) continue;
    const tituloRaw = (fila.match(/<span itemprop='name'[^>]*>([\s\S]*?)<\/span>/) || [])[1] || '';
    const texto = fila
      .replace(/<span class="stars staticStars[^"]*">[\s\S]*?<\/span><\/span>/, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ');
    const votos = Number((texto.match(/([\d,]+)\s+ratings?/) || [])[1]?.replace(/,/g, '') || 0);
    const media = Number((texto.match(/([0-9.]+)\s+avg rating/) || [])[1] || 0);
    const href = hrefRaw.replace(/&amp;/g, '&');
    out.push({
      href: href.startsWith('http') ? href : `https://www.goodreads.com${href}`,
      title: limpiar(tituloRaw),
      votos,
      media
    });
  }
  return out;
}

async function buscar(libro) {
  const tituloBase = libro.title.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const apellido = normal(libro.author).split(' ').filter((p) => p.length > 3).pop() || '';
  const consultas = [
    `${libro.title} ${libro.author}`,
    `${tituloBase} ${apellido}`,
    tituloBase
  ];
  const tituloBuscado = normal(tituloBase);
  const palabras = tituloBuscado.split(' ').filter((p) => p.length > 3);

  for (const q of consultas) {
    const html = await get(`https://www.goodreads.com/search?q=${encodeURIComponent(q)}`);
    await dormir(700);
    if (!html) continue;
    const resultados = leerResultados(html);
    if (!resultados.length) continue;
    const candidatos = resultados
      .map((r) => {
        const t = normal(r.title);
        const coincide =
          t === tituloBuscado ||
          t.includes(tituloBuscado) ||
          tituloBuscado.includes(t) ||
          (palabras.length > 1 && palabras.every((p) => t.includes(p)));
        return { ...r, coincide };
      })
      .filter((r) => r.coincide)
      .sort((a, b) => b.votos - a.votos);
    if (candidatos.length) return candidatos[0];
    // Sin coincidencia de título pero solo hay un resultado: se acepta.
    if (resultados.length === 1) return resultados[0];
  }
  return null;
}

/** Extrae media, votos y opiniones de la ficha. */
function parsear(html, href) {
  const media = Number((html.match(/"averageRating":([0-9.]+)/) || [])[1] || 0);
  const votos = Number((html.match(/"ratingsCount":([0-9]+)/) || [])[1] || 0);
  const opiniones = [];
  const trozos = html.split('<article class="ReviewCard"').slice(1);
  for (const trozo of trozos.slice(0, 12)) {
    const articulo = trozo.slice(0, trozo.indexOf('</article>') + 10);
    const nombre = (articulo.match(/aria-label="Review by ([^"]+)"/) || [])[1];
    const estrellas = Number((articulo.match(/aria-label="Rating ([0-9]) out of 5"/) || [])[1] || 0);
    const textoRaw = (articulo.match(/data-testid="contentContainer"[^>]*>([\s\S]*?)<\/div>/) || [])[1];
    const texto = limpiar(textoRaw);
    const enlace = (articulo.match(/href="(\/review\/show\/[^"]+)"/) || [])[1];
    const fecha = (articulo.match(/<span class="Text Text__body3[^"]*">([^<]*\d{4}[^<]*)<\/span>/) || [])[1];
    if (!texto || texto.length < 40) continue;
    if (texto.length > 1200) continue;
    opiniones.push({
      nombre: nombre ? limpiar(nombre) : 'Lector de Goodreads',
      estrellas: estrellas || null,
      texto,
      fecha: fecha ? limpiar(fecha) : null,
      enlace: enlace ? `https://www.goodreads.com${enlace}` : null
    });
  }
  return {
    average: Math.round(media * 10) / 10,
    count: votos,
    url: href.startsWith('http') ? href : `https://www.goodreads.com${href}`,
    source: 'goodreads',
    fetched: new Date().toISOString().slice(0, 10),
    opiniones
  };
}

const ratings = force ? {} : fs.existsSync(OUT_RATINGS) ? JSON.parse(fs.readFileSync(OUT_RATINGS, 'utf8')) : {};
const reviews = force ? {} : fs.existsSync(OUT_REVIEWS) ? JSON.parse(fs.readFileSync(OUT_REVIEWS, 'utf8')) : {};

let hechos = 0;
let sinFicha = [];
let sinOpiniones = [];

for (const libro of BOOKS) {
  if (hechos >= limit) break;
  if (!force && ratings[libro.id] && ratings[libro.id].count > 0) {
    console.log(`· ya tenía    ${libro.id}`);
    continue;
  }
  try {
    const resultado = await buscar(libro);
    await dormir(900);
    if (!resultado) {
      sinFicha.push(libro.id);
      console.log(`· sin ficha   ${libro.id}`);
      continue;
    }
    const html = await get(resultado.href);
    await dormir(900);
    if (!html) {
      sinFicha.push(libro.id);
      console.log(`· sin HTML    ${libro.id}`);
      continue;
    }
    const datos = parsear(html, resultado.href);
    if (!datos.count) {
      sinFicha.push(libro.id);
      console.log(`· sin votos   ${libro.id}`);
      continue;
    }
    ratings[libro.id] = {
      average: datos.average,
      count: datos.count,
      url: datos.url,
      source: datos.source,
      fetched: datos.fetched
    };
    if (datos.opiniones.length) {
      reviews[libro.id] = datos.opiniones;
    } else {
      sinOpiniones.push(libro.id);
    }
    hechos++;
    // Se guarda tras cada libro: si el proceso se corta, no se pierde el trabajo.
    fs.writeFileSync(OUT_RATINGS, JSON.stringify(ratings, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_REVIEWS, JSON.stringify(reviews, null, 2) + '\n', 'utf8');
    console.log(
      `✓ ${libro.id.padEnd(30)} ${datos.average} ★  ${datos.count} votos  ${datos.opiniones.length} opiniones`
    );
  } catch (error) {
    console.log(`! error       ${libro.id}  ${error.message}`);
    await dormir(3000);
  }
}

fs.writeFileSync(OUT_RATINGS, JSON.stringify(ratings, null, 2) + '\n', 'utf8');
fs.writeFileSync(OUT_REVIEWS, JSON.stringify(reviews, null, 2) + '\n', 'utf8');

const conDatos = Object.keys(ratings).filter((k) => ratings[k].count > 0).length;
const totalOpiniones = Object.values(reviews).reduce((a, r) => a + r.length, 0);
console.log(`\nGoodreads: ${conDatos}/${BOOKS.length} obras · ${totalOpiniones} opiniones reales`);
if (sinFicha.length) console.log('Sin ficha/votos:', sinFicha.join(', '));
if (sinOpiniones.length) console.log('Sin opiniones:', sinOpiniones.join(', '));
