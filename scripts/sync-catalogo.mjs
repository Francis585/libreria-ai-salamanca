/**
 * Rellena el catálogo encargable sin esperar al cron.
 *
 *   node scripts/sync-catalogo.mjs            # novedades (dos últimos años)
 *   node scripts/sync-catalogo.mjs --fondo    # barrido de fondo (25 años)
 *
 * Llama al mismo handler que usa Vercel, con la cabecera de cron, así que lo
 * que se prueba aquí es exactamente lo que correrá en producción.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const out = resolve(root, 'tmp/handler.mjs');
await esbuild.build({
  entryPoints: [resolve(root, 'api/[...route].ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
  external: ['@neondatabase/serverless', 'pg', 'nodemailer', 'node:*'],
  logLevel: 'error'
});
const { default: handler } = await import(`file://${out.replace(/\\/g, '/')}?t=${Date.now()}`);

function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    status(c) { this.statusCode = c; return this; },
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(chunk) { this.body += chunk ?? ''; }
  };
}

const fondo = process.argv.includes('--fondo');
const res = fakeRes();
await handler(
  {
    method: 'GET',
    url: `/api/novedades-sync${fondo ? '?modo=fondo' : ''}`,
    headers: { 'x-vercel-cron': '1' },
    query: {},
    socket: { remoteAddress: '127.0.0.1' }
  },
  res
);

console.log(res.statusCode, res.body.slice(0, 400));

const lectura = fakeRes();
await handler({ method: 'GET', url: '/api/catalogo?limite=5', headers: {}, query: {}, socket: {} }, lectura);
const data = JSON.parse(lectura.body);
console.log(`catálogo: ${data.total} títulos · ${data.editoriales} editoriales · ${data.paginas} páginas`);
data.libros.forEach((l) => console.log('  ·', l.anio ?? '—', l.titulo, '|', l.autor, '|', l.editorial));
