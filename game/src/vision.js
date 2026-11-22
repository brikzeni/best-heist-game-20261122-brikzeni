// vision.js — honest sight: the cones drawn on screen are the cones tested.
// Ray casting against wall/obstacle segments; a watcher sees the thief only when
// the thief is inside its vision wedge AND the line of sight is unobstructed.

export function rayHit(ox, oy, dx, dy, segments, maxDist) {
  let best = maxDist;
  for (const s of segments) {
    const rx = s.bx - s.ax;
    const ry = s.by - s.ay;
    const den = dx * ry - dy * rx;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((s.ax - ox) * ry - (s.ay - oy) * rx) / den;
    const u = ((s.ax - ox) * dy - (s.ay - oy) * dx) / den;
    if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
  }
  return best;
}

// Visibility polygon from a point: cast one ray per segment endpoint (+/- epsilon).
export function visibilityPolygon(ox, oy, segments, maxDist) {
  const angles = new Set();
  for (const s of segments) {
    for (const [px, py] of [[s.ax, s.ay], [s.bx, s.by]]) {
      const a = Math.atan2(py - oy, px - ox);
      angles.add(a - 0.0002);
      angles.add(a);
      angles.add(a + 0.0002);
    }
  }
  const pts = [];
  for (const a of angles) {
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const t = rayHit(ox, oy, dx, dy, segments, maxDist);
    pts.push([ox + dx * t, oy + dy * t, a]);
  }
  pts.sort((p, q) => p[2] - q[2]);
  return pts.map(([x, y]) => [x, y]);
}

// Wedge (facing +/- fov/2, out to range) clipped by what the walls allow.
export function conePolygon(ox, oy, facing, fov, range, segments) {
  const steps = 26;
  const pts = [[ox, oy]];
  for (let i = 0; i <= steps; i++) {
    const a = facing - fov / 2 + (fov * i) / steps;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const t = rayHit(ox, oy, dx, dy, segments, range);
    pts.push([ox + dx * t, oy + dy * t]);
  }
  return pts;
}

export function hasLineOfSight(ax, ay, bx, by, segments) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return true;
  const t = rayHit(ax, ay, dx / dist, dy / dist, segments, dist - 0.5);
  return t >= dist - 1.0;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// The single source of truth for "can this watcher see the thief right now".
export function canSee(watcher, tx, ty, segments) {
  const dx = tx - watcher.x;
  const dy = ty - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > watcher.range) return { seen: false, dist };
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, watcher.facing)) > watcher.fov / 2) return { seen: false, dist };
  if (!hasLineOfSight(watcher.x, watcher.y, tx, ty, segments)) return { seen: false, dist };
  return { seen: true, dist };
}

// Point inside a polygon (ray-casting test), used by the smoke-cloud check.
export function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
