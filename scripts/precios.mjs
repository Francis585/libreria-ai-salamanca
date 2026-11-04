/**
 * Pone precio orientativo a los títulos encargables.
 *
 *   node scripts/precios.mjs                # solo a los que no tienen precio
 *   node scripts/precios.mjs --recalcular    # rehace también los estimados
 *   node scripts/precios.mjs --manual id 19.90
 *
 * Regla (todo en un sitio, fácil de cambiar): PVP por tramo de año, redondeado
 * a ,90. Se marca como `estimado` para que la web lo diga; los precios puestos
 * a mano con --manual quedan como `manual` y este script no los toca.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const envPath = resolve(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

/** Tramo de año → precio base. Ajústalo aquí y vuelve a correr el script. */
const TRAMOS = [
  { desde: 2025, precio: 22.9 },
  { desde: 2020, precio: 21.9 },
  { desde: 2010, precio: 20.9 },
  { desde: 2000, precio: 19.9 },
  { desde: 1950, precio: 18.9 },
  { desde: 0, precio: 17.9 }
];

const precioPara = (anio) => (TRAMOS.find((t) => (anio ?? 0) >= t.desde) ?? TRAMOS.at(-1)).precio;

const args = process.argv.slice(2);
const recalcular = args.includes('--recalcular');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
});
await client.connect();

try {
  if (args[0] === '--manual') {
    const [, id, importe] = args;
    const valor = Number(importe);
    if (!id || !Number.isFinite(valor) || valor <= 0) {
      console.error('Uso: node scripts/precios.mjs --manual <id> <precio>');
      process.exit(1);
    }
    const r = await client.query(
      `update novedades_feed set precio = $2, precio_origen = 'manual' where id = $1 returning titulo`,
      [id, valor]
    );
    console.log(r.rowCount ? `✓ ${r.rows[0].titulo}: ${valor.toFixed(2)} € (manual)` : 'No existe ese id');
    process.exit(0);
  }

  const filtro = recalcular
    ? `precio is null or precio_origen = 'estimado'`
    : `precio is null`;

  const { rows } = await client.query(
    `select id, anio from novedades_feed where ${filtro}`
  );

  let puestas = 0;
  for (const fila of rows) {
    await client.query(
      `update novedades_feed set precio = $2, precio_origen = 'estimado' where id = $1`,
      [fila.id, precioPara(fila.anio)]
    );
    puestas += 1;
  }

  const resumen = await client.query(
    `select precio_origen, count(*)::int as n from novedades_feed group by precio_origen order by n desc`
  );
  console.log(`Precios puestos: ${puestas}`);
  for (const fila of resumen.rows) console.log(`  ${fila.precio_origen ?? 'sin precio'}: ${fila.n}`);
} finally {
  await client.end();
}
