/**
 * Prueba de la cadena de correo sin depender de Gmail.
 *
 * Levanta un servidor SMTP local que acepta todo, apunta el handler a él y
 * comprueba que el correo sale de `outbox` como 'enviado' con el mensaje
 * completo capturado. No usa credenciales reales ni envía nada a internet.
 *
 *   node scripts/test-smtp.mjs
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

// Variables locales (DATABASE_URL)
const envPath = path.join(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    if (process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"(.*)"$/, '$1');
  }
}

const PUERTO = 2526;
const capturados = [];

const servidor = new SMTPServer({
  authOptional: true,
  // El certificado por defecto de smtp-server está caducado: sin STARTTLS la
  // prueba no depende de TLS. En producción va por 465 con TLS real.
  hideSTARTTLS: true,
  disabledCommands: ['STARTTLS'],
  onAuth(auth, session, callback) {
    callback(null, { user: auth.username });
  },
  onData(stream, session, callback) {
    let bruto = '';
    stream.on('data', (chunk) => {
      bruto += chunk.toString('utf8');
    });
    stream.on('end', () => {
      capturados.push({
        de: session.envelope.mailFrom?.address,
        para: session.envelope.rcptTo.map((r) => r.address),
        bruto
      });
      callback();
    });
  }
});

await new Promise((resolve) => servidor.listen(PUERTO, '127.0.0.1', resolve));
console.log(`SMTP de pruebas escuchando en 127.0.0.1:${PUERTO}`);

// El handler se compila igual que va a producción.
await build({
  entryPoints: [path.join(root, 'api/[...route].ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(outDir, 'api.mjs'),
  external: ['nodemailer', '@neondatabase/serverless', 'node:crypto'],
  logLevel: 'error'
});

Object.assign(process.env, {
  GMAIL_USER: 'prueba@libreria.local',
  GMAIL_APP_PASSWORD: 'contraseña-de-aplicacion-falsa',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: String(PUERTO),
  ADMIN_SECRET: process.env.ADMIN_SECRET || 'secreto-de-prueba'
});
delete process.env.RESEND_API_KEY;

const { default: handler } = await import(`file://${path.join(outDir, 'api.mjs')}?t=${Date.now()}`);

function llamar(metodo, url, cuerpo) {
  return new Promise((resolve) => {
    const chunks = [];
    const req = {
      method: metodo,
      url,
      headers: { authorization: `Bearer ${process.env.ADMIN_SECRET}`, host: 'localhost' },
      body: cuerpo,
      socket: { remoteAddress: '127.0.0.1' }
    };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader() {
        return this;
      },
      end(payload) {
        chunks.push(payload ?? '');
        resolve({ status: this.statusCode, body: chunks.join('') });
      }
    };
    handler(req, res).catch((error) => resolve({ status: 500, body: JSON.stringify({ error: error.message }) }));
  });
}

const destino = 'franciscohernandezmartin5@gmail.com';
const compuesto = await llamar('POST', '/api/emails-prueba', { email: destino, nombre: 'Francisco' });
console.log('emails-prueba →', compuesto.status, compuesto.body.slice(0, 160));

// Margen para que el SMTP termine de aceptar los tres mensajes.
await new Promise((resolve) => setTimeout(resolve, 2500));

const cliente = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
});
await cliente.connect();
const { rows } = await cliente.query(
  `select id, tipo, destinatario, asunto, estado, proveedor, error, enviado_en
     from outbox order by id desc limit 3`
);

console.log('\n—— Bandeja tras el envío ——');
for (const fila of rows.reverse()) {
  console.log(` ${fila.estado.padEnd(9)} ${String(fila.proveedor ?? '—').padEnd(6)} ${fila.tipo.padEnd(17)} ${fila.asunto}`);
  if (fila.error) console.log(`   error: ${fila.error}`);
}

console.log('\n—— Mensajes capturados por el SMTP local ——');
for (const mensaje of capturados) {
  const asunto = (mensaje.bruto.match(/^Subject: (.*)$/m) ?? [])[1] ?? '(sin asunto)';
  const tipo = (mensaje.bruto.match(/^Content-Type: (.*)$/m) ?? [])[1] ?? '';
  console.log(` de=${mensaje.de} para=${mensaje.para.join(',')}`);
  console.log(`   asunto: ${asunto.trim()}`);
  console.log(`   ${tipo.trim()} · ${mensaje.bruto.length} bytes`);
}

const enviados = rows.filter((fila) => fila.estado === 'enviado' && fila.proveedor === 'smtp').length;
console.log(`\nResultado: ${enviados}/3 en estado 'enviado' por smtp · ${capturados.length} mensajes capturados`);

// Limpieza: no dejamos pruebas en la base.
await cliente.query(`delete from outbox`);
await cliente.end();
servidor.close();
process.exit(enviados === 3 && capturados.length === 3 ? 0 : 1);
