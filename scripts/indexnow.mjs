/**
 * Avisa a Bing, Yandex y demás buscadores adheridos a IndexNow de que hay
 * páginas nuevas o cambiadas. No necesita cuenta ni clave de API: solo el
 * fichero de verificación que está en public/<clave>.txt.
 *
 *   node scripts/indexnow.mjs
 *
 * Se ejecuta al final del despliegue (GitHub Action) y también a mano. Google
 * no participa en IndexNow: para Google se usa el sitemap de Search Console.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const HOST = 'libreria-ai-lab.vercel.app';

// El fichero de verificación se llama <clave>.txt y vive en la raíz del sitio.
const ficheroClave = readdirSync(resolve(root, 'public')).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!ficheroClave) {
  console.error('Falta public/<clave>.txt para IndexNow.');
  process.exit(1);
}
const clave = ficheroClave.replace('.txt', '');
const sitemap = resolve(root, 'dist/sitemap.xml');

if (!existsSync(sitemap)) {
  console.error('Falta dist/sitemap.xml: ejecuta `npm run build` antes.');
  process.exit(1);
}

const urls = [...readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1])
  .filter((url) => url.startsWith(`https://${HOST}`));

// IndexNow acepta hasta 10.000 URLs por petición.
const cuerpo = {
  host: HOST,
  key: clave,
  keyLocation: `https://${HOST}/${clave}.txt`,
  urlList: urls.slice(0, 10000)
};

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(cuerpo)
});

console.log(`IndexNow: ${urls.length} URLs enviadas · HTTP ${res.status}`);
if (res.status !== 200 && res.status !== 202) {
  console.log((await res.text()).slice(0, 300));
  process.exit(1);
}
