/**
 * Pruebas del correo transaccional.
 *
 *   npm run test:correos
 *
 * Ocho comprobaciones sobre el handler real, con SMTP local que captura los
 * mensajes (sin Gmail, sin Resend, sin salir a internet). Cada prueba deja la
 * base como estaba: borra sus reservas, suscriptores y correos.
 */
import { build } from 'esbuild';
import { SMTPServer } from 'smtp-server';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.eval');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

for (const line of readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

/* ------------------------------------------------------- SMTP de captura */

const PUERTO = 2527;
const capturados = [];

const servidor = new SMTPServer({
  authOptional: true,
  hideSTARTTLS: true,
  disabledCommands: ['STARTTLS'],
  onAuth: (auth, session, callback) => callback(null, { user: auth.username }),
  onData(stream, session, callback) {
    let bruto = '';
    stream.on('data', (trozo) => (bruto += trozo.toString('utf8')));
    stream.on('end', () => {
      capturados.push({ de: session.envelope.mailFrom?.address, para: session.envelope.rcptTo.map((r) => r.address), bruto });
      callback();
    });
  }
});

await new Promise((resolve) => servidor.listen(PUERTO, '127.0.0.1', resolve));

const base = {
  GMAIL_USER: 'prueba@libreria.local',
  GMAIL_APP_PASSWORD: 'falsa',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: String(PUERTO),
  ADMIN_SECRET: process.env.ADMIN_SECRET || 'secreto-de-prueba'
};
Object.assign(process.env, base);
delete process.env.RESEND_API_KEY;

await build({
  entryPoints: [path.join(root, 'api/[...route].ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(outDir, 'api-test.mjs'),
  external: ['nodemailer', '@neondatabase/serverless', 'node:crypto'],
  logLevel: 'error'
});

const { default: handler } = await import(`file://${path.join(outDir, 'api-test.mjs')}?t=${Date.now()}`);

const llamar = (metodo, url, cuerpo) =>
  new Promise((resolve) => {
    let salida = '';
    const req = {
      method: metodo,
      url,
      headers: { authorization: `Bearer ${process.env.ADMIN_SECRET}`, host: 'localhost' },
      body: cuerpo,
      socket: { remoteAddress: '127.0.0.1' }
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      setHeader() { return this; },
      end(payload) { salida = payload ?? ''; resolve({ status: this.statusCode, body: salida }); }
    };
    handler(req, res).catch((e) => resolve({ status: 500, body: JSON.stringify({ error: e.message }) }));
  });

const db = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL });
await db.connect();

const resultados = [];
const comprobar = (nombre, condicion, detalle = '') => {
  resultados.push({ nombre, ok: Boolean(condicion), detalle });
  console.log(`${condicion ? '✓' : '✗'} ${nombre}${detalle && !condicion ? ` — ${detalle}` : ''}`);
};

const correos = async (destino) =>
  (await db.query(`select * from outbox where destinatario = $1 order by id desc`, [destino])).rows;

const limpiar = async (email, nombre) => {
  await db.query(`delete from reservas where nombre = $1`, [nombre]);
  await db.query(`delete from suscriptores where email = $1`, [email]);
  await db.query(`delete from outbox where destinatario = $1`, [email]);
};

/* ------------------------------------------------------------- pruebas */

const email = 'pruebas-correo@libreria.local';
const nombre = 'Prueba Automatizada';
await limpiar(email, nombre);

// 1 · reserva de tertulia
const plazasAntes = Number((await db.query(`select plazas from eventos where id = 'oraculo-poetico'`)).rows[0].plazas);
const reserva = await llamar('POST', '/api/reservas', {
  tipo: 'tertulia', referencia: 'oraculo-poetico', nombre, email, personas: 2, website: ''
});
const [correoTertulia] = await correos(email);
comprobar('1. La reserva de tertulia responde 201', reserva.status === 201, `status ${reserva.status}`);
comprobar('2. Genera un correo para el destinatario', Boolean(correoTertulia), 'no hay fila en outbox');
comprobar(
  '3. El correo dice las plazas que quedan de verdad',
  correoTertulia?.html?.includes(`Quedan ${plazasAntes - 2} `),
  `esperaba "Quedan ${plazasAntes - 2}"`
);
comprobar(
  '4. El asunto lleva el título del encuentro',
  correoTertulia?.asunto?.includes('El Oráculo'),
  correoTertulia?.asunto
);

// 5 · reserva de mesa
await llamar('POST', '/api/reservas', {
  tipo: 'mesa', nombre, email, fecha: '2026-11-21', hora: '18:30', personas: 2, website: ''
});
const correosMesa = await correos(email);
const correoMesa = correosMesa.find((c) => c.tipo === 'reserva_mesa');
comprobar('5. La reserva de mesa genera su correo con fecha y hora', Boolean(correoMesa) && correoMesa.asunto.includes('18:30'));

// 6 · honeypot: no debe generar nada
const antes = (await correos(email)).length;
await llamar('POST', '/api/reservas', {
  tipo: 'tertulia', referencia: 'club-niebla', nombre, email, personas: 1, website: 'http://spam.example'
});
comprobar('6. El honeypot no genera correo', (await correos(email)).length === antes, 'se generó un correo a un bot');

// 7 · email inválido
const invalido = await llamar('POST', '/api/reservas', { tipo: 'tertulia', referencia: 'club-niebla', nombre, email: 'no-es-un-correo', personas: 1 });
comprobar('7. Un email mal formado se rechaza con 400', invalido.status === 400, `status ${invalido.status}`);

// 8 · entrega por SMTP y HTML sano
await new Promise((resolve) => setTimeout(resolve, 2000));
const final = await correos(email);
const enviadosGmail = final.filter((c) => c.estado === 'enviado' && c.proveedor === 'smtp').length;
const html = final.map((c) => c.html).join('\n');
comprobar('8. Los correos quedan en estado enviado por smtp', enviadosGmail >= 2, `${enviadosGmail} enviados de ${final.length}`);
comprobar('9. El HTML no tiene marcadores sin sustituir', !/\{\{|\}\}|undefined|\[object Object\]/.test(html));
comprobar('10. El HTML lleva la dirección de la librería', html.includes('Rúa Mayor 14'));
comprobar('11. Cada correo tiene versión en texto plano', final.every((c) => (c.texto ?? '').length > 40));
comprobar(
  '12. El SMTP local recibió los mensajes con multipart',
  capturados.length >= 2 && capturados.every((m) => m.bruto.includes('multipart/alternative')),
  `${capturados.length} capturados`
);

// 13 · sin proveedor, el correo queda 'simulado'
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;
delete process.env.GMAIL_USER;
delete process.env.GMAIL_APP_PASSWORD;
const sinProveedor = await llamar('POST', '/api/emails-prueba', { email, nombre });
const simulados = (await correos(email)).filter((c) => c.estado === 'simulado').length;
comprobar('13. Sin proveedor queda en simulado', sinProveedor.status === 201 && simulados >= 3, `${simulados} simulados`);

await limpiar(email, nombre);
await db.end();
servidor.close();

const ok = resultados.filter((r) => r.ok).length;
console.log(`\nResultado: ${ok}/${resultados.length} comprobaciones correctas`);
process.exit(ok === resultados.length ? 0 : 1);
