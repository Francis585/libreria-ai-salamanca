/**
 * Borra las opiniones firmadas por la casa (inventadas) y deja solo las que
 * han escrito lectores de verdad desde la web o las que llegan de Goodreads.
 *
 *   node scripts/limpiar-resenas-casa.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const linea of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}

const cliente = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await cliente.connect();
const antes = await cliente.query("select origen, count(*)::int as n from resenas group by origen order by origen");
console.log('antes:', antes.rows);
const borradas = await cliente.query("delete from resenas where origen = 'casa' returning id");
console.log('borradas:', borradas.rowCount);
const despues = await cliente.query("select origen, count(*)::int as n from resenas group by origen order by origen");
console.log('después:', despues.rows);
await cliente.end();
