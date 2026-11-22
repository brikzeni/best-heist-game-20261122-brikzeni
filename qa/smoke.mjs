// qa/smoke.mjs — first boot check: load the game in headless Chromium,
// report console errors / failed requests, and screenshot the title screen.
// Usage: node qa/smoke.mjs [--port 8080]
import { chromium } from 'playwright-core';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);

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

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const failed = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => failed.push(r.url() + ' :: ' + (r.failure()?.errorText || '')));
page.on('request', (r) => {
  if (!r.url().startsWith('http://localhost') && !r.url().startsWith('data:')) {
    failed.push('NETWORK: ' + r.url());
  }
});

await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 10000 });
await page.waitForTimeout(800);
const phase = await page.evaluate(() => window.__game?.phase);
await page.screenshot({ path: 'qa/smoke-title.png' });
console.log('phase:', phase);
console.log('console errors:', errors.length ? errors : 'none');
console.log('failed/external requests:', failed.length ? failed : 'none');
await browser.close();
if (errors.length || failed.length) process.exit(1);
console.log('SMOKE OK');
