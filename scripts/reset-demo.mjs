/**
 * Deja la base como recién instalada: borra pedidos/reservas/suscriptores de
 * prueba y devuelve el stock a los valores iniciales del catálogo.
 *
 * Uso: node scripts/reset-demo.mjs
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
  console.error('Falta DATABASE_URL.');
  process.exit(1);
}

const STOCK_INICIAL = [
  ['nebrija-gramatica-1492', 6],
  ['celestina-rojas-1499', 11],
  ['vitoria-relectio-1539', 8],
  ['luis-leon-nombres-1583', 9],
  ['cortes-sphera-1551', 4],
  ['lazarillo-tormes-1554', 16],
  ['castanega-supersticiones-1529', 7],
  ['huarte-examen-1575', 6],
  ['suarez-tractatus-1612', 3],
  ['leon-arbol-1605', 5],
  ['sanjuan-cantico-1584', 10],
  ['unamuno-sentimiento-1912', 14],
  ['unamuno-niebla-1914', 12],
  ['martin-gaite-cuarto-1978', 9],
  ['sotomayor-algoritmos-2025', 8],
  ['debaran-redes-2026', 7],
  ['villanueva-sonetos-2024', 13],
  ['usal-universidad-2023', 5]
];

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false }
});

try {
  await client.connect();
  await client.query('begin');
  await client.query('truncate pedidos, pedido_lineas, reservas, suscriptores restart identity');
  await client.query('alter sequence pedido_ref_seq restart with 1');

  for (const [id, stock] of STOCK_INICIAL) {
    await client.query('update libros set stock = $2, actualizado_en = now() where id = $1', [id, stock]);
  }

  await client.query('commit');
  const { rows } = await client.query(
    `select
       (select count(*) from pedidos) as pedidos,
       (select count(*) from reservas) as reservas,
       (select count(*) from suscriptores) as suscriptores,
       (select sum(stock) from libros) as unidades`
  );
  console.log('Base restablecida:', rows[0]);
} catch (error) {
  await client.query('rollback').catch(() => {});
  console.error('Error:', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
