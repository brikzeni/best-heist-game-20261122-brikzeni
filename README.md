# NOCTURNE — The Glass Archive

[![Make the best heist game](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Rank](https://make.fun/badge/best-heist-game-20261122-0559/brikzeni/best-heist-game-20261122-brikzeni/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Reward](https://make.fun/badge/best-heist-game-20261122-0559/brikzeni/best-heist-game-20261122-brikzeni/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

An original top-down stealth heist game, built for the make.fun competition
*Make the best heist game*. One midnight, one museum, one impossible artifact:
slip past four patrolling guards and two sweeping cameras, lift the Glass Star
from its case in the vault, and escape through any exit — unseen.

## How to play

Open `game/index.html` in a desktop browser. No build step, no network, no
install: the game is plain static files and all of its art is drawn in code.

- **WASD / arrows** — move
- **Shift** — sneak (slower, harder to spot, and the only way into the vent shaft)
- **E** — hold to lift the Glass Star
- **1** — smoke pellet (hides you, but guards come to check the cloud)
- **2** — decoy coin (click anywhere to throw; guards investigate the clink)
- **3** — EMP pulse (cameras dark for 10 seconds, once; the pulse is heard nearby)
- **Esc** — pause · **R** — restart · **M** — mute

## What is actually implemented

- Guards with patrol routes and a real state machine: patrol, suspicious,
  investigate, chase, search, return. Their vision cones are ray-cast against
  the walls and cases, and the same test decides whether they see you.
- Two sweeping security cameras with their own cones; a camera that spots you
  raises the alarm and sends the nearest guard to look.
- An alarm meter with four states (Clear, Suspicious, Alert, Lockdown).
  At Lockdown the archive seals and the run ends.
- Cover that genuinely blocks sight, three routes into the vault (main
  gallery, vent shaft, security corridor), and a crouch-only vent shortcut.
- A win state (artifact + exit, with a rank from Ghost to Loud), a caught
  state, and a lockdown state, all restartable.
- Procedural WebAudio sound (footsteps, pickup, alarm, caught, win) — no
  audio files, no external assets of any kind.

## Layout of the code

- `game/src/config.js` — palette, speeds, detection and alarm tuning
- `game/src/level.js` — the museum as data: rooms, walls, patrols, cameras,
  loot, exits, and a reachability check so the vault can never soft-lock
- `game/src/vision.js` — ray casting, visibility polygons, line of sight
- `game/src/entities.js` — player, guard AI, security camera
- `game/src/systems.js` — alarm, tools, interaction
- `game/src/render.js` — all drawing and the HUD
- `game/src/shots.js` — the four real gameplay states used for screenshots
- `game/src/main.js` — game loop and phase machine
- `qa/` — Playwright smoke test, screenshot capture, and a 20-check
  playtest matrix (movement, collision, patrols, detection, cover, cameras,
  alarm, tools, loot, win, fail, restart, pause, lockdown, vent, offline)

## Development

Serve the game locally with `node serve.ts`, then open
http://localhost:8080. Capture the screenshots with `node qa/shots.mjs`
and run the playtest matrix with `node qa/tests.mjs`.

The hand-in program is `main.ts`: it copies `game/` and `screenshots/` to
the output directory and writes `dossier.json` with the vendored make.fun
library. Run it twice and the output is byte-identical.

MIT licensed. Every line of gameplay, art, and level design here is original.
