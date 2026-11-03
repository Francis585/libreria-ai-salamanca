/**
 * Ejercita el handler de /api/resenas sin desplegar.
 *
 *   node scripts/test-resenas.mjs
 *
 * Compila api/[...route].ts con esbuild (los imports locales sin extensión no
 * los resuelve Node) y le pasa un req/res falsos, igual que hará Vercel.
 */
import { readFileSync, existsSync } from 'node:fs';
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
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    getHeader(k) {
      return this.headers[k.toLowerCase()];
    },
    end(chunk) {
      this.body += chunk ?? '';
    }
  };
  return res;
}

async function call({ method = 'GET', url, body }) {
  const res = fakeRes();
  const req = { method, url, headers: { 'x-forwarded-for': '127.0.0.1' }, query: {}, body, socket: { remoteAddress: '127.0.0.1' } };
  await handler(req, res);
  return { status: res.statusCode, json: (() => { try { return JSON.parse(res.body); } catch { return res.body; } })() };
}

const libro = 'unamuno-niebla-1914';

const lectura = await call({ url: `/api/resenas?libro=${libro}` });
console.log('GET  →', lectura.status, '| total:', lectura.json.total, '| media:', lectura.json.media?.toFixed(2));
lectura.json.resenas?.forEach((r) => console.log('       ·', r.nombre, r.valoracion, `[${r.origen}]`));

const alta = await call({
  method: 'POST',
  url: '/api/resenas',
  body: { libro_id: libro, nombre: 'Prueba Automática', valoracion: 4, texto: 'Comprobación del formulario de opiniones desde el harness.', website: '' }
});
console.log('POST →', alta.status, alta.json.ok ? '| guardada id ' + alta.json.resena?.id : '| ' + JSON.stringify(alta.json));

const tras = await call({ url: `/api/resenas?libro=${libro}` });
console.log('GET  →', tras.status, '| total:', tras.json.total, '| media:', tras.json.media?.toFixed(2));

const corta = await call({ method: 'POST', url: '/api/resenas', body: { libro_id: libro, nombre: 'X', valoracion: 4, texto: 'corto' } });
console.log('POST inválido →', corta.status, JSON.stringify(corta.json));
