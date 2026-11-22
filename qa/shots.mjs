// qa/shots.mjs — capture the 4 genuine gameplay screenshots (1280x720 JPEG).
// Each shot is a real render of the game's own code via ?shot= presets.
// Usage: node qa/shots.mjs [--port 8081]
import { chromium } from 'playwright-core';
import { readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
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

const SHOTS = [
  { name: '1-start.jpg', query: '?shot=start' },
  { name: '2-play.jpg', query: '?shot=play' },
  { name: '3-heist.jpg', query: '?shot=heist' },
  { name: '4-escape.jpg', query: '?shot=escape' },
];

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
for (const shot of SHOTS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${port}/${shot.query}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 10000 });
  await page.waitForTimeout(700);
  const state = await page.evaluate(() => ({
    phase: window.__game?.phase,
    alarm: window.__game?.alarm.state,
    guards: window.__game?.guards.map((g) => g.state),
  }));
  const file = join('screenshots', shot.name);
  await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
  const size = statSync(file).size;
  console.log(`${shot.name}: ${size} bytes (${(size / 1024).toFixed(0)} KiB) ${size > 262144 ? 'OVER 256 KiB!' : 'ok'} |`, JSON.stringify(state), errors.length ? '| ERRORS: ' + errors.join(' ; ') : '');
  await page.close();
}
await browser.close();
console.log('SHOTS DONE');
