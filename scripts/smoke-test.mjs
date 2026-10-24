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
check('CC0 character models load and rig', stats.riggedCharacters === true);
check('furniture kit loads', stats.furnitureKit === true);
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
// Longer than it looks necessary: the skinned characters at the gate slow
// the software renderer further.
await page.waitForTimeout(4500);
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
  // The key is read on the next frame, which can be slow in software.
  for (let i = 0; i < 30 && (await debug(() => window.__campusDebug.getCamera())).mode !== 'third'; i += 1) {
    await page.waitForTimeout(150);
  }
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

// ============================================================ interiors
/** Presses the interact key on `id` and waits for the fade to land in `location`. */
async function goThrough(target, id, location) {
  const focus = await waitForFocus(target, id);
  await target.keyboard.press('e');
  const end = Date.now() + 10000;
  while (Date.now() < end) {
    const [loc, phase] = await target.evaluate(() => [window.__campusDebug.getLocation(), window.__campusDebug.getPhase()]);
    if (loc === location && phase === 'playing') {
      return true;
    }
    await target.waitForTimeout(120);
  }
  console.log(`  (goThrough ${id}: focus was ${focus})`);
  return false;
}

/** Talks to whoever is in focus, picking replies in order; Space for lines without replies. */
async function converse(target, picks) {
  await waitForPhase(target, 'dialogue');
  let pick = 0;
  for (let line = 0; line < 20 && (await target.evaluate(() => window.__campusDebug.getPhase())) === 'dialogue'; line += 1) {
    if ((await target.locator('.dialogue-choice').count()) > 0) {
      await target.keyboard.press(picks[pick] ?? '1');
      pick += 1;
    } else {
      await target.keyboard.press('Space');
    }
    await target.waitForTimeout(450);
  }
}

{
  await page.keyboard.press('Escape');
  await waitForPhase(page, 'playing');
  // Jump to the end of M01 without replaying it: the conversations above
  // already prove dialogue works.
  await debug(() =>
    window.__campusDebug.setFlags(['seen:sign:courtyard-finger-post', 'has_student_id', 'met_nii', 'met:nii', 'joined_group_chat', 'read_group_chat']),
  );
  check('M01 ends with "go up to A-214"', /A-214/.test((await debug(() => window.__campusDebug.getStory())).objective));

  const [sx, sz] = plan(1312, 262);
  await debug(({ x, z }) => window.__campusDebug.teleport(x, z, 0), { x: sx, z: sz });
  check('E at the Block A stairs goes inside', await goThrough(page, 'entrance:hostel-a', 'hostel-a-2f'));
  const inside = await debug(() => window.__campusDebug.getStats());
  check('the interior is built and batched', inside.interiorBatches > 8 && inside.interiorBatches < 40, JSON.stringify(inside));
  check('location pill names the floor', /Block A/i.test((await page.textContent('#location-label')) ?? ''));
  check('minimap switches to the floor plan', await page.evaluate(() => document.getElementById('hud').classList.contains('is-indoors')));

  // Walk north into the corridor wall (face at z = -1.15).
  await debug(() => window.__campusDebug.teleport(0, 0, 0));
  await page.keyboard.down('w');
  await page.waitForTimeout(3000);
  await page.keyboard.up('w');
  const stopped = await debug(() => window.__campusDebug.getPlayer());
  check('corridor walls stop the player', stopped.z > -0.85 && stopped.z < -0.3, `z ${stopped.z.toFixed(2)}`);

  // Through the doorway into A-214.
  await debug(() => window.__campusDebug.teleport(9, 0, 180));
  await page.keyboard.down('w');
  await page.waitForTimeout(3500);
  await page.keyboard.up('w');
  check('the A-214 doorway is walkable', (await page.textContent('#location-label')) === 'Room A-214');

  await debug(() => window.__campusDebug.teleport(10.4, 4.6, -90));
  check('the bed offers sleep', (await waitForFocus(page, 'place:bed-a214')) === 'place:bed-a214');
  await page.keyboard.press('e');
  check('sleeping shows the day-one night card', (await waitForPhase(page, 'reading')) && /A-214/.test((await page.textContent('#info-title')) ?? ''));
  await page.click('#info-close');
  await waitForPhase(page, 'playing');
  let story = await debug(() => window.__campusDebug.getStory());
  check('M01 completes and M02 starts on day 2', story.missionId === 'm02' && story.day === 2, `${story.missionId}, day ${story.day}`);
  check('the player wakes inside A-214', (await debug(() => window.__campusDebug.getLocation())) === 'hostel-a-2f');
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gcls.story.v1') ?? 'null'));
  check('the save records the interior', saved?.position?.location === 'hostel-a-2f');

  await debug(() => window.__campusDebug.teleport(-14, -1.8, 0));
  check('the stairs lead back out to the court', await goThrough(page, 'exit:hostel-a-2f:hostel-a', 'campus'));
  // Further round trips must not leave geometry behind. Measured from the
  // second trip on, because anything drawn for the first time — the beacon, a
  // character who has just moved into view — uploads its geometry once and
  // keeps it; only growth on EVERY trip is a leak.
  const roundTrip = async () => {
    await debug(({ x, z }) => window.__campusDebug.teleport(x, z, 0), { x: sx, z: sz });
    await goThrough(page, 'entrance:hostel-a', 'hostel-a-2f');
    await debug(() => window.__campusDebug.teleport(-14, -1.8, 0));
    await goThrough(page, 'exit:hostel-a-2f:hostel-a', 'campus');
    return (await debug(() => window.__campusDebug.getStats())).geometries;
  };
  const memoryBefore = await roundTrip();
  const memoryAfter = await roundTrip();
  check('going in and out frees the interior', memoryAfter <= memoryBefore, `${memoryBefore} -> ${memoryAfter} geometries`);

  // ------------------------------------------------------------ M02
  await page.keyboard.press('Tab');
  await waitForPhase(page, 'phone');
  await page.click('.phone-thread.is-unread');
  await page.keyboard.press('Tab');
  await waitForPhase(page, 'playing');
  story = await debug(() => window.__campusDebug.getStory());
  check("M02: reading Uncle Bright's message sends you to the gate", story.step === 2, story.objective);

  const [kx, kz] = plan(1046, 1030);
  await debug(({ x, z }) => window.__campusDebug.teleport(x, z, 180), { x: kx, z: kz - 2.2 });
  check('M02: Kojo waits outside the gate', (await waitForFocus(page, 'npc:kojo')) === 'npc:kojo');
  await page.keyboard.press('e');
  await converse(page, ['1', '1']);
  story = await debug(() => window.__campusDebug.getStory());
  check('M02: the first meeting moves Kojo\'s trust', story.flags.includes('m02_met_kojo') && story.relationships.kojo === -5, `kojo ${story.relationships.kojo}`);

  // The room search and Nii's tip are covered by the manual pass; jump to the lodge.
  await debug(() => window.__campusDebug.setFlags(['found_charger', 'knows_lost_property']));
  const [lx, lz] = plan(954, 958);
  await debug(({ x, z }) => window.__campusDebug.teleport(x, z, 90), { x: lx, z: lz });
  check("M02: the Porter's Lodge can be entered", await goThrough(page, 'entrance:porters-lodge', 'porters-lodge'));
  await debug(() => window.__campusDebug.teleport(0.2, 0, 90));
  check('M02: Uncle Bright is behind his counter', (await waitForFocus(page, 'npc:uncle-bright')) === 'npc:uncle-bright');
  await page.keyboard.press('e');
  await converse(page, ['1']);
  await debug(() => window.__campusDebug.teleport(1.2, 0.8, 180));
  await waitForFocus(page, 'place:lost-property');
  await page.keyboard.press('e');
  await waitForPhase(page, 'reading');
  check('M02: the cabinet holds Kojo\'s phone', /Kojo/.test((await page.textContent('#info-title')) ?? ''));
  await page.click('#info-close');
  await waitForPhase(page, 'playing');

  // Reload while standing inside the lodge, halfway through M02.
  const beforeReload = await debug(() => window.__campusDebug.getPlayer());
  await page.keyboard.press('Escape');
  await waitForPhase(page, 'paused');
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#start-screen:not([hidden])', { timeout: 90000 });
  await page.click('#start-button');
  await waitForPhase(page, 'playing');
  const afterReload = await debug(() => window.__campusDebug.getPlayer());
  story = await debug(() => window.__campusDebug.getStory());
  check(
    'reloading mid-M02 puts you back inside the lodge, on the same step',
    (await debug(() => window.__campusDebug.getLocation())) === 'porters-lodge' &&
      Math.hypot(afterReload.x - beforeReload.x, afterReload.z - beforeReload.z) < 0.3 &&
      story.flags.includes('has_kojo_handset'),
    `step ${story.step}`,
  );

  await debug(() => window.__campusDebug.teleport(2.2, 0, -90));
  await goThrough(page, 'exit:porters-lodge:porters-lodge', 'campus');
  await debug(({ x, z }) => window.__campusDebug.teleport(x, z, 180), { x: kx, z: kz - 2.2 });
  await waitForFocus(page, 'npc:kojo');
  await page.keyboard.press('e');
  await converse(page, ['1']);
  check('M02: returning the phone shows the completion card', (await waitForPhase(page, 'reading')) && /complete/i.test((await page.textContent('#info-eyebrow')) ?? ''));
  await page.click('#info-close');
  await waitForPhase(page, 'playing');
  story = await debug(() => window.__campusDebug.getStory());
  check('M02 completes into free roam', story.missionId === null && story.flags.includes('m02_complete'), story.objective);
  check('trust earned along the way: Kojo shares his number', story.flags.includes('kojo_number') && story.relationships.kojo >= 10, `kojo ${story.relationships.kojo}`);
  check('Kojo has gone home', (await waitForFocus(page, 'npc:kojo', 1200)) !== 'npc:kojo');

  await page.keyboard.press('Escape');
  await waitForPhase(page, 'paused');
}

// A save written by the previous release (no `location`, M01 done, no M02 yet)
// must continue straight into M02.
{
  const legacy = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await legacy.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(
        'gcls.story.v1',
        JSON.stringify({
          version: 1,
          profile: { name: 'Ama', address: 'she', programme: 'architecture', home: 'volta' },
          flags: ['signed_in', 'has_student_id', 'met_nii', 'joined_group_chat', 'read_group_chat', 'slept_day_1', 'm01_complete'],
          relationships: { 'uncle-bright': 15, 'registry-clerk': 5, nii: 35, narh: 0 },
          reputation: { integrity: 50, popularity: 10, academic: 52 },
          day: 2,
          minutes: 450,
          missionId: null,
          position: { x: 46.8, z: -30.9, yawDegrees: 180 },
        }),
      );
      sessionStorage.setItem('seeded', '1');
    }
  });
  const lpage = await legacy.newPage();
  const legacyErrors = [];
  lpage.on('pageerror', (e) => legacyErrors.push(e.message));
  await lpage.goto(BASE + '?debug=1', { waitUntil: 'load' });
  await lpage.waitForSelector('#start-screen:not([hidden])', { timeout: 90000 });
  await lpage.click('#start-button');
  await waitForPhase(lpage, 'playing');
  const story = await lpage.evaluate(() => window.__campusDebug.getStory());
  check(
    'a save from the previous release continues into M02',
    story?.missionId === 'm02' && story.name === 'Ama' && (await lpage.evaluate(() => window.__campusDebug.getLocation())) === 'campus' && legacyErrors.length === 0,
    `${story?.missionId}: ${story?.objective}`,
  );
  await legacy.close();
}

// ======================================================= missing models
{
  // A model that fails to download must cost looks, not the game: the
  // procedural figures and furniture take over.
  const bare = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await bare.route('**/*.glb', (route) => route.abort());
  const bpage = await bare.newPage();
  const bareErrors = [];
  bpage.on('pageerror', (e) => bareErrors.push(e.message));
  await bpage.goto(BASE + '?debug=1', { waitUntil: 'load' });
  await bpage.waitForSelector('#start-screen:not([hidden])', { timeout: 90000 });
  const bareStats = await bpage.evaluate(() => window.__campusDebug.getStats());
  check(
    'without the model files the game still loads, with placeholders',
    bareStats.riggedCharacters === false && bareStats.furnitureKit === false && bareStats.batches > 20 && bareErrors.length === 0,
    bareErrors.join(' | ').slice(0, 200),
  );
  await bare.close();
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

// Into Block A with the on-screen INTERACT button.
{
  await mpage.evaluate(() =>
    window.__campusDebug.setFlags(['signed_in', 'has_student_id', 'met_nii', 'joined_group_chat', 'read_group_chat']),
  );
  const [sx, sz] = plan(1312, 262);
  await mpage.evaluate(({ x, z }) => window.__campusDebug.teleport(x, z, 0), { x: sx, z: sz });
  await waitForFocus(mpage, 'entrance:hostel-a');
  await mpage.tap('#touch-interact');
  const end = Date.now() + 10000;
  let location = '';
  while (Date.now() < end && location !== 'hostel-a-2f') {
    location = await mpage.evaluate(() => window.__campusDebug.getLocation());
    await mpage.waitForTimeout(150);
  }
  check('touch: INTERACT takes you into Block A', location === 'hostel-a-2f');
  await waitForPhase(mpage, 'playing');
  const before = await mpage.evaluate(() => window.__campusDebug.getPlayer());
  await pointer('#touch-joystick', 4, [['pointerdown', 0, 0], ['pointermove', 0, -60]]);
  await mpage.waitForTimeout(1500);
  await pointer('#touch-joystick', 4, [['pointerup', 0, -60]]);
  const after = await mpage.evaluate(() => window.__campusDebug.getPlayer());
  check('touch: the joystick walks you down the corridor', Math.hypot(after.x - before.x, after.z - before.z) > 0.8, `${before.x.toFixed(2)} -> ${after.x.toFixed(2)}`);
}

check('no console errors (desktop)', desktopErrors.length === 0, desktopErrors.join(' | ').slice(0, 400));
check('no console errors (mobile)', mobileErrors.length === 0, mobileErrors.join(' | ').slice(0, 400));

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
