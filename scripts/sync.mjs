/**
 * Sincroniza los datos que vienen de fuera: portadas y valoraciones reales.
 *
 *   npm run sync
 *
 * Lo llama también el workflow semanal (.github/workflows/sync.yml), que hace
 * commit solo si cambia algo. Las dos fuentes son Open Library; si una falla,
 * la otra sigue y el catálogo se queda con lo que ya tenía.
 */
import { spawnSync } from 'node:child_process';

const pasos = [
  ['portadas', 'scripts/fetch-covers.mjs'],
  ['valoraciones', 'scripts/fetch-ratings.mjs']
];

let fallos = 0;
for (const [nombre, script] of pasos) {
  console.log(`\n=== ${nombre} ===`);
  const r = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (r.status !== 0) {
    fallos += 1;
    console.log(`! ${nombre} terminó con código ${r.status}; se continúa`);
  }
}

console.log(`\nSincronización terminada · ${pasos.length - fallos}/${pasos.length} pasos correctos`);
process.exitCode = fallos === pasos.length ? 1 : 0;
