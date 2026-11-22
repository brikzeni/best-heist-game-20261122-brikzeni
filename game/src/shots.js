// shots.js — deterministic staging for real screenshots (?shot=<name>).
// Each preset is a genuine game state: the loop keeps running from it, so the
// captured frame is a real render of the game's own code, never a mock-up.

export function applyShotPreset(game, name) {
  const p = game.player;
  const [g1, g2, g3, g4] = game.guards;
  const [c1, c2] = game.cameras;
  game.phase = 'playing';
  game.elapsed = 0;
  game.stats.detections = 0;

  if (name === 'start') {
    // Hero frame: thief entering the gallery, guards mid-patrol, cones sweeping,
    // both cameras live, the Glass Star glowing, alarm CLEAR.
    p.x = 300; p.y = 600; p.crouch = false; p.hasArtifact = false;
    g1.x = 640; g1.y = 340; g1.facing = Math.PI / 2; g1.wp = 2;
    g2.x = 980; g2.y = 300; g2.facing = Math.PI; g2.wp = 0;
    g3.x = 1150; g3.y = 480; g3.facing = Math.PI / 2; g3.wp = 1;
    g4.x = 300; g4.y = 300; g4.facing = 0; g4.wp = 0;
    game.alarm.level = 0;
    game.objective = 'Reach the vault — lift the Glass Star';
  } else if (name === 'play') {
    // Stealth tension: thief crouched behind a case, a guard suspicious,
    // cone overlap, alarm SUSPICIOUS.
    p.x = 480; p.y = 405; p.crouch = true; p.hasArtifact = false;
    g1.x = 560; g1.y = 340; g1.facing = Math.PI * 0.72; g1.state = 'suspicious';
    g1.suspicion = 55; g1.lastSeen = { x: 480, y: 405 }; g1.lookUntil = game.now + 30;
    g2.x = 900; g2.y = 520; g2.facing = -Math.PI / 2; g2.wp = 2;
    g3.x = 1150; g3.y = 560; g3.facing = -Math.PI / 2; g3.wp = 1;
    g4.x = 400; g4.y = 300; g4.facing = Math.PI / 2; g4.wp = 1;
    game.alarm.level = 42;
    game.stats.detections = 1;
    game.objective = 'Reach the vault — lift the Glass Star';
  } else if (name === 'heist') {
    // The lift: thief channelling at the artifact case, smoke at the vault door,
    // a camera sweeping, alarm SUSPICIOUS.
    p.x = 1065; p.y = 145; p.crouch = false; p.hasArtifact = false; p.channel = 0.62;
    g1.x = 700; g1.y = 560; g1.facing = 0; g1.wp = 2;
    g2.x = 980; g2.y = 300; g2.facing = Math.PI * 0.85; g2.state = 'investigate';
    g2.suspicion = 48; g2.investigateAt = { x: 960, y: 150 };
    g3.x = 1150; g3.y = 320; g3.facing = Math.PI / 2; g3.wp = 0;
    g4.x = 400; g4.y = 300; g4.facing = Math.PI; g4.wp = 2;
    game.smokes.push({ x: 940, y: 150, radius: 92, until: game.now + 30 });
    game.alarm.level = 48;
    game.stats.detections = 2;
    game.objective = 'Hold E — lift the Glass Star';
  } else if (name === 'escape') {
    // The getaway: artifact held, a guard chasing, alarm ALERT, one camera dark.
    // The guard starts far enough back that the chase reads on camera without
    // catching the thief inside the first second.
    p.x = 560; p.y = 600; p.crouch = false; p.hasArtifact = true;
    g1.x = 860; g1.y = 400; g1.facing = -Math.PI * 0.6; g1.state = 'chase';
    g1.suspicion = 100; g1.lastSeen = { x: 560, y: 600 }; g1.loseSightAt = game.now + 30;
    g2.x = 880; g2.y = 300; g2.facing = Math.PI; g2.wp = 3;
    g3.x = 1150; g3.y = 640; g3.facing = -Math.PI / 2; g3.wp = 1;
    g4.x = 150; g4.y = 560; g4.facing = 0; g4.wp = 0;
    c2.disabledUntil = game.now + 30;
    game.alarm.level = 78;
    game.stats.detections = 3;
    game.objective = 'Escape through any exit';
  }
}
