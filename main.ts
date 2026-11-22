// NOCTURNE — THE GLASS ARCHIVE: hand-in program.
// Node 22, standard library only. It copies the finished game (game/) and its
// four real gameplay screenshots (screenshots/) from beside this file into the
// output directory, then writes the judge's dossier (dossier.json) with the
// vendored make.fun library. Running it twice produces byte-identical output:
// it copies files in a fixed order and the dossier carries no timestamps.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (from the competition kit): the dossier text stays
// under 160 KiB; at most 4 screenshots, each under 256 KiB; the game stays
// under 993 files and 48 MiB in total.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn() {
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));
}

handIn();
