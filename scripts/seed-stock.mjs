// Da de alta en `libros` los títulos nuevos del catálogo, para que tengan stock.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
    })
);

const { BOOKS } = await import('../.eval/library.mjs');
const db = new pg.Client({ connectionString: env.DATABASE_URL_UNPOOLED || env.DATABASE_URL });
await db.connect();

const existentes = new Set((await db.query('select id from libros')).rows.map((r) => r.id));
const nuevos = BOOKS.filter((b) => !existentes.has(b.id));

for (const libro of nuevos) {
  await db.query(
    `insert into libros (id, titulo, precio, stock) values ($1, $2, $3, $4)
     on conflict (id) do update set titulo = excluded.titulo, precio = excluded.precio`,
    [libro.id, libro.title, libro.price, 6]
  );
}

const total = (await db.query('select count(*)::int as n from libros')).rows[0].n;
console.log(`altas: ${nuevos.length} · títulos en base: ${total}`);
await db.end();
