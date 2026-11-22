// main.js — NOCTURNE: the game loop, phase machine, and wiring.
// Phases: title -> playing <-> paused -> won | lost. R restarts from won/lost/paused.

import { CANVAS_W, CANVAS_H, WIN_RANKS, GUARD } from './config.js';
import {
  PLAYER_START, GUARD_PATROLS, CAMERAS, PICKUPS,
  sightSegments, solidRects, goalReachable, ROOMS,
} from './level.js';
import { Player, Guard, SecurityCamera } from './entities.js';
import { AlarmSystem, ToolSystem, InteractionSystem } from './systems.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { drawGame } from './render.js';
import { applyShotPreset } from './shots.js';

// The level must never soft-lock: the vault is reachable from the entry.
if (!goalReachable(ROOMS, 'entry', 'vault')) {
  throw new Error('level soft-lock: vault unreachable from entry');
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sounds = new SoundBank();
    this.segments = sightSegments();
    this.solids = solidRects();
    this.now = 0;
    this.elapsed = 0;
    this.phase = 'title';
    this.objective = 'Reach the vault — lift the Glass Star';
    this.flashText = '';
    this.flashUntil = 0;
    this.stats = { detections: 0 };
    this.exitName = '';
    this.loseReason = '';
    this.rank = WIN_RANKS[0];
    this._noiseAt = 0;
    this.reset();
    window.__game = this;
    window.__shotReady = false;
  }

  reset() {
    this.player = new Player(PLAYER_START);
    this.guards = GUARD_PATROLS.map((d) => new Guard(d));
    this.cameras = CAMERAS.map((d) => new SecurityCamera(d));
    this.alarm = new AlarmSystem();
    this.smokes = [];
    this.decoys = [];
    this.noises = [];
    this.pickups = PICKUPS.map((p) => ({ ...p, taken: false }));
    this.elapsed = 0;
    this.stats = { detections: 0 };
    this.objective = 'Reach the vault — lift the Glass Star';
    this.flashText = '';
    this.exitName = '';
    this.loseReason = '';
    this.rank = WIN_RANKS[0];
  }

  flash(text) {
    this.flashText = text;
    this.flashUntil = this.now + 3.2;
  }

  onSpotted(guard) {
    this.stats.detections += 1;
    this.sounds.spotted();
    this.flash(`SPOTTED by ${guard.name} — break line of sight!`);
  }

  onCaught(guard) {
    if (this.phase !== 'playing') return;
    this.phase = 'lost';
    this.loseReason = `Caught by ${guard.name} in the gallery.`;
    this.sounds.caught();
  }

  onLockdown() {
    if (this.phase !== 'playing') return;
    this.phase = 'lost';
    this.loseReason = 'LOCKDOWN — the alarm hit 100% and the archive sealed itself.';
    this.sounds.caught();
  }

  onWin(exitName) {
    if (this.phase !== 'playing') return;
    this.phase = 'won';
    this.exitName = exitName;
    this.rank = WIN_RANKS.find((r) => this.stats.detections <= r.maxDetections) || WIN_RANKS[WIN_RANKS.length - 1];
    this.sounds.win();
  }

  start() {
    this.reset();
    this.phase = 'playing';
    this.sounds.ensure();
    this.sounds.click();
    this.flash('Lift the Glass Star, then escape through any exit.');
  }

  update(dt) {
    this.now += dt;
    if (this.phase === 'title') {
      // Attract mode: guards patrol behind the title card.
      for (const g of this.guards) g.update(dt, this.now, this);
      for (const c of this.cameras) c.update(dt, this.now, this);
      if (this.input.justPressed('Enter') || this.input.mouse.clicked) this.start();
      return;
    }
    if (this.phase === 'paused') {
      if (this.input.justPressed('Escape') || this.input.justPressed('Enter')) this.phase = 'playing';
      if (this.input.justPressed('r')) this.start();
      return;
    }
    if (this.phase === 'won' || this.phase === 'lost') {
      if (this.input.justPressed('r')) this.start();
      return;
    }

    // --- playing ---
    this.elapsed += dt;
    const p = this.player;

    if (this.input.justPressed('Escape')) { this.phase = 'paused'; return; }
    if (this.input.justPressed('m')) {
      this.sounds.muted = !this.sounds.muted;
      this.flash(this.sounds.muted ? 'Sound muted.' : 'Sound on.');
    }
    if (this.input.justPressed('r')) { this.start(); return; }
    if (this.input.justPressed('1')) ToolSystem.useSmoke(this);
    if (this.input.justPressed('3')) ToolSystem.useEmp(this);
    if (this.input.justPressed('2') || this.input.mouse.clicked) {
      ToolSystem.useDecoy(this, this.input.mouse.x, this.input.mouse.y);
    }

    p.update(dt, this.input, this.solids);
    if (p.moving && !p.crouch) {
      this.sounds.step();
      // Running is loud: guards nearby hear the footsteps.
      if (this.now - this._noiseAt > 0.6) {
        this._noiseAt = this.now;
        this.noises.push({ x: p.x, y: p.y, radius: GUARD.noiseHearRadius, until: this.now + 0.3 });
      }
    }

    for (const g of this.guards) g.update(dt, this.now, this);
    for (const c of this.cameras) c.update(dt, this.now, this);
    this.alarm.update(dt, this);
    InteractionSystem.update(dt, this);

    // Prune expired effects.
    this.smokes = this.smokes.filter((s) => this.now < s.until);
    this.decoys = this.decoys.filter((d) => this.now < d.until);
    this.noises = this.noises.filter((n) => this.now < n.until);
  }

  frame(dt) {
    this.update(dt);
    drawGame(this.ctx, this);
    this.input.endFrame();
    window.__shotReady = true;
  }
}

function boot() {
  const canvas = document.getElementById('game');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const game = new Game(canvas);

  // Deterministic screenshot staging: ?shot=start|play|heist|escape
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (shot) {
    game.reset();
    game.phase = 'playing';
    applyShotPreset(game, shot);
  }

  let last = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    game.frame(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot();
