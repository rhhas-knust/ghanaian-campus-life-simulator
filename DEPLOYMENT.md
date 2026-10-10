# Deployment

The site is a pile of static files. Pushing to `main` builds it and publishes it
to GitHub Pages. There is no backend, no database, no paid API and no server to
keep running.

- **Workflow:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
- **Build output:** `dist/`
- **Live URL (once enabled):**
  `https://rhhas-knust.github.io/ghanaian-campus-life-simulator/`

---

## What you have to do (one time)

### 1. Turn on Pages, with GitHub Actions as the source

1. Open the repository on GitHub.
2. **Settings** → **Pages** (left sidebar).
3. Under **Build and deployment** → **Source**, choose **GitHub Actions**.
4. Save.

That is the whole setup. Do **not** pick "Deploy from a branch" — this project
has no `gh-pages` branch and never commits build output.

> At the time of writing, this repository has `has_pages: false` — Pages has
> never been enabled on it. The workflow will fail at the *Configure GitHub
> Pages* step until the setting above is made.

### 2. If the repository is private, it needs a paid plan

**This repository is currently private.** GitHub Pages on a private repository
requires **GitHub Pro, Team or Enterprise**. On the free plan the Pages settings
page will not offer the option.

Two ways forward:

- **Make the repository public.** Settings → General → Danger Zone → Change
  visibility. Nothing in this project is secret: there are no keys, no
  credentials and no personal data. Check that any artist assets added later are
  cleared for publication first.
- **Or upgrade the account or organisation** to a plan that includes private
  Pages.

Everything else in this document works the same either way.

### 3. Push and watch it run

The workflow runs on every push to `main`, and can also be started by hand from
the **Actions** tab (**Deploy to GitHub Pages** → **Run workflow**).

The first successful run prints the live URL in the `deploy` job summary.

---

## How the workflow works

```
push to main
      │
      ▼
  build job                        deploy job
  ├── checkout                     └── actions/deploy-pages@v4
  ├── setup-node 22 (npm cache)
  ├── npm ci
  ├── npm run typecheck    ← fails the build on a type error
  ├── npm run lint         ← fails the build on a lint error
  ├── npm run build        ← vite build -> dist/
  ├── test -f dist/index.html
  ├── actions/configure-pages@v5
  └── actions/upload-pages-artifact@v3  (path: dist)
```

The build job refuses to publish a broken site: a type error, a lint error or a
missing `dist/index.html` all stop it before the artifact is uploaded.

### Permissions

```yaml
permissions:
  contents: read     # check out the repository
  pages: write       # publish to Pages
  id-token: write    # mint the OIDC token deploy-pages needs
```

These are the minimum the official Pages actions require. `contents` stays
read-only because nothing is ever committed back.

### Concurrency

```yaml
concurrency:
  group: pages
  cancel-in-progress: false
```

One deployment at a time. A run that is already publishing is allowed to finish
rather than being killed half-way through.

---

## The base path — the thing that breaks first

GitHub project sites are served from a **sub-directory**:

```
https://rhhas-knust.github.io/ghanaian-campus-life-simulator/
                              └──────── the sub-directory ────────┘
```

So `vite.config.ts` sets:

```ts
export const BASE_PATH = '/ghanaian-campus-life-simulator/';
export default defineConfig({ base: BASE_PATH, /* ... */ });
```

Every bundled URL Vite emits is prefixed with it. Without this, the page loads
and then fetches `/assets/index-abc123.js` from the domain root, which is a 404
and a blank screen.

**Keep the leading and the trailing slash.**

### When you must change it

| Situation | Set `base` to |
| --- | --- |
| Repository renamed | `'/<new-repo-name>/'` |
| Moved to `rhhas-knust.github.io` (user site) | `'/'` |
| Custom domain at the apex (`campus.example.com`) | `'/'` |
| Served from a sub-path of a custom domain | `'/that-sub-path/'` |

It is one constant in one file.

### Runtime asset paths

Anything loaded at runtime — the artist's models, textures and audio — must go
through `resolveAssetUrl()` in `src/config/assets.ts`, which prefixes
`import.meta.env.BASE_URL`:

```ts
import { resolveAssetUrl } from './config/assets';
const url = resolveAssetUrl('assets/models/great-hall.glb');
// dev:  /assets/models/great-hall.glb
// prod: /ghanaian-campus-life-simulator/assets/models/great-hall.glb
```

A hard-coded `/assets/...` works in `npm run dev` and breaks on Pages. This is
the single most common way to ship a broken deploy, which is why there is a
helper for it.

---

## Verify a deploy locally first

`npm run preview` serves the real production build at the real base path:

```bash
npm run verify     # typecheck + lint + build
npm run preview    # http://localhost:4173/ghanaian-campus-life-simulator/
```

If it works there, it will work on Pages. Opening
`http://localhost:4173/` without the sub-directory gives a 404 — that is correct
and is exactly what Pages would do.

To test on a phone on the same Wi-Fi, `npm run dev` and `npm run preview` both
bind to all interfaces; use the network address they print.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Workflow fails on *Configure GitHub Pages* | Pages source is not set to GitHub Actions | Do step 1 above |
| No **GitHub Actions** option under Pages → Source | Private repository on a free plan | Make it public, or upgrade (step 2) |
| Blank page, console 404s on `/assets/*.js` | `base` does not match the repository name | Fix `BASE_PATH` in `vite.config.ts` |
| Page loads, 3D area is black | WebGL unavailable or hardware acceleration off | The loading overlay says so; try an up-to-date Chrome or Firefox |
| Old version still served | CDN cache | Hard-refresh, or wait a few minutes |
| `npm ci` fails in CI | `package-lock.json` out of step with `package.json` | Run `npm install` locally and commit the lockfile |
| Deploy succeeds, 404 at the URL | Looking at the root instead of the sub-directory | Use the full URL with `/ghanaian-campus-life-simulator/` |

---

## What this deployment is not

- **No backend.** Nothing is submitted anywhere. There is no API to call.
- **No database.** The only persistence is `localStorage` for graphics quality
  and look sensitivity, on the player's own device.
- **No paid service.** Public GitHub Pages is free; the only possible cost is a
  paid plan if you keep the repository private.
- **No secrets.** The workflow uses the automatic `GITHUB_TOKEN` through the
  official Pages actions. Nothing needs to be added to repository secrets.
