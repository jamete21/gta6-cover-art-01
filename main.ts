// Neon Boulevard hand-in program (Node 22, standard library only). It copies the
// finished app and the screenshots into the grader's output folder and writes the
// dossier the judge reads, using the kit's vendored library. The program runs
// twice and both runs must produce identical bytes, so it writes nothing else.
//
// Run locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  if (!existsSync(from)) return false;
  cpSync(from, to, { recursive: true });
  return true;
}

mkdirSync(outputDir, { recursive: true });
copyTree(join(repoDir, 'app'), join(outputDir, 'app'));
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
copyTree(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'));

// The scorer's own caps: only text_max_bytes shapes the dossier bytes; the rest
// refuse an entry the scorer would refuse anyway (too many or too large
// screenshots, too many files or bytes under app/, a path over 1000 bytes).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Neon Boulevard entry written to ${outputDir}`);
