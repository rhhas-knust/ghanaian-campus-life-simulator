# TODO

Live backlog. Phase 1 is complete; everything here is what Phase 1 left behind
or deliberately deferred. Longer-range plans are in
[PROJECT_PHASES.md](PROJECT_PHASES.md).

Ordered roughly by value-per-effort within each section.

---

## Blocking the first deploy

- [ ] **Enable GitHub Pages**: Settings → Pages → Source = **GitHub Actions**.
      Nothing publishes until this is done. See [DEPLOYMENT.md](DEPLOYMENT.md).
- [ ] **Decide the repository visibility.** It is private today, and Pages on a
      private repository needs GitHub Pro/Team/Enterprise. Either make it public
      or upgrade the plan.
- [ ] **Test on real Android hardware.** Phase 1 was verified in headless
      Chromium with a software renderer, including a phone-sized touch viewport
      — that is not the same thing. Check frame rate on a mid-range phone,
      thumbstick ergonomics, the address bar resize, and rotation.

## Correctness and quality

- [ ] **Add a unit test suite** (Vitest). Start with the pure modules:
      `CollisionSystem` (push-out, sliding, bounds clamping), `SeededRandom`
      (determinism), `resolveZoneName` (priority ordering), `InteractionSystem`
      (facing cone and ranking).
- [ ] **Run the browser smoke test in CI.** `scripts/smoke-test.mjs` already
      exists and passes 26 checks locally; wire it into `deploy.yml` behind a
      `npx playwright install chromium` step so regressions in movement,
      collision or interaction fail the build.
- [ ] **Add a performance budget check to CI** — fail if draw calls, triangle
      count or gzipped bundle size regress past a threshold.
- [ ] **Audit the quality presets against a real device.** The Low preset is a
      guess informed by `deviceMemory` and core count, not by measurement.

## Known Phase 1 compromises

- [ ] **Ground height sampling**, so verandahs and plinths become walkable
      instead of solid. This is the single biggest limitation in the prototype.
- [ ] **Cascaded shadow maps.** One orthographic cascade currently covers the
      whole 170 m campus, so shadows are soft and imprecise near the camera.
- [ ] **Text on signs in 3D.** The boards are blank; the writing is in the HTML
      panel. Needs an SDF font atlas.
- [ ] **Scatter zones under-fill.** Rejection sampling gives up after a bounded
      number of attempts, so a zone whose `count` exceeds its capacity quietly
      places fewer trees — and the quality density multiplier stops mattering.
      Either report the shortfall or pack deterministically.
- [ ] **Head bob is tied to distance, not to footfalls.** It will look wrong the
      moment there are footstep sounds to sync with.

## Polish

- [ ] A minimap or campus map screen, driven by the same `campusLayout.ts` data.
- [ ] A compass or direction hint in the HUD.
- [ ] Vary the window and shutter rhythm per building so the five teaching
      blocks read as less identical.
- [ ] Soften the horizon: the ground plane currently ends abruptly in fog.
- [ ] A proper first-load experience — the loading bar jumps rather than
      tracking real progress.
- [ ] Light pole shadows and ambient occlusion contact darkening at wall bases.

## Accessibility

- [ ] Remappable keys.
- [ ] A reduced-motion option that disables head bob (the CSS already respects
      `prefers-reduced-motion`; the 3D camera does not).
- [ ] Check the HUD and overlay palette for colour-blind safety.
- [ ] Keyboard-only navigation through every overlay, with a visible focus ring.
- [ ] Field-of-view slider, for motion sickness.

## Developer experience

- [ ] A debug overlay (`?debug=1`) showing live FPS, draw calls and position,
      rather than requiring the console.
- [ ] A collider visualiser — render every collider as a wireframe box.
- [ ] A top-down orthographic "plan view" mode for checking layout against the
      artist's map.
- [ ] Hot-reload `campusLayout.ts` without a full page refresh.

## Documentation

- [ ] Screenshots in the README once the artist's assets land.
- [ ] A short recorded walkthrough for people who cannot run it locally.
- [ ] A `CONTRIBUTING.md` if anyone outside the current team joins.
