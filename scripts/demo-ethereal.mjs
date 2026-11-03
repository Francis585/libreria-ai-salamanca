/**
 * Demostración de envío real sin cuenta ni credenciales.
 *
 * 1. Compone los tres correos con el handler de producción (quedan en outbox).
 * 2. Crea una cuenta Efímera de Ethereal (sin registro) y envía por SMTP real.
 * 3. Imprime el enlace público donde se ve cada correo tal cual se renderiza.
 *
 *   node scripts/demo-ethereal.mjs
 */
import { build } from 'esbuild';
import nodemailer from 'nodemailer';
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

// Sin proveedor: los correos quedan compuestos y legibles en outbox.
delete process.env.RESEND_API_KEY;
delete process.env.GMAIL_APP_PASSWORD;
delete process.env.GMAIL_USER;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;
process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || 'secreto-de-prueba';

await build({
  entryPoints: [path.join(root, 'api/[...route].ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(outDir, 'api-demo.mjs'),
  external: ['nodemailer', '@neondatabase/serverless', 'node:crypto'],
  logLevel: 'error'
});

const { default: handler } = await import(`file://${path.join(outDir, 'api-demo.mjs')}?t=${Date.now()}`);

const llamar = (metodo, url, cuerpo) =>
  new Promise((resolve) => {
    let salida = '';
    const req = { method: metodo, url, headers: { authorization: `Bearer ${process.env.ADMIN_SECRET}`, host: 'localhost' }, body: cuerpo, socket: { remoteAddress: '127.0.0.1' } };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      setHeader() { return this; },
      end(payload) { salida = payload ?? ''; resolve({ status: this.statusCode, body: salida }); }
    };
    handler(req, res).catch((e) => resolve({ status: 500, body: JSON.stringify({ error: e.message }) }));
  });

const destino = 'franciscohernandezmartin5@gmail.com';
const compuesto = await llamar('POST', '/api/emails-prueba', { email: destino, nombre: 'Francisco' });
console.log('compuestos:', compuesto.status, compuesto.body.slice(0, 120));

const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL });
await cliente.connect();
const { rows } = await cliente.query(
  `select id, tipo, asunto, html, texto from outbox where destinatario = $1 order by id desc limit 3`,
  [destino]
);

// Cuenta efímera de Ethereal: se crea sola, sin registro, y caduca.
const cuenta = await nodemailer.createTestAccount();
const transporte = nodemailer.createTransport({
  host: cuenta.smtp.host,
  port: cuenta.smtp.port,
  secure: cuenta.smtp.secure,
  auth: { user: cuenta.user, pass: cuenta.pass }
});
await transporte.verify();
console.log(`SMTP real de Ethereal: ${cuenta.smtp.host}:${cuenta.smtp.port} (cuenta ${cuenta.user})`);

console.log('\n—— Envíos ——');
for (const fila of rows.reverse()) {
  const info = await transporte.sendMail({
    from: '"Librería AI Salamanca" <libreria@demo.local>',
    to: destino,
    subject: fila.asunto,
    html: fila.html,
    text: fila.texto
  });
  console.log(` ${fila.tipo.padEnd(17)} ${fila.asunto}`);
  console.log(`   vista previa: ${nodemailer.getTestMessageUrl(info)}`);
}

await cliente.query(`delete from outbox`);
await cliente.end();
process.exit(0);
