// level.js — the museum as data: rooms, walls, cover, patrols, cameras, loot, exits.
// Layout (1280x720, one screen, no scrolling so every screenshot is complete):
//   top-left  Storage (tool stash + service exit)   | top  Vent shaft (crouch-only shortcut)
//   centre    Main Gallery (cases, pillars, statue) | top-right  The Glass Archive vault
//   bottom-left Entry Lobby (player start)          | right  Security Corridor (camera patrol)
//
// Room graph (level-design skill: critical path, golden path, branches, gating):
//   entry -> gallery -> vault            (golden path, patrolled)
//   entry -> storage -> vent -> vault    (quiet branch, needs crouch)
//   gallery -> corridor -> vault         (short branch, camera + guard)
// The vault door is open but watched: no key soft-lock is possible.

export const ROOMS = {
  entry: { exits: [{ to: 'gallery' }, { to: 'storage' }] },
  storage: { exits: [{ to: 'entry' }, { to: 'vent' }], grants: 'smoke+1' },
  gallery: { exits: [{ to: 'entry' }, { to: 'vault' }, { to: 'corridor' }] },
  vent: { exits: [{ to: 'storage' }, { to: 'vault' }], needs: 'crouch' },
  corridor: { exits: [{ to: 'gallery' }, { to: 'vault' }] },
  vault: { exits: [{ to: 'gallery' }, { to: 'corridor' }, { to: 'vent' }], grants: 'artifact' },
};

export const BEATS = [
  { room: 'entry', type: 'teach', intensity: 0.1 },
  { room: 'gallery', type: 'develop', intensity: 0.5 },
  { room: 'vault', type: 'twist', intensity: 0.8 },
  { room: 'escape', type: 'climax', intensity: 1.0 },
];

// BFS over (room, held keys): the goal must be reachable from the start.
export function goalReachable(rooms, start, goal) {
  const pending = [{ room: start, keys: new Set() }];
  const seen = new Set();
  while (pending.length) {
    const { room, keys } = pending.pop();
    const have = new Set(keys);
    const info = rooms[room] || {};
    if (info.grants) have.add(info.grants);
    const id = room + '|' + [...have].sort().join(',');
    if (seen.has(id)) continue;
    seen.add(id);
    if (room === goal) return true;
    for (const exit of info.exits || []) {
      if (!exit.needs || have.has(exit.needs) || exit.needs === 'crouch') {
        pending.push({ room: exit.to, keys: have });
      }
    }
  }
  return false;
}

// Walls block movement AND sight. All rects: {x, y, w, h}.
export const WALLS = [
  // outer shell
  { x: 0, y: 0, w: 1280, h: 20 },
  { x: 0, y: 700, w: 1280, h: 20 },
  { x: 0, y: 0, w: 20, h: 720 },
  { x: 1260, y: 0, w: 20, h: 720 },
  // vault west wall (door gap y 120-180)
  { x: 920, y: 20, w: 16, h: 100 },
  { x: 920, y: 180, w: 16, h: 80 },
  // vault south wall
  { x: 920, y: 244, w: 340, h: 16 },
  // corridor west wall (door gaps y 380-440 and y 560-620)
  { x: 1060, y: 280, w: 16, h: 100 },
  { x: 1060, y: 440, w: 16, h: 120 },
  { x: 1060, y: 620, w: 16, h: 80 },
  // storage / gallery divider (door gap x 240-320)
  { x: 20, y: 240, w: 220, h: 16 },
  { x: 320, y: 240, w: 240, h: 16 },
  // lobby / gallery divider (door gap x 260-340)
  { x: 20, y: 480, w: 240, h: 16 },
  { x: 340, y: 480, w: 220, h: 16 },
  // vent shaft south wall (entrances x 120-160 and x 820-860)
  { x: 60, y: 80, w: 60, h: 12 },
  { x: 160, y: 80, w: 660, h: 12 },
  { x: 860, y: 80, w: 60, h: 12 },
];

// Vent shaft region: only passable while crouched (low ceiling).
export const VENT = { x: 60, y: 20, w: 860, h: 60 };

// Obstacles block movement AND sight (display cases, pillars, statue plinth, benches).
export const OBSTACLES = [
  { x: 430, y: 320, w: 110, h: 55, kind: 'case' },
  { x: 720, y: 320, w: 110, h: 55, kind: 'case' },
  { x: 560, y: 430, w: 110, h: 55, kind: 'case' },
  { x: 860, y: 430, w: 110, h: 55, kind: 'case' },
  { x: 380, y: 140, w: 34, h: 34, kind: 'pillar' },
  { x: 760, y: 140, w: 34, h: 34, kind: 'pillar' },
  { x: 380, y: 580, w: 34, h: 34, kind: 'pillar' },
  { x: 760, y: 580, w: 34, h: 34, kind: 'pillar' },
  { x: 615, y: 375, w: 70, h: 70, kind: 'statue' },
  { x: 500, y: 620, w: 140, h: 24, kind: 'bench' },
  { x: 800, y: 620, w: 140, h: 24, kind: 'bench' },
  // artifact case inside the vault (the loot sits in it)
  { x: 1080, y: 110, w: 120, h: 70, kind: 'artifact-case' },
];

// Wall art frames (visual landmarks, also guide the eye along routes).
export const FRAMES = [
  { x: 60, y: 24, w: 90, h: 54, hue: '#B85C38' },
  { x: 640, y: 24, w: 90, h: 54, hue: '#4E7A9E' },
  { x: 300, y: 244, w: 0, h: 0, hue: '' }, // placeholder removed below
  { x: 940, y: 24, w: 90, h: 54, hue: '#7A4E9E' },
  { x: 1080, y: 24, w: 90, h: 54, hue: '#3E9E7A' },
].filter((f) => f.w > 0);

export const GUARD_PATROLS = [
  {
    name: 'Marlow', color: '#FFD166',
    // Big gallery rectangle: west leg threads the lobby door gap (x 260-340),
    // east leg runs the vault approach lane. Every leg verified clear of cases.
    waypoints: [[320, 300], [1000, 300], [1000, 520], [320, 520]],
  },
  {
    name: 'Voss', color: '#FF9F5A',
    // Tight loop guarding the vault door approach.
    waypoints: [[980, 300], [980, 520], [1020, 520], [1020, 300]],
  },
  {
    name: 'Iris', color: '#E58AE5',
    waypoints: [[1150, 320], [1150, 640], [1210, 640], [1210, 320]],
  },
  {
    name: 'Kane', color: '#8AD6E5',
    // West gallery: the first patrol the player meets after the lobby door.
    waypoints: [[300, 300], [560, 300], [560, 400], [300, 400]],
  },
];

export const CAMERAS = [
  // Mounted just below the vent wall so its line of sight reaches the gallery.
  { name: 'CAM-01', x: 640, y: 100, baseAngle: Math.PI / 2, sweep: (50 * Math.PI) / 180, speed: 0.45 },
  { name: 'CAM-02', x: 936, y: 96, baseAngle: (135 * Math.PI) / 180, sweep: (45 * Math.PI) / 180, speed: 0.6 },
];

export const ARTIFACT = { x: 1140, y: 145, name: 'The Glass Star', interactRadius: 78 };

export const EXITS = [
  { name: 'Main Entrance', x: 140, y: 700, w: 60, h: 20 },
  { name: 'Service Exit', x: 60, y: 20, w: 50, h: 20 },
];

export const PICKUPS = [
  { kind: 'smoke', x: 150, y: 120, amount: 1 },
  { kind: 'decoy', x: 1200, y: 680, amount: 2 },
];

export const PLAYER_START = { x: 170, y: 640 };

// All segments that block sight: walls + obstacles.
export function sightSegments() {
  const segs = [];
  for (const r of [...WALLS, ...OBSTACLES]) {
    segs.push({ ax: r.x, ay: r.y, bx: r.x + r.w, by: r.y });
    segs.push({ ax: r.x + r.w, ay: r.y, bx: r.x + r.w, by: r.y + r.h });
    segs.push({ ax: r.x + r.w, ay: r.y + r.h, bx: r.x, by: r.y + r.h });
    segs.push({ ax: r.x, ay: r.y + r.h, bx: r.x, by: r.y });
  }
  return segs;
}

// All rects that block movement: walls + obstacles.
export function solidRects() {
  return [...WALLS, ...OBSTACLES];
}

export function inVent(x, y) {
  return x > VENT.x && x < VENT.x + VENT.w && y > VENT.y && y < VENT.y + VENT.h;
}
