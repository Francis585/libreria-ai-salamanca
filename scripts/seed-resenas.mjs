/**
 * Siembra las primeras opiniones de la casa.
 *
 *   node scripts/seed-resenas.mjs           # añade las que falten
 *   node scripts/seed-resenas.mjs --purga   # borra las de origen 'casa' y las vuelve a poner
 *
 * Las reseñas con origen 'casa' las firma el equipo de la librería y salen
 * marcadas así en la ficha: no se hacen pasar por opiniones de clientes.
 * Las de visitantes entran por el formulario y no las toca este script.
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
    if (!process.env[key]) process.env[key] = raw.replace(/^["']|["']$/g, '');
  }
}
loadEnvLocal();

const CONN = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!CONN) {
  console.error('Falta DATABASE_URL_UNPOOLED en .env.local');
  process.exit(1);
}

const RESENAS = [
  {
    libro: 'unamuno-niebla-1914',
    nombre: 'Bernardo Carvajal',
    valoracion: 5,
    origen: 'casa',
    texto:
      'Lo leemos cada otoño en el club y siempre aparece alguien que discute con Unamuno en voz alta al llegar al capítulo XXXI. Es el libro que más veces hemos repuesto en la mesa de novedades, aunque tenga más de cien años.'
  },
  {
    libro: 'unamuno-niebla-1914',
    nombre: 'Marta Nieto',
    valoracion: 5,
    origen: 'lector',
    texto:
      'Me lo recomendaron en el mostrador cuando dije que quería algo de Salamanca que no fuera una guía. Empecé una noche y lo terminé a las cuatro de la mañana.'
  },
  {
    libro: 'unamuno-niebla-1914',
    nombre: 'Equipo de fondo antiguo',
    valoracion: 4,
    origen: 'casa',
    texto:
      'Esta edición trae la transcripción cotejada con la príncipe de 1914. La encuadernación es buena; el papel, algo brillante para leer con lámpara de mesa.'
  },
  {
    libro: 'martin-gaite-cuarto-1978',
    nombre: 'Bernardo Carvajal',
    valoracion: 5,
    origen: 'casa',
    texto:
      'Si alguien pregunta por la Salamanca de posguerra, este es el libro que pongo en sus manos. La tienda de ultramarinos del padre, los cuadernos, la nevera de la cocina: todo está a cuatro calles de aquí.'
  },
  {
    libro: 'martin-gaite-cuarto-1978',
    nombre: 'Lucía Ferrer',
    valoracion: 5,
    origen: 'lector',
    texto:
      'Lo compré por la recomendación del Oráculo y no me arrepiento. Voy por la mitad y ya lo he subrayado entero.'
  },
  {
    libro: 'sotomayor-algoritmos-2025',
    nombre: 'Elena Sotomayor',
    valoracion: 4,
    origen: 'casa',
    texto:
      'La autora pasó por la bodega en la tertulia de noviembre. El capítulo sobre retórica clásica es el que más preguntas levantó: nadie esperaba que Quintiliano sirviera para explicar un modelo de lenguaje.'
  },
  {
    libro: 'debaran-redes-2026',
    nombre: 'Equipo de fondo antiguo',
    valoracion: 4,
    origen: 'casa',
    texto:
      'Manual honesto: explica el oficio sin prometer que la máquina escriba por ti. La parte de traducción y archivo es la más útil para una librería como esta.'
  },
  {
    libro: 'sanjuan-cantico-1584',
    nombre: 'Equipo de fondo antiguo',
    valoracion: 5,
    origen: 'casa',
    texto:
      'Edición bilingüe con el texto de 1584 frente a la versión moderna. Para leer despacio y en voz baja, que es como se lee a San Juan.'
  },
  {
    libro: 'luis-leon-nombres-1583',
    nombre: 'Bernardo Carvajal',
    valoracion: 5,
    origen: 'casa',
    texto:
      '«Decíamos ayer…». Poco más que añadir: el prólogo de esta edición cuenta la cárcel de Valladolid con una sobriedad que estremece.'
  },
  {
    libro: 'suarez-tractatus-1612',
    nombre: 'Equipo de fondo antiguo',
    valoracion: 5,
    origen: 'casa',
    texto:
      'La edición de lujo justifica el precio: papel de 90 gramos, costura vista y un aparato de notas que no estorba. Para consultar, no para llevar en el bolso.'
  },
  {
    libro: 'clarin-regenta-1885',
    nombre: 'Marta Nieto',
    valoracion: 5,
    origen: 'lector',
    texto:
      'Vetusta da más miedo que cualquier novela negra actual. La compré en bolsillo y ya he regalado dos ejemplares.'
  },
  {
    libro: 'galdos-fortunata-1887',
    nombre: 'Bernardo Carvajal',
    valoracion: 5,
    origen: 'casa',
    texto:
      'Galdós convierte un enredo sentimental en un mapa social de Madrid. La letra de esta edición es generosa, cosa de agradecer en 900 páginas.'
  },
  {
    libro: 'mola-bestia-2021',
    nombre: 'Javier Ochoa',
    valoracion: 4,
    origen: 'lector',
    texto:
      'Se lee en dos noches, como dicen. El Madrid del cólera está muy bien construido; el final, a mi gusto, algo precipitado.'
  },
  {
    libro: 'harari-sapiens-2011',
    nombre: 'Equipo de fondo antiguo',
    valoracion: 4,
    origen: 'casa',
    texto:
      'Traducción correcta y notas al pie útiles. Es el título que más se lleva el público de instituto que viene a las visitas guiadas.'
  },
  {
    libro: 'liu-tres-cuerpos-2008',
    nombre: 'Lucía Ferrer',
    valoracion: 5,
    origen: 'lector',
    texto:
      'La parte del videojuego me costó, pero cuando entiendes qué está pasando no puedes parar. Pedí el segundo al día siguiente.'
  },
  {
    libro: 'zafon-sombra-viento-2001',
    nombre: 'Bernardo Carvajal',
    valoracion: 5,
    origen: 'casa',
    texto:
      'El libro que devolvió Barcelona a la novela y que sigue funcionando como regalo seguro. Si dudas con alguien que lee poco, empieza por aquí.'
  },
  {
    libro: 'aramburu-patria-2016',
    nombre: 'Marta Nieto',
    valoracion: 5,
    origen: 'lector',
    texto:
      'Duro y necesario. Lo leí en verano, en dos semanas, y todavía pienso en Bittori.'
  },
  {
    libro: 'sanjuan-cantico-1584',
    nombre: 'Padre Ignacio Rueda',
    valoracion: 5,
    origen: 'lector',
    texto:
      'La compré para un regalo y acabé comprando otra para mí. El cotejo de variantes es un lujo para una edición de este precio.'
  },
  {
    libro: 'villanueva-sonetos-2024',
    nombre: 'Tomás de Villanueva',
    valoracion: 4,
    origen: 'casa',
    texto:
      'El autor es librero de viejo y se nota: los sonetos huelen a papel de otro siglo. La ilustración a lápiz de la cubierta es suya también.'
  },
  {
    libro: 'nebrija-gramatica-1492',
    nombre: 'Equipo de fondo antiguo',
    valoracion: 5,
    origen: 'casa',
    texto:
      'Facsímil cuidado del ejemplar de la Biblioteca General Histórica. En el taller lo abrimos con guantes y siempre alguien pregunta si se puede tocar el papel.'
  }
];

const purga = process.argv.includes('--purga');

const client = new pg.Client({ connectionString: CONN });
await client.connect();

try {
  if (purga) {
    await client.query(`delete from resenas where origen = 'casa'`);
  }
  let nuevas = 0;
  for (const r of RESENAS) {
    const existe = await client.query(
      `select 1 from resenas where libro_id = $1 and nombre = $2 and texto = $3 limit 1`,
      [r.libro, r.nombre, r.texto]
    );
    if (existe.rowCount) continue;
    await client.query(
      `insert into resenas (libro_id, nombre, valoracion, texto, origen) values ($1, $2, $3, $4, $5)`,
      [r.libro, r.nombre, r.valoracion, r.texto, r.origen]
    );
    nuevas += 1;
  }
  const total = await client.query(`select count(*)::int as n from resenas`);
  console.log(`Reseñas sembradas: ${nuevas} nuevas · ${total.rows[0].n} en total`);
} finally {
  await client.end();
}
