// entities.js — Player, Guard (state machine), SecurityCamera.
// All movement is circle-vs-rectangle with axis-separated resolution: no clipping.

import { PLAYER, GUARD, CAMERA } from './config.js';
import { inVent } from './level.js';
import { canSee, conePolygon } from './vision.js';

// Move a circle by (dx, dy) against solid rects, axis by axis.
export function moveCircle(pos, radius, dx, dy, solids) {
  let x = pos.x + dx;
  let y = pos.y;
  if (collides(x, y, radius, solids)) x = pos.x;
  y = pos.y + dy;
  if (collides(x, y, radius, solids)) y = pos.y;
  return { x, y };
}

export function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function collides(x, y, r, solids) {
  for (const s of solids) if (circleHitsRect(x, y, r, s)) return true;
  return false;
}

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.r = PLAYER.radius;
    this.crouch = false;
    this.moving = false;
    this.facing = -Math.PI / 2;
    this.hasArtifact = false;
    this.channel = 0; // 0..1 progress on the artifact case
    this.tools = { smoke: 2, decoy: 3, emp: 1 };
  }

  update(dt, input, solids) {
    const wantCrouch = input.down('Shift');
    // The vent shaft has a low ceiling: standing thieves cannot enter it.
    const nextCrouch = inVent(this.x, this.y) ? true : wantCrouch;
    this.crouch = nextCrouch;
    const v = input.moveVector();
    const speed = this.crouch ? PLAYER.crouchSpeed : PLAYER.walkSpeed;
    this.moving = v.x !== 0 || v.y !== 0;
    if (this.moving) {
      this.facing = Math.atan2(v.y, v.x);
      const nx = this.x + v.x * speed * dt;
      const ny = this.y + v.y * speed * dt;
      // Block stepping into the vent while standing.
      if (inVent(nx, ny) && !this.crouch) {
        // slide along the vent wall instead
        const sx = moveCircle(this, this.r, v.x * speed * dt, 0, solids);
        const sy = moveCircle(this, this.r, 0, v.y * speed * dt, solids);
        const cand = Math.abs(sx.x - this.x) + Math.abs(sx.y - this.y) >
          Math.abs(sy.x - this.x) + Math.abs(sy.y - this.y) ? sx : sy;
        if (!inVent(cand.x, cand.y)) { this.x = cand.x; this.y = cand.y; }
      } else {
        const p = moveCircle(this, this.r, v.x * speed * dt, v.y * speed * dt, solids);
        this.x = p.x;
        this.y = p.y;
      }
    }
  }
}

const GUARD_STATES = ['patrol', 'suspicious', 'investigate', 'chase', 'search', 'return'];

export class Guard {
  constructor(def) {
    this.name = def.name;
    this.color = def.color;
    this.waypoints = def.waypoints;
    this.wp = 0;
    this.x = def.waypoints[0][0];
    this.y = def.waypoints[0][1];
    this.r = GUARD.radius;
    this.state = 'patrol';
    this.facing = 0;
    this.suspicion = 0;
    this.lastSeen = null;
    this.loseSightAt = 0;
    this.searchUntil = 0;
    this.lookUntil = 0;
    this.lookDir = 0;
    this.investigateAt = null;
    this.wasSeen = false;
    this.wpAt = 0; // when the current waypoint leg started (stuck failsafe)
  }

  get range() { return GUARD.visionRange; }
  get fov() { return GUARD.visionFov; }

  speed(alarmState) {
    let s = this.state === 'chase' ? GUARD.chaseSpeed : GUARD.patrolSpeed;
    if (alarmState === 'ALERT') s *= 1.25;
    if (this.state === 'investigate' || this.state === 'search') s *= 1.15;
    return s;
  }

  cone(segments) {
    return conePolygon(this.x, this.y, this.facing, this.fov, this.range, segments);
  }

  _moveToward(tx, ty, speed, dt, solids) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return true;
    const target = Math.atan2(dy, dx);
    this.facing = turnToward(this.facing, target, dt * 6);
    const p = moveCircle(this, this.r, (dx / d) * speed * dt, (dy / d) * speed * dt, solids);
    this.x = p.x;
    this.y = p.y;
    return d < 6;
  }

  update(dt, now, game) {
    // Defensive: a stale waypoint index must never crash the frame.
    this.wp = ((this.wp % this.waypoints.length) + this.waypoints.length) % this.waypoints.length;
    const { player, segments, solids, alarm } = game;
    const inSmoke = game.smokes.some((s) => Math.hypot(player.x - s.x, player.y - s.y) < s.radius);
    const seen = !inSmoke
      ? canSee({ x: this.x, y: this.y, facing: this.facing, fov: this.fov, range: this.range }, player.x, player.y, segments)
      : { seen: false, dist: Infinity };

    if (seen.seen) {
      const closeness = 1 - Math.min(1, seen.dist / this.range);
      let rate = GUARD.detectFar + (GUARD.detectNear - GUARD.detectFar) * closeness;
      if (player.crouch) rate *= GUARD.detectCrouchMul;
      if (player.moving && !player.crouch) rate *= GUARD.detectMovingMul;
      this.suspicion = Math.min(100, this.suspicion + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightAt = now + GUARD.chaseLoseSightSec;
    } else {
      this.suspicion = Math.max(0, this.suspicion - GUARD.decayPerSec * dt);
    }

    // Noise: investigate the loudest nearby disturbance.
    for (const n of game.noises) {
      const d = Math.hypot(n.x - this.x, n.y - this.y);
      if (d < n.radius && this.state !== 'chase') {
        this.investigateAt = { x: n.x, y: n.y };
        this.suspicion = Math.max(this.suspicion, 30);
        if (this.state === 'patrol') this.state = 'investigate';
      }
    }

    if (this.suspicion >= 100 && this.state !== 'chase') {
      this.state = 'chase';
      game.onSpotted(this);
    }

    switch (this.state) {
      case 'patrol': {
        const [tx, ty] = this.waypoints[this.wp];
        if (this.wpAt === 0) this.wpAt = now;
        if (this._moveToward(tx, ty, this.speed(alarm.state), dt, solids)) {
          this.wp = (this.wp + 1) % this.waypoints.length;
          this.wpAt = 0;
        } else if (now - this.wpAt > 12) {
          // Stuck failsafe: a waypoint that cannot be reached in 12s is skipped.
          this.wp = (this.wp + 1) % this.waypoints.length;
          this.wpAt = 0;
        }
        if (this.suspicion > 35 && this.lastSeen) {
          this.state = 'suspicious';
          this.investigateAt = { ...this.lastSeen };
          this.lookUntil = now + 1.2;
        }
        break;
      }
      case 'suspicious': {
        // Pause, look toward the disturbance, then go check it.
        if (this.lastSeen) this.facing = turnToward(this.facing, Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x), dt * 5);
        if (now >= this.lookUntil) this.state = 'investigate';
        if (this.suspicion < 10) this.state = 'patrol';
        break;
      }
      case 'investigate': {
        if (!this.investigateAt) { this.state = 'patrol'; break; }
        if (this._moveToward(this.investigateAt.x, this.investigateAt.y, this.speed(alarm.state), dt, solids)) {
          this.lookUntil = now + 1.6;
          this.lookDir = this.facing + Math.PI / 2;
          this.state = 'search';
          this.searchUntil = now + GUARD.searchSec;
        }
        break;
      }
      case 'chase': {
        if (this.lastSeen) this._moveToward(this.lastSeen.x, this.lastSeen.y, this.speed(alarm.state), dt, solids);
        if (!seen.seen && now > this.loseSightAt) {
          this.state = 'search';
          this.searchUntil = now + GUARD.searchSec;
        }
        break;
      }
      case 'search': {
        this.facing = turnToward(this.facing, this.lookDir, dt * 2.5);
        if (now >= this.searchUntil) this.state = 'return';
        break;
      }
      case 'return': {
        // Walk back to the nearest patrol waypoint, then resume the loop.
        let best = 0;
        let bestD = Infinity;
        this.waypoints.forEach(([wx, wy], i) => {
          const d = Math.hypot(wx - this.x, wy - this.y);
          if (d < bestD) { bestD = d; best = i; }
        });
        const [tx, ty] = this.waypoints[best];
        if (this._moveToward(tx, ty, this.speed(alarm.state), dt, solids)) {
          this.wp = best;
          this.state = 'patrol';
        }
        break;
      }
      default:
        this.state = 'patrol';
    }

    // Touching the thief while chasing ends the run.
    if (this.state === 'chase' && Math.hypot(player.x - this.x, player.y - this.y) < GUARD.catchRadius + player.r) {
      game.onCaught(this);
    }
    this.wasSeen = seen.seen;
  }
}

export function turnToward(angle, target, maxStep) {
  let d = target - angle;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  if (Math.abs(d) <= maxStep) return target;
  return angle + Math.sign(d) * maxStep;
}

export class SecurityCamera {
  constructor(def) {
    this.name = def.name;
    this.x = def.x;
    this.y = def.y;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep;
    this.speed = def.speed;
    this.angle = def.baseAngle;
    this.disabledUntil = 0;
    this.spotting = false;
    this.pingAt = 0;
    this._now = 0; // game clock, set every update (never wall-clock time)
  }

  get range() { return CAMERA.visionRange; }
  get fov() { return CAMERA.visionFov; }
  get facing() { return this.angle; }

  get disabled() {
    return this._now < this.disabledUntil;
  }

  cone(segments) {
    return conePolygon(this.x, this.y, this.angle, this.fov, this.range, segments);
  }

  update(dt, now, game) {
    this._now = now;
    if (this.disabled) {
      this.spotting = false;
      return;
    }
    this.angle = this.baseAngle + Math.sin(now * this.speed) * this.sweep;
    const { player, segments } = game;
    const inSmoke = game.smokes.some((s) => Math.hypot(player.x - s.x, player.y - s.y) < s.radius);
    const seen = !inSmoke
      ? canSee({ x: this.x, y: this.y, facing: this.angle, fov: this.fov, range: this.range }, player.x, player.y, segments)
      : { seen: false, dist: Infinity };
    this.spotting = seen.seen;
    if (seen.seen) {
      game.alarm.add(CAMERA.alarmPerSec * dt);
      // Ping the nearest guard to investigate (throttled).
      if (now >= this.pingAt) {
        this.pingAt = now + 2.0;
        let best = null;
        let bestD = Infinity;
        for (const g of game.guards) {
          const d = Math.hypot(g.x - player.x, g.y - player.y);
          if (d < bestD) { bestD = d; best = g; }
        }
        if (best && best.state !== 'chase') {
          best.investigateAt = { x: player.x, y: player.y };
          best.suspicion = Math.max(best.suspicion, 45);
          if (best.state === 'patrol') best.state = 'investigate';
        }
      }
    }
  }
}
