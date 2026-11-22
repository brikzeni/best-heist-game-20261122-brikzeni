// qa/tests.mjs — the full playtest matrix, executed against the real game in
// headless Chromium. Every check is an observable behaviour, not a code claim.
// Usage: node qa/tests.mjs [--port 8081]
import { chromium } from 'playwright-core';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex === -1 ? 8081 : Number(args[portIndex + 1]);

function findChromium() {
  const base = join(process.env.HOME, '.cache', 'ms-playwright');
  for (const d of readdirSync(base)) {
    if (!d.startsWith('chromium-')) continue;
    for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const p = join(base, d, sub);
      if (existsSync(p)) return p;
    }
    const shell = join(base, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
    if (existsSync(shell)) return shell;
  }
  throw new Error('no cached chromium found under ' + base);
}

const results = [];
function check(name, ok, evidence) {
  results.push({ name, ok, evidence });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${evidence ? ' — ' + evidence : ''}`);
}

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = (ms) => page.waitForTimeout(ms);

await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 10000 });
check('boot: title phase, no console errors', (await ev(() => window.__game.phase)) === 'title' && errors.length === 0, `phase=${await ev(() => window.__game.phase)} errors=${errors.length}`);

// start
await page.keyboard.press('Enter');
await sleep(300);
check('start: Enter begins the heist', (await ev(() => window.__game.phase)) === 'playing');

// movement
const x0 = await ev(() => window.__game.player.x);
await page.keyboard.down('d');
await sleep(400);
await page.keyboard.up('d');
const x1 = await ev(() => window.__game.player.x);
check('movement: D moves the thief east', x1 > x0 + 40, `x ${x0.toFixed(0)} -> ${x1.toFixed(0)}`);

// collision: push into the west wall from inside storage (clear of the vent wall)
await ev(() => { const g = window.__game; g.player.x = 100; g.player.y = 140; });
await page.keyboard.down('a');
await sleep(600);
await page.keyboard.up('a');
const cx = await ev(() => window.__game.player.x);
check('collision: west wall stops the thief (no clipping)', cx >= 33 && cx <= 36, `x=${cx.toFixed(1)}`);

// patrols move
const p0 = await ev(() => window.__game.guards.map((g) => [g.x, g.y]));
await sleep(2000);
const p1 = await ev(() => window.__game.guards.map((g) => [g.x, g.y]));
const moved = p0.filter((_, i) => Math.hypot(p1[i][0] - p0[i][0], p1[i][1] - p0[i][1]) > 10).length;
check('patrols: guards walk their routes', moved >= 3, `${moved}/4 guards moved`);

// detection: thief in a guard cone, line of sight clear. Pin the guard's
// waypoint to its own spot so the patrol does not turn it away mid-test.
await ev(() => {
  const g = window.__game;
  const g1 = g.guards[0];
  g1.waypoints = [[600, 300]]; g1.wp = 0;
  g1.x = 600; g1.y = 300; g1.facing = Math.PI / 2; g1.state = 'patrol'; g1.suspicion = 0;
  g.player.x = 600; g.player.y = 420; g.player.crouch = false;
});
await sleep(1500);
const susp = await ev(() => window.__game.guards[0].suspicion);
check('detection: cone + line of sight fills suspicion', susp > 25, `suspicion=${susp.toFixed(0)}`);

// cover: same guard, thief behind a display case (line of sight blocked)
await ev(() => {
  const g = window.__game;
  const g1 = g.guards[0];
  g1.waypoints = [[600, 300]]; g1.wp = 0;
  g1.x = 600; g1.y = 300; g1.facing = Math.PI / 2; g1.state = 'patrol'; g1.suspicion = 0;
  g.player.x = 600; g.player.y = 500; g.player.crouch = false;
});
await sleep(1500);
const susp2 = await ev(() => window.__game.guards[0].suspicion);
check('cover: display case blocks sight', susp2 < 5, `suspicion=${susp2.toFixed(0)}`);

// camera sweep
const a0 = await ev(() => window.__game.cameras[0].angle);
await sleep(1000);
const a1 = await ev(() => window.__game.cameras[0].angle);
check('cameras: sweep angle changes', Math.abs(a1 - a0) > 0.05, `angle ${a0.toFixed(2)} -> ${a1.toFixed(2)}`);

// camera detection: thief under CAM-01. The sweep only crosses the thief
// briefly, so the alarm rise (not a single polled frame) is the evidence.
await ev(() => { const g = window.__game; g.player.x = 640; g.player.y = 200; g.alarm.level = 0; });
await sleep(3000);
const alarmAfter = await ev(() => window.__game.alarm.level);
check('cameras: spotting the thief raises the alarm', alarmAfter > 0.5, `alarm=${alarmAfter.toFixed(1)}`);
// The camera also pinged a guard at the exposed thief: restart clean for the
// tool tests instead of letting that chase end the run mid-matrix.
await page.keyboard.press('r');
await sleep(300);

// EMP disables cameras
await page.keyboard.press('3');
await sleep(200);
const emp = await ev(() => ({ disabled: window.__game.cameras.every((c) => c.disabled), left: window.__game.player.tools.emp }));
check('tool EMP: cameras go dark, charge spent', emp.disabled && emp.left === 0, JSON.stringify(emp));

// smoke hides the thief
await page.keyboard.press('1');
await sleep(200);
const smoke = await ev(() => ({ clouds: window.__game.smokes.length, left: window.__game.player.tools.smoke }));
check('tool smoke: cloud appears, charge spent', smoke.clouds === 1 && smoke.left === 1, JSON.stringify(smoke));

// decoy draws a guard
await ev(() => { const g = window.__game; g.guards[0].x = 700; g.guards[0].y = 400; g.guards[0].state = 'patrol'; g.guards[0].suspicion = 0; });
await page.mouse.click(700, 500);
await sleep(300);
const decoy = await ev(() => ({ n: window.__game.decoys.length, left: window.__game.player.tools.decoy }));
let gState = '';
for (let i = 0; i < 10; i++) {
  await sleep(250);
  gState = await ev(() => window.__game.guards[0].state);
  if (gState === 'investigate' || gState === 'suspicious') break;
}
check('tool decoy: thrown coin draws a guard to investigate', decoy.n === 1 && decoy.left === 2 && (gState === 'investigate' || gState === 'suspicious'), `decoys=${decoy.n} left=${decoy.left} guard=${gState}`);

// loot: hold E at the artifact case
await ev(() => { const g = window.__game; g.player.x = 1065; g.player.y = 145; });
await page.keyboard.down('e');
await sleep(2000);
await page.keyboard.up('e');
const held = await ev(() => window.__game.player.hasArtifact);
check('loot: holding E lifts the Glass Star', held === true, `hasArtifact=${held}`);

// win: reach an exit with the loot
await ev(() => { const g = window.__game; g.player.x = 170; g.player.y = 705; });
await sleep(400);
const won = await ev(() => ({ phase: window.__game.phase, rank: window.__game.rank?.name }));
check('win: exit with the loot completes the heist', won.phase === 'won' && !!won.rank, JSON.stringify(won));

// fail: a chasing guard catches the thief
await page.keyboard.press('r');
await sleep(300);
await ev(() => {
  const g = window.__game;
  g.guards[0].state = 'chase';
  g.guards[0].lastSeen = { x: g.player.x, y: g.player.y };
  g.guards[0].loseSightAt = g.now + 30;
  g.guards[0].facing = Math.PI; // face the thief so the chase holds
  g.guards[0].x = g.player.x + 50;
  g.guards[0].y = g.player.y;
  g.guards[0].suspicion = 100;
});
await sleep(1500);
const lost = await ev(() => ({ phase: window.__game.phase, reason: window.__game.loseReason }));
check('fail: caught by a guard ends the run', lost.phase === 'lost' && /Caught/.test(lost.reason), JSON.stringify(lost));

// restart: clean reset
await page.keyboard.press('r');
await sleep(300);
const rst = await ev(() => ({
  phase: window.__game.phase,
  x: window.__game.player.x,
  y: window.__game.player.y,
  held: window.__game.player.hasArtifact,
  alarm: window.__game.alarm.level,
}));
check('restart: R resets the heist cleanly', rst.phase === 'playing' && Math.abs(rst.x - 170) < 1 && Math.abs(rst.y - 640) < 1 && !rst.held && rst.alarm === 0, JSON.stringify(rst));

// pause / resume
await page.keyboard.press('Escape');
await sleep(200);
const paused = await ev(() => window.__game.phase);
await page.keyboard.press('Escape');
await sleep(200);
const resumed = await ev(() => window.__game.phase);
check('pause: Esc pauses and resumes', paused === 'paused' && resumed === 'playing', `${paused} -> ${resumed}`);

// lockdown: alarm at 100 seals the archive
await ev(() => {
  const g = window.__game;
  g.alarm.level = 99.5;
  const g1 = g.guards[0];
  g1.x = 600; g1.y = 300; g1.facing = Math.PI / 2; g1.state = 'patrol'; g1.suspicion = 80;
  g.player.x = 600; g.player.y = 420;
});
await sleep(1500);
const lock = await ev(() => ({ phase: window.__game.phase, reason: window.__game.loseReason }));
check('alarm lockdown: 100% alarm seals the archive', lock.phase === 'lost' && /LOCKDOWN/.test(lock.reason), JSON.stringify(lock));

// vent: crouched entry works, standing entry is blocked
await page.keyboard.press('r');
await sleep(300);
await ev(() => { const g = window.__game; g.player.x = 140; g.player.y = 110; });
await page.keyboard.down('Shift');
await page.keyboard.down('w');
await sleep(1200);
await page.keyboard.up('w');
await page.keyboard.up('Shift');
const ventY = await ev(() => window.__game.player.y);
await ev(() => { const g = window.__game; g.player.x = 140; g.player.y = 110; });
await page.keyboard.down('w');
await sleep(1000);
await page.keyboard.up('w');
const blockedY = await ev(() => window.__game.player.y);
check('vent: crouch enters, standing is blocked at the mouth', ventY < 70 && blockedY >= 79, `crouched y=${ventY.toFixed(0)} standing y=${blockedY.toFixed(0)}`);

// offline: block everything except localhost, reload, game still boots
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx2.route('**/*', (route) => {
  const url = route.request().url();
  if (url.startsWith('http://localhost')) return route.continue();
  return route.abort();
});
const page2 = await ctx2.newPage();
const errors2 = [];
page2.on('pageerror', (e) => errors2.push(e.message));
await page2.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page2.waitForFunction(() => window.__shotReady === true, null, { timeout: 10000 });
const offPhase = await page2.evaluate(() => window.__game?.phase);
check('offline: game boots with all non-local traffic blocked', offPhase === 'title' && errors2.length === 0, `phase=${offPhase} errors=${errors2.length}`);
await ctx2.close();

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length || errors.length) {
  console.log('console errors on main page:', errors);
  process.exit(1);
}
console.log('ALL QA PASS');
