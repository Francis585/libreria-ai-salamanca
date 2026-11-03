/**
 * Prueba el asistente del mostrador sin desplegar.
 *
 *   node scripts/test-asistente.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const carga = (ruta) => {
  if (!existsSync(ruta)) return;
  for (const line of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
};
carga(resolve(root, '.env.local'));
carga(process.env.HERMES_ENV || 'C:/Users/Usuario/AppData/Local/hermes/.env');

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

async function preguntar(mensaje, extra = {}) {
  const res = fakeRes();
  await handler(
    {
      method: 'POST',
      url: '/api/asistente',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      query: {},
      body: JSON.stringify({ mensaje, ...extra }),
      socket: { remoteAddress: '127.0.0.1' }
    },
    res
  );
  const data = JSON.parse(res.body || '{}');
  console.log(`\n> ${mensaje}`);
  console.log(`  [${data.fuente}] ${data.respuesta}`);
  if (data.acciones?.length) console.log('  fichas:', data.acciones.map((a) => a.titulo).join(' · '));
}

console.log('clave de modelo:', process.env.GEMINI_API_KEY ? 'sí' : 'no (usará plantilla)');
console.log('modelo:', process.env.ORACULO_MODEL || 'gemini-2.5-flash');

await preguntar('¿Tenéis Niebla? ¿Cuántos ejemplares quedan?');
await preguntar('¿Hasta qué hora abrís los sábados?');
await preguntar('¿Quedan plazas para la tertulia de Unamuno?');
await preguntar('Quiero regalar algo de Salamanca que no sea muy largo');
await preguntar('¿Dónde está mi pedido?');
