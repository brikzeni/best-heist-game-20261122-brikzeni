// systems.js — Alarm, Tools, Interaction. Each tool has a real cost or tradeoff:
// smoke hides you but draws guards to the cloud; decoy is loud; EMP is single-use
// and its pulse pings nearby guards.

import { ALARM, TOOLS, CAMERA, PLAYER } from './config.js';
import { ARTIFACT, EXITS, PICKUPS } from './level.js';

export class AlarmSystem {
  constructor() {
    this.level = 0;
    this.state = 'CLEAR';
    this.triggered = 0; // how many times ALERT was entered (used for the rank)
  }

  add(amount) {
    this.level = Math.min(100, this.level + amount);
  }

  update(dt, game) {
    const anyHot = game.guards.some((g) => g.suspicion > 60);
    if (anyHot) this.add(ALARM.guardSuspicionRate * dt);
    else this.level = Math.max(0, this.level - ALARM.decayPerSec * dt);
    const prev = this.state;
    this.state =
      this.level >= ALARM.lockdownAt ? 'LOCKDOWN' :
      this.level >= ALARM.alertAt ? 'ALERT' :
      this.level >= ALARM.suspiciousAt ? 'SUSPICIOUS' : 'CLEAR';
    if (this.state === 'ALERT' && prev !== 'ALERT') {
      this.triggered += 1;
      game.sounds.alarm(this.level);
    }
    if (this.state === 'LOCKDOWN') game.onLockdown();
  }
}

export class ToolSystem {
  static useSmoke(game) {
    const p = game.player;
    if (p.tools.smoke <= 0) return false;
    p.tools.smoke -= 1;
    game.smokes.push({ x: p.x, y: p.y, radius: TOOLS.smoke.radius, until: game.now + TOOLS.smoke.lifeSec });
    game.noises.push({ x: p.x, y: p.y, radius: TOOLS.smoke.noiseRadius, until: game.now + 0.5 });
    game.sounds.smoke();
    game.flash('Smoke deployed — guards will check the cloud.');
    return true;
  }

  static useDecoy(game, mx, my) {
    const p = game.player;
    if (p.tools.decoy <= 0) return false;
    p.tools.decoy -= 1;
    game.decoys.push({ x: mx, y: my, until: game.now + 0.8 });
    game.noises.push({ x: mx, y: my, radius: TOOLS.decoy.noiseRadius, until: game.now + 1.2 });
    game.sounds.click();
    game.flash('Decoy thrown — guards investigate the clink.');
    return true;
  }

  static useEmp(game) {
    const p = game.player;
    if (p.tools.emp <= 0) return false;
    p.tools.emp -= 1;
    for (const c of game.cameras) c.disabledUntil = game.now + CAMERA.disabledSec;
    game.noises.push({ x: p.x, y: p.y, radius: TOOLS.emp.noiseRadius, until: game.now + 0.5 });
    for (const g of game.guards) {
      if (Math.hypot(g.x - p.x, g.y - p.y) < TOOLS.emp.noiseRadius) {
        g.suspicion = Math.min(100, g.suspicion + TOOLS.emp.suspicionPing);
      }
    }
    game.sounds.emp();
    game.flash(`EMP pulse — cameras dark for ${CAMERA.disabledSec}s. The pulse was heard nearby.`);
    return true;
  }
}

// E to channel the artifact, touch to collect pickups, reach an exit with the loot.
export class InteractionSystem {
  static update(dt, game) {
    const p = game.player;
    const d = Math.hypot(p.x - ARTIFACT.x, p.y - ARTIFACT.y);
    const nearArtifact = d < ARTIFACT.interactRadius && !p.hasArtifact;
    if (nearArtifact && game.input.down('e')) {
      p.channel += dt / PLAYER.channelTime;
      if (Math.floor(p.channel * 8) !== Math.floor((p.channel - dt / PLAYER.channelTime) * 8)) {
        game.sounds.channelTick();
      }
      if (p.channel >= 1) {
        p.hasArtifact = true;
        p.channel = 0;
        game.sounds.grab();
        game.flash('THE GLASS STAR IS YOURS — get to an exit!');
        game.objective = 'Escape through any exit';
      }
    } else if (!nearArtifact) {
      p.channel = 0;
    }

    for (const pk of game.pickups) {
      if (!pk.taken && Math.hypot(p.x - pk.x, p.y - pk.y) < 30) {
        pk.taken = true;
        if (pk.kind === 'smoke') p.tools.smoke = Math.min(TOOLS.smoke.max, p.tools.smoke + pk.amount);
        if (pk.kind === 'decoy') p.tools.decoy = Math.min(TOOLS.decoy.max, p.tools.decoy + pk.amount);
        game.sounds.pickup();
        game.flash(pk.kind === 'smoke' ? '+1 smoke pellet' : `+${pk.amount} decoy coins`);
      }
    }

    if (p.hasArtifact) {
      for (const e of EXITS) {
        if (p.x > e.x - 10 && p.x < e.x + e.w + 10 && p.y > e.y - 10 && p.y < e.y + e.h + 10) {
          game.onWin(e.name);
        }
      }
    }
  }
}
