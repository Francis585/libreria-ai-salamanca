/**
 * Añade un libro al catálogo sin tocar código.
 *
 *   npm run libro:add -- nuevo.json
 *
 * El JSON debe traer: id, titulo, autor, anio, precio, paginas, categoria,
 * sinopsis, etiquetas[] y claves[]. Opcionales: editorial, fecha, tematica,
 * formato, valoracion.
 *
 * Valida antes de escribir: campos obligatorios, id único, año razonable y
 * categoría existente. Si algo falla, no escribe nada.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGO = path.join(root, 'src/data/catalogo.json');

const CATEGORIAS = new Set([
  'Clásicos Salmantinos',
  'Humanismo & Ciencia',
  'Narrativa Contemporánea',
  'Ensayo & Pensamiento IA',
  'Poesía',
  'Novela & Aventura',
  'Misterio & Policíaco',
  'Teatro',
  'Novedades',
  'Infantil & Juvenil'
]);

const ruta = process.argv[2];
if (!ruta) {
  console.error('Uso: npm run libro:add -- nuevo.json');
  process.exit(1);
}

let propuesto;
try {
  propuesto = JSON.parse(readFileSync(path.resolve(process.cwd(), ruta), 'utf8'));
} catch (error) {
  console.error(`No se puede leer ${ruta}: ${error.message}`);
  process.exit(1);
}

const datos = JSON.parse(readFileSync(CATALOGO, 'utf8'));
const errores = [];

for (const campo of ['id', 'titulo', 'autor', 'anio', 'precio', 'paginas', 'categoria', 'sinopsis']) {
  if (propuesto[campo] === undefined || propuesto[campo] === '') errores.push(`falta "${campo}"`);
}
if (propuesto.id && datos.libros.some((libro) => libro.id === propuesto.id)) errores.push(`el id "${propuesto.id}" ya existe`);
if (propuesto.categoria && !CATEGORIAS.has(propuesto.categoria)) {
  errores.push(`categoría desconocida "${propuesto.categoria}". Válidas: ${[...CATEGORIAS].join(' | ')}`);
}
if (propuesto.anio && (propuesto.anio < 1450 || propuesto.anio > new Date().getFullYear() + 1)) {
  errores.push(`año fuera de rango: ${propuesto.anio}`);
}
if (propuesto.etiquetas && !Array.isArray(propuesto.etiquetas)) errores.push('"etiquetas" debe ser una lista');
if (propuesto.claves && !Array.isArray(propuesto.claves)) errores.push('"claves" debe ser una lista');

if (errores.length) {
  console.error('No se ha añadido nada:\n- ' + errores.join('\n- '));
  process.exit(1);
}

const libro = {
  ...propuesto,
  etiquetas: propuesto.etiquetas ?? [],
  claves: propuesto.claves ?? [],
  fecha: propuesto.fecha ?? `${propuesto.anio}-01-01`
};

datos.libros.push(libro);
datos._nota = 'Catalogo actualizable: novedades y fondo del siglo XXI. Para anadir: npm run libro:add -- nuevo.json';
writeFileSync(CATALOGO, `${JSON.stringify(datos, null, 2)}\n`, 'utf8');

console.log(`Añadido: «${libro.titulo}» (${libro.anio}) · ${libro.categoria}`);
console.log(`El catálogo tiene ahora ${datos.libros.length} títulos actualizables.`);
console.log('Siguiente paso: npm run build && vercel deploy (o push, si el repo está conectado).');
