/**
 * Aplica db/schema.sql contra la base de Neon.
 *
 * Uso:
 *   node scripts/migrate.mjs                 # lee .env.local y usa DATABASE_URL_UNPOOLED
 *   DATABASE_URL=postgres://... node scripts/migrate.mjs
 *
 * Usa el driver TCP (pg) porque el esquema tiene varias sentencias y una función
 * PL/pgSQL; las funciones serverless sí usan el driver HTTP.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvLocal() {
  const path = resolve(root, '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key]) continue;
    process.env[key] = raw.replace(/^"(.*)"$/, '$1');
  }
}

loadEnvLocal();

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Falta DATABASE_URL (ejecuta `vercel env pull .env.local`).');
  process.exit(1);
}

const schema = readFileSync(resolve(root, 'db/schema.sql'), 'utf8');
const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false }
});

try {
  await client.connect();
  await client.query(schema);
  const { rows } = await client.query(
    `select
       (select count(*) from libros) as libros,
       (select count(*) from eventos) as eventos,
       (select count(*) from pedidos) as pedidos,
       (select count(*) from reservas) as reservas`
  );
  console.log('Esquema aplicado:', rows[0]);
} catch (error) {
  console.error('Error aplicando el esquema:', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
