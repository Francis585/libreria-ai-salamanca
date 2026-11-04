/**
 * Genera una página real por cada libro y el sitemap.
 *
 *   node scripts/prerender.mjs        # se ejecuta dentro de `npm run build`
 *
 * Una tienda no puede tener las 46 fichas detrás de un modal: sin URL propia
 * no hay indexación ni enlaces compartibles. Aquí se escribe
 * `dist/libro/<id>/index.html` copiando el shell de la SPA y cambiando título,
 * descripción, Open Graph, canónica y datos estructurados de Book. Al abrirse,
 * la app lee la ruta y muestra la ficha ya abierta.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = join(root, 'dist');
const SITIO = 'https://libreria-ai-lab.vercel.app';

if (!existsSync(join(dist, 'index.html'))) {
  console.error('Falta dist/index.html: ejecuta esto después de `vite build`.');
  process.exit(1);
}

const bundle = join(root, 'tmp/prerender-books.mjs');
await esbuild.build({
  entryPoints: [join(root, 'src/data/library.ts')],
  bundle: true,
  format: 'esm',
  outfile: bundle,
  logLevel: 'error'
});
const { BOOKS } = await import(`file://${bundle.replace(/\\/g, '/')}?t=${Date.now()}`);

const shell = readFileSync(join(dist, 'index.html'), 'utf8');

const escapa = (texto = '') =>
  String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const recorta = (texto = '', max = 155) => {
  const limpio = String(texto).replace(/\s+/g, ' ').trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1).trimEnd()}…` : limpio;
};

let generadas = 0;

for (const book of BOOKS) {
  const url = `${SITIO}/libro/${book.id}`;
  const titulo = `${book.title} — ${book.author} · Librería AI Salamanca`;
  const descripcion = recorta(book.synopsis);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: { '@type': 'Person', name: book.author },
    datePublished: String(book.year),
    description: descripcion,
    inLanguage: 'es',
    numberOfPages: book.pages,
    genre: book.category,
    publisher: { '@type': 'Organization', name: 'Librería AI Salamanca' },
    offers: {
      '@type': 'Offer',
      price: book.price.toFixed(2),
      priceCurrency: 'EUR',
      availability:
        book.price > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url
    }
  };

  let html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${escapa(titulo)}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${escapa(descripcion)}" />`
    )
    .replace(
      /<meta property="og:title"[^>]*>/,
      `<meta property="og:title" content="${escapa(titulo)}" />`
    )
    .replace(
      /<meta property="og:description"[^>]*>/,
      `<meta property="og:description" content="${escapa(descripcion)}" />`
    )
    .replace(
      /<meta property="og:type"[^>]*>/,
      `<meta property="og:type" content="book" />`
    );

  // Canónica, OG de libro y datos estructurados, antes de cerrar el head
  html = html.replace(
    '</head>',
    `    <link rel="canonical" href="${url}" />
    <meta property="og:url" content="${url}" />
    <meta property="book:author" content="${escapa(book.author)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>`
  );

  const carpeta = join(dist, 'libro', book.id);
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, 'index.html'), html, 'utf8');
  generadas += 1;
}

// Sitemap: portada, catálogo y las 46 fichas
const hoy = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${SITIO}/`, prioridad: '1.0' },
  { loc: `${SITIO}/#encargos`, prioridad: '0.8' },
  ...BOOKS.map((book) => ({ loc: `${SITIO}/libro/${book.id}`, prioridad: '0.7' }))
];

writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${hoy}</lastmod><priority>${u.prioridad}</priority></url>`
  )
  .join('\n')}
</urlset>
`,
  'utf8'
);

writeFileSync(
  join(dist, 'robots.txt'),
  `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${SITIO}/sitemap.xml
`,
  'utf8'
);

console.log(`Fichas generadas: ${generadas} · sitemap con ${urls.length} URLs`);
