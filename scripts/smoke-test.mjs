/**
 * End-to-end smoke test: drives the PRODUCTION build in a real browser.
 *
 * Typecheck and lint cannot tell you that the player stops at a wall, that the
 * third-person camera stays out of buildings, or that a sideways swipe no
 * longer tips the view at the sky. This can, so it is the check that actually
 * guards the game's behaviour.
 *
 *   npm run build
 *   npm run preview &                 # must be serving on port 4173
 *   npx playwright install chromium   # first time only
 *   npm run test:smoke
 *
 * Playwright is intentionally NOT a devDependency: it pulls a browser download
 * that most contributors to a data-file change do not need.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('playwright is not installed.\nRun:  npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

// Must match `base` in vite.config.ts, and the port `npm run preview` uses.
const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173/ghanaian-campus-life-simulator/';
/** Master-plan pixels to world metres — must match PLAN in campusLayout.ts. */
const plan = (px, py) => [(px - 1000) * 0.15, (py - 558) * 0.15];

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
}

/** Polls the debug API until the game reaches `phase`; SwiftShader is slow to get there. */
async function waitForPhase(target, phase, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if ((await target.evaluate(() => window.__campusDebug.getPhase())) === phase) {
      return true;
    }
    await target.waitForTimeout(120);
  }
  return false;
}

/** Polls until the interaction prompt targets `id` (or anything, if `id` is omitted). */
async function waitForFocus(target, id, timeout = 5000) {
  const end = Date.now() + timeout;
  let focus = null;
  while (Date.now() < end) {
    focus = await target.evaluate(() => window.__campusDebug.getFocusId());
    if (focus === id) {
      break;
    }
    await target.waitForTimeout(120);
  }
  return focus;
}

/** New Story → arrival cinematic → Skip → character creation → Begin. */
async function startNewStory(target, { name, programme, label }) {
  await target.click('#start-button');
  check(`${label}new story opens the arrival cinematic`, await waitForPhase(target, 'cinematic'));
  check(`${label}Skip button visible from the first frame`, await target.isVisible('#cinematic-skip'));
  await target.click('#cinematic-skip');
  check(`${label}Skip goes to character creation`, await waitForPhase(target, 'creating') && (await target.isVisible('#creation-screen')));
  await target.fill('#creation-name', name);
  await target.click(`label.creation-option:has(input[value="${programme}"])`);
  await target.click('#creation-confirm');
  return waitForPhase(target, 'playing');
}

// SwiftShader so this runs on a CI box with no GPU.
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});

// ============================================================== desktop
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const desktopErrors = [];
page.on('console', (m) => { if (m.type() === 'error') desktopErrors.push(m.text()); });
page.on('pageerror', (e) => desktopErrors.push('pageerror: ' + e.message));
const debug = (fn, arg) => page.evaluate(fn, arg);

await page.goto(BASE + '?debug=1', { waitUntil: 'load' });
await page.waitForSelector('#start-screen:not([hidden])', { timeout: 90000 });
check('loading finished, start screen shown', true);

const stats = await debug(() => window.__campusDebug.getStats());
check('world generated and batched', stats.batches > 20 && stats.batches < 60 && stats.triangles > 30000, JSON.stringify(stats));
check('colliders registered', stats.colliders > 200, `${stats.colliders}`);
check('interactables registered (signs + plaques)', stats.interactables >= 12, `${stats.interactables}`);

check('title screen offers a new story', (await page.textContent('#start-button')) === 'New Story');
check('phase is playing after character creation', await startNewStory(page, { name: 'Esi', programme: 'communication', label: '' }));
{
  const story = await debug(() => window.__campusDebug.getStory());
  check('story starts at M01 with the created student', story?.missionId === 'm01' && story.name === 'Esi' && story.programme === 'communication', JSON.stringify(story));
  check('objective card shows the first step', /Uncle Bright/.test((await page.textContent('#objective-text')) ?? ''));
}
check('HUD visible', await page.isVisible('#hud'));
check('location pill shows the gate at spawn', (await page.textContent('#location-label')) === 'Main Gate');

const shot = await page.screenshot();
check('canvas renders a detailed scene', shot.length > 60000, `${(shot.length / 1024).toFixed(0)} KB`);

// Walk forward from the spawn, through the gate. Held for a while because a
// software renderer manages only a few frames a second, and the game caps the
// simulated time per frame.
const before = await debug(() => window.__campusDebug.getPlayer());
await page.keyboard.down('w');
await page.waitForTimeout(3000);
await page.keyboard.up('w');
await page.waitForTimeout(200);
const after = await debug(() => window.__campusDebug.getPlayer());
check('W walks forward, into campus (-Z)', after.z < before.z - 1.5, `z ${before.z.toFixed(2)} -> ${after.z.toFixed(2)}`);

// Collision: sprint west into the Library's east wing and stop at its verandah.
{
  const [x, z] = plan(530, 470);
  await debug(({ x, z }) => window.__campusDebug.teleport(x, z, 90), { x, z });
  await page.keyboard.down('Shift');
  await page.keyboard.down('w');
  await page.waitForTimeout(2200);
  await page.keyboard.up('w');
  await page.keyboard.up('Shift');
  await page.waitForTimeout(200);
  const stopped = await debug(() => window.__campusDebug.getPlayer());
  // Library east wall at plan x 497, plus a 2.4 m verandah and 0.25 m margin.
  const colliderEdge = (497 - 1000) * 0.15 + 2.4 + 0.25;
  check(
    'collision stops the player at the Library',
    stopped.x > colliderEdge && stopped.x < x - 0.5,
    `stopped at x = ${stopped.x.toFixed(2)} (edge ${colliderEdge.toFixed(2)})`,
  );
}

// Interaction: stand in front of the welcome board and read it.
{
  const [sx, sz] = plan(1092, 978);
  await debug(({ x, z }) => window.__campusDebug.teleport(x, z, -42.6), { x: sx - 2.3, z: sz + 2.5 });
  const focus = await waitForFocus(page, 'sign:campus-welcome-sign');
  const phase = await debug(() => window.__campusDebug.getPhase());
  check('prompt targets the campus sign', focus === 'sign:campus-welcome-sign', `${focus} (phase ${phase})`);
  check('prompt element visible', await page.isVisible('#interaction-prompt'));
  await page.keyboard.press('e');
  check('E opens the sign', await waitForPhase(page, 'reading'));
  check('sign content rendered', /Akwaaba/.test((await page.textContent('#info-title')) ?? ''));
  await page.click('#info-close');
  await page.waitForTimeout(250);
  check('closing the sign resumes play', (await debug(() => window.__campusDebug.getPhase())) === 'playing');
}

// Story: talk to Uncle Bright, make a choice, finish the conversation.
{
  const [bx, bz] = plan(972, 961);
  await debug(({ x, z }) => window.__campusDebug.teleport(x, z, 90), { x: bx, z: bz });
  check('prompt targets Uncle Bright', (await waitForFocus(page, 'npc:uncle-bright')) === 'npc:uncle-bright');
  await page.keyboard.press('e');
  check('E starts a conversation', await waitForPhase(page, 'dialogue') && (await page.isVisible('#dialogue')));
  check('dialogue shows the speaker', (await page.textContent('#dialogue-name')) === 'Uncle Bright');
  let sawChoices = false;
  for (let line = 0; line < 10 && (await debug(() => window.__campusDebug.getPhase())) === 'dialogue'; line += 1) {
    if ((await page.locator('.dialogue-choice').count()) > 0) {
      sawChoices = sawChoices || /Esi/.test(await page.textContent('#dialogue-choices'));
      await page.keyboard.press('1');
    } else {
      await page.click('#dialogue-panel');
    }
    await page.waitForTimeout(450);
  }
  const story = await debug(() => window.__campusDebug.getStory());
  check('choices show, with the player name filled in', sawChoices);
  check('conversation ends back in play', await waitForPhase(page, 'playing'));
  check('the polite reply raised Uncle Bright\'s opinion', story.relationships['uncle-bright'] === 15, JSON.stringify(story.relationships));
  // The sign was read earlier, so that step is already done: on to the signpost.
  check('signing in, plus the sign read earlier, moves M01 to step 3', story.flags.includes('signed_in') && story.step === 3, `step ${story.step}: ${story.objective}`);

  await page.keyboard.press('Tab');
  check('Tab opens the phone', await waitForPhase(page, 'phone') && (await page.isVisible('#phone-screen')));
  check('phone shows the current objective', /signpost/i.test((await page.textContent('#phone-page')) ?? ''));
  await page.keyboard.press('Tab');
  check('Tab closes the phone', await waitForPhase(page, 'playing'));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gcls.story.v1') ?? 'null'));
  check('progress is saved to the device', saved?.profile?.name === 'Esi' && saved.flags.includes('signed_in'));
}

// Camera modes.
{
  const [x, z] = plan(1012, 762);
  await debug(({ x, z }) => window.__campusDebug.teleport(x, z, 0), { x, z });
  await page.keyboard.press('v');
  await page.waitForTimeout(400);
  const camera = await debug(() => window.__campusDebug.getCamera());
  const player = await debug(() => window.__campusDebug.getPlayer());
  const distance = Math.hypot(camera.x - player.x, camera.z - player.z);
  check('V switches to third person', camera.mode === 'third', camera.mode);
  // Above the shoulders (1.55 m) by however much the current pitch allows.
  check('third-person camera sits behind and above', distance > 2.5 && camera.y > 1.6 && camera.z > player.z, `distance ${distance.toFixed(2)}, y ${camera.y.toFixed(2)}, player pitch ${player.pitch.toFixed(3)}`);
  check('camera button shows 3rd', (await page.textContent('#camera-button-label')) === '3rd');

  // Back to a wall: the camera must pull in rather than go inside the Library.
  const wallFace = (497 - 1000) * 0.15;
  await debug(({ x, z }) => window.__campusDebug.teleport(x, z, -90), { x: wallFace + 2.4 + 0.25 + 0.5, z: plan(530, 470)[1] });
  await page.waitForTimeout(400);
  const squeezed = await debug(() => window.__campusDebug.getCamera());
  check('third-person camera stays out of the building', squeezed.x > wallFace + 0.2, `camera x ${squeezed.x.toFixed(2)}, wall ${wallFace.toFixed(2)}`);

  await page.keyboard.press('v');
  await page.waitForTimeout(300);
  const back = await debug(() => window.__campusDebug.getCamera());
  check('V switches back to first person', back.mode === 'first' && Math.abs(back.y - 1.68) < 0.1, `y ${back.y.toFixed(2)}`);
}

// Pause, map, resume.
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('Escape pauses', (await debug(() => window.__campusDebug.getPhase())) === 'paused' && (await page.isVisible('#pause-screen')));
await page.click('#map-button');
await page.waitForTimeout(800);
check('campus map opens', await page.isVisible('#map-screen'));
check('map shows the added H buildings', (await page.locator('.map-addition').count()) >= 6);
await page.click('#map-close');
await page.waitForTimeout(200);
check('map closes back to the pause menu', !(await page.isVisible('#map-screen')) && (await page.isVisible('#pause-screen')));
await page.click('#resume-button');
await page.waitForTimeout(300);
check('Resume resumes', (await debug(() => window.__campusDebug.getPhase())) === 'playing');

// Quality rebuild keeps the player in place.
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
const beforeQuality = await debug(() => window.__campusDebug.getPlayer());
await page.click('.settings summary');
await page.selectOption('#quality-select', 'low');
await page.waitForFunction(() => document.getElementById('loading-screen').hidden, null, { timeout: 60000 });
const lowStats = await debug(() => window.__campusDebug.getStats());
const afterQuality = await debug(() => window.__campusDebug.getPlayer());
check('low quality rebuild succeeds', lowStats.batches > 20, JSON.stringify(lowStats));
check('low preset is lighter', lowStats.triangles < stats.triangles, `${stats.triangles} -> ${lowStats.triangles}`);
check('position survives a quality change', Math.abs(afterQuality.x - beforeQuality.x) < 0.5 && Math.abs(afterQuality.z - beforeQuality.z) < 0.5);

// Continue: a reload offers the saved story and puts the player back in it.
{
  await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#start-screen:not([hidden])', { timeout: 90000 });
  check('a saved story offers Continue', (await page.textContent('#start-button')) === 'Continue Story' && (await page.isVisible('#new-story-button')));
  await page.click('#start-button');
  const continued = await waitForPhase(page, 'playing');
  const story = await debug(() => window.__campusDebug.getStory());
  check('Continue restores the story without the cinematic', continued && story?.name === 'Esi' && story.flags.includes('signed_in'), JSON.stringify(story));
  // Leave the desktop page paused: a second page rendering in the background
  // halves the software renderer's frame rate for the touch checks below.
  await page.keyboard.press('Escape');
  await waitForPhase(page, 'paused');
}

// ================================================================ touch
const mobile = await browser.newContext({ viewport: { width: 800, height: 360 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });
const mpage = await mobile.newPage();
const mobileErrors = [];
mpage.on('pageerror', (e) => mobileErrors.push(e.message));
mpage.on('console', (m) => { if (m.type() === 'error') mobileErrors.push(m.text()); });
await mpage.goto(BASE + '?debug=1', { waitUntil: 'load' });
await mpage.waitForSelector('#start-screen:not([hidden])', { timeout: 90000 });
check('touch: character creation reaches play', await startNewStory(mpage, { name: 'Yaw', programme: 'architecture', label: 'touch: ' }));
// Let a few frames run so the HUD has been updated at least once.
await mpage.waitForTimeout(500);
check('touch: joystick and interact button shown', (await mpage.isVisible('#touch-joystick')) && (await mpage.isVisible('#touch-interact')));
check('touch: crosshair hidden', !(await mpage.isVisible('#crosshair')));
check('touch: swipe hint shown before first look', await mpage.isVisible('#look-hint'));

const pointer = (selector, id, steps) =>
  mpage.evaluate(
    ({ selector, id, steps }) => {
      const element = document.querySelector(selector);
      element.setPointerCapture = () => {};
      element.releasePointerCapture = () => {};
      const rect = element.getBoundingClientRect();
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      for (const [type, dx, dy] of steps) {
        element.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: cx + dx, clientY: cy + dy }));
      }
    },
    { selector, id, steps },
  );

const m0 = await mpage.evaluate(() => window.__campusDebug.getPlayer());
await pointer('#touch-joystick', 1, [['pointerdown', 0, 0], ['pointermove', 0, -60]]);
await mpage.waitForTimeout(1200);
await pointer('#touch-joystick', 1, [['pointerup', 0, -60]]);
const m1 = await mpage.evaluate(() => window.__campusDebug.getPlayer());
check('touch: joystick walks the player forward', m1.z < m0.z - 1, `z ${m0.z.toFixed(2)} -> ${m1.z.toFixed(2)}`);

// The swipe fix: a sideways swipe with the natural upward thumb arc must
// turn the view without tipping it at the sky.
await pointer('#touch-look', 2, [['pointerdown', 0, 0], ['pointermove', -150, -40], ['pointerup', -150, -40]]);
await mpage.waitForTimeout(300);
const m2 = await mpage.evaluate(() => window.__campusDebug.getPlayer());
check('touch: sideways swipe turns the view', Math.abs(m2.yawDegrees - m1.yawDegrees) > 20, `yaw ${m1.yawDegrees.toFixed(1)} -> ${m2.yawDegrees.toFixed(1)}`);
check('touch: sideways swipe barely changes pitch', Math.abs(m2.pitch - m1.pitch) < 0.03, `pitch change ${(m2.pitch - m1.pitch).toFixed(3)} rad`);
check('touch: swipe hint hidden after looking', !(await mpage.isVisible('#look-hint')));

// A deliberate vertical drag still looks up and down.
await pointer('#touch-look', 3, [['pointerdown', 0, 0], ['pointermove', 0, -80], ['pointerup', 0, -80]]);
await mpage.waitForTimeout(300);
const m3 = await mpage.evaluate(() => window.__campusDebug.getPlayer());
check('touch: deliberate vertical drag still looks up', m3.pitch - m2.pitch > 0.1, `pitch ${m2.pitch.toFixed(3)} -> ${m3.pitch.toFixed(3)}`);

await mpage.click('#camera-button');
await mpage.waitForTimeout(300);
check('touch: camera button switches to third person', (await mpage.evaluate(() => window.__campusDebug.getCamera().mode)) === 'third');

check('no console errors (desktop)', desktopErrors.length === 0, desktopErrors.join(' | ').slice(0, 400));
check('no console errors (mobile)', mobileErrors.length === 0, mobileErrors.join(' | ').slice(0, 400));

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
