/**
 * End-to-end smoke test: drives the PRODUCTION build in a real browser.
 *
 * Typecheck and lint cannot tell you that the player stops at a wall, that the
 * interact prompt picks the right sign, or that the thumbstick moves anybody.
 * This can, so it is the check that actually guards the prototype's behaviour.
 *
 *   npm run build
 *   npm run preview &            # must be serving on port 4173
 *   npx playwright install chromium   # first time only
 *   npm run test:smoke
 *
 * Playwright is intentionally NOT a devDependency: it pulls a browser download
 * that most contributors to a data-file change do not need. Install it on
 * demand with the command above.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error(
    'playwright is not installed.\n' +
      'Run:  npm i -D playwright && npx playwright install chromium',
  );
  process.exit(2);
}

// Must match `base` in vite.config.ts, and the port `npm run preview` uses.
const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173/ghanaian-campus-life-simulator/';
const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
}

// SwiftShader so this runs on a CI box with no GPU. On a developer machine it
// falls back to real hardware acceleration automatically.
const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
  ],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });

const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

await page.goto(BASE + '?debug=1', { waitUntil: 'load' });
await page.waitForFunction(() => window.__campusDebug !== undefined, { timeout: 30000 });
await page.waitForSelector('#start-screen:not([hidden])', { timeout: 30000 });
check('loading finished, start screen shown', true);

const stats = await page.evaluate(() => window.__campusDebug.getStats());
console.log('   stats:', JSON.stringify(stats));
check('world generated with batched geometry', stats.batches > 5 && stats.triangles > 10000, JSON.stringify(stats));
check('colliders registered', stats.colliders > 100, `${stats.colliders} colliders`);
check('interactables registered', stats.interactables >= 10, `${stats.interactables} interactables`);

await page.click('#start-button');
await page.waitForTimeout(400);
check('phase is playing after start', (await page.evaluate(() => window.__campusDebug.getPhase())) === 'playing');
check('HUD visible', await page.isVisible('#hud'));

// A rendered 3D scene must not be a flat fill. PNG size is a reliable proxy:
// a single-colour frame compresses to a few KB, a detailed scene does not.
const firstShot = await page.screenshot();
check('canvas renders a detailed scene', firstShot.length > 40000, `${(firstShot.length / 1024).toFixed(0)} KB screenshot`);

// Movement: hold W and confirm the player walks north (-Z).
const before = await page.evaluate(() => window.__campusDebug.getPlayer());
await page.keyboard.down('w');
await page.waitForTimeout(1200);
await page.keyboard.up('w');
await page.waitForTimeout(200);
const after = await page.evaluate(() => window.__campusDebug.getPlayer());
console.log('   before:', JSON.stringify(before), '\n   after: ', JSON.stringify(after));
check('W walks forward (northwards, -Z)', after.z < before.z - 1.5, `z ${before.z.toFixed(2)} -> ${after.z.toFixed(2)}`);

// Zone naming follows position.
check('HUD zone name updates', (await page.evaluate(() => window.__campusDebug.getZoneName())).length > 0,
  await page.evaluate(() => window.__campusDebug.getZoneName()));

// Collision: walk hard into the Great Hall's south face and confirm we stop short.
await page.evaluate(() => window.__campusDebug.teleport(0, -50, 0));
await page.waitForTimeout(100);
await page.keyboard.down('w');
await page.keyboard.down('Shift');
await page.waitForTimeout(2500);
await page.keyboard.up('Shift');
await page.keyboard.up('w');
await page.waitForTimeout(200);
const blocked = await page.evaluate(() => window.__campusDebug.getPlayer());
console.log('   after running at Great Hall:', JSON.stringify(blocked));
// Great Hall walls start at z = -56 (front verandah edge ~ -53.4). Must not pass.
check('collision stops the player at the Great Hall', blocked.z > -54.5, `stopped at z = ${blocked.z.toFixed(2)}`);

// Interaction: walk up to the campus welcome sign and read it.
await page.evaluate(() => window.__campusDebug.teleport(-9, 16.5, 0));
await page.waitForTimeout(100);
await page.keyboard.down('w');
await page.waitForTimeout(900);
await page.keyboard.up('w');
await page.waitForTimeout(250);
const focusId = await page.evaluate(() => window.__campusDebug.getFocusId());
check('interaction prompt targets the campus sign', focusId === 'sign:campus-welcome-sign', String(focusId));
check('prompt element is visible', await page.isVisible('#interaction-prompt'));

await page.keyboard.press('e');
await page.waitForTimeout(300);
check('phase is reading after pressing E', (await page.evaluate(() => window.__campusDebug.getPhase())) === 'reading');
const infoTitle = await page.textContent('#info-title');
check('sign content rendered', /Akwaaba/.test(infoTitle ?? ''), infoTitle ?? '');
await page.click('#info-close');
await page.waitForTimeout(250);
check('closing the sign resumes play', (await page.evaluate(() => window.__campusDebug.getPhase())) === 'playing');

// Pause / resume.
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('Escape pauses', (await page.evaluate(() => window.__campusDebug.getPhase())) === 'paused' && await page.isVisible('#pause-screen'));
await page.click('#resume-button');
await page.waitForTimeout(300);
check('Resume button resumes', (await page.evaluate(() => window.__campusDebug.getPhase())) === 'playing');

// Quality switch rebuilds the world without losing the player.
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
const posBeforeQuality = await page.evaluate(() => window.__campusDebug.getPlayer());
await page.selectOption('#quality-select', 'low');
await page.waitForTimeout(2500);
const statsLow = await page.evaluate(() => window.__campusDebug.getStats());
const posAfterQuality = await page.evaluate(() => window.__campusDebug.getPlayer());
check('low quality rebuild succeeds', statsLow.batches > 5, JSON.stringify(statsLow));
check('player position survives a quality change', Math.abs(posAfterQuality.x - posBeforeQuality.x) < 0.5 && Math.abs(posAfterQuality.z - posBeforeQuality.z) < 0.5,
  `${posBeforeQuality.z.toFixed(2)} -> ${posAfterQuality.z.toFixed(2)}`);
check('low preset scatters fewer trees', statsLow.submissions < stats.submissions, `${stats.submissions} -> ${statsLow.submissions}`);

await page.screenshot({ path: 'smoke-desktop.png' });

// Mobile/touch pass in a phone-sized viewport with touch enabled.
const mobile = await browser.newContext({
  viewport: { width: 393, height: 786 },
  deviceScaleFactor: 2.75,
  isMobile: true,
  hasTouch: true,
});
const mpage = await mobile.newPage();
const mobileErrors = [];
mpage.on('pageerror', (e) => mobileErrors.push(e.message));
mpage.on('console', (m) => { if (m.type() === 'error') mobileErrors.push(m.text()); });
await mpage.goto(BASE + '?debug=1', { waitUntil: 'load' });
await mpage.waitForFunction(() => window.__campusDebug !== undefined, { timeout: 30000 });
await mpage.waitForSelector('#start-screen:not([hidden])', { timeout: 30000 });
await mpage.click('#start-button');
await mpage.waitForTimeout(400);
check('touch controls shown on a touch viewport', await mpage.isVisible('#touch-joystick'));
check('crosshair hidden on a touch viewport', !(await mpage.isVisible('#crosshair')));

// Drive the virtual joystick forward with a synthetic touch drag.
const ring = await mpage.locator('#touch-joystick').boundingBox();
const cx = ring.x + ring.width / 2;
const cy = ring.y + ring.height / 2;
const mBefore = await mpage.evaluate(() => window.__campusDebug.getPlayer());
await mpage.evaluate(({ cx, cy }) => {
  const el = document.getElementById('touch-joystick');
  const make = (type, x, y) => new PointerEvent(type, {
    pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true,
    clientX: x, clientY: y,
  });
  el.setPointerCapture = () => {};
  el.releasePointerCapture = () => {};
  el.dispatchEvent(make('pointerdown', cx, cy));
  el.dispatchEvent(make('pointermove', cx, cy - 60));
}, { cx, cy });
await mpage.waitForTimeout(1200);
const mAfter = await mpage.evaluate(() => window.__campusDebug.getPlayer());
console.log('   touch before:', JSON.stringify(mBefore), '\n   touch after: ', JSON.stringify(mAfter));
check('virtual joystick walks the player forward', mAfter.z < mBefore.z - 1, `z ${mBefore.z.toFixed(2)} -> ${mAfter.z.toFixed(2)}`);

// Touch look drag turns the camera.
const yawBefore = mAfter.yawDegrees;
await mpage.evaluate(() => {
  const el = document.getElementById('touch-look');
  const r = el.getBoundingClientRect();
  const make = (type, x, y) => new PointerEvent(type, {
    pointerId: 2, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true,
    clientX: x, clientY: y,
  });
  el.setPointerCapture = () => {};
  el.releasePointerCapture = () => {};
  const x = r.x + r.width / 2, y = r.y + r.height / 2;
  el.dispatchEvent(make('pointerdown', x, y));
  el.dispatchEvent(make('pointermove', x - 120, y));
  el.dispatchEvent(make('pointerup', x - 120, y));
});
await mpage.waitForTimeout(400);
const yawAfter = (await mpage.evaluate(() => window.__campusDebug.getPlayer())).yawDegrees;
check('touch drag turns the camera', Math.abs(yawAfter - yawBefore) > 5, `yaw ${yawBefore.toFixed(1)} -> ${yawAfter.toFixed(1)}`);

await mpage.screenshot({ path: 'smoke-mobile.png' });

check('no console errors (desktop)', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 400));
check('no console errors (mobile)', mobileErrors.length === 0, mobileErrors.join(' | ').slice(0, 400));

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
