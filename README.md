# generator-web

Public website for Masterpiece Generator (`mgen.fun`).

## Scope

- landing page
- download links
- examples catalog
- mini guides
- legal pages
- entry points for paid checkout and activation UX

## Local preview

```bash
./scripts/serve.sh
```

Open http://localhost:8080

## Repository layout

- `index.html`: main landing page
- `assets/`: shared styles and static media
- `examples/`: example library page
- `guides/`: mini learning pages
- `legal/`: privacy, terms, and license pages
- `.github/workflows/ci.yml`: basic structural checks
- `.github/workflows/deploy-cloudflare-pages.yml`: production deploy

## Media Drop Zones

- Brand emblem: `assets/img/mg-emblem.png` (copied from root `assets/app_icon.png`)
- Hero artwork (generated from UI screenshot): `assets/img/hero-interface-art.jpg`
- Landing video 1: `assets/video/sequencer-overview.mp4`
- Landing video 1 poster: `assets/img/sequencer-overview.jpg`
- Landing video 2: `assets/video/sound-slot-editor.mp4`
- Landing video 2 poster: `assets/img/sound-slot-editor.jpg`
- Landing video 3: `assets/video/live-workflow-clip.mp4`
- Landing video 3 poster: `assets/img/live-workflow-clip.jpg`
- Example audio clips: `assets/audio/*.mp3`
- Random demo player source list is generated from `assets/audio/*.mp3` into `assets/audio-manifest.json`
  via `./scripts/generate-audio-manifest.sh` (CI validates this file is up to date).

## Deploy to `mgen.fun` (Cloudflare Pages)

1. In Cloudflare, create a Pages project named `mgen-fun` (Pages -> Create -> Direct Upload).
2. In GitHub repository `generator-web`, add Actions secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Use an API token with at least `Cloudflare Pages:Edit` permission for your account.
4. Push to `main`; workflow `Deploy Cloudflare Pages` will publish the site.
5. In Cloudflare Pages project settings, add custom domain `mgen.fun` (and optionally `www.mgen.fun`).
6. Keep DNS records proxied through Cloudflare for auto HTTPS.

## Next implementation steps

1. Replace placeholder examples with real audio files and screenshots.
2. Keep web checkout wired to `https://api.mgen.fun` (`create-checkout` + `order-status`) and monitor errors after deploy.
3. Add post-purchase license activation guide with screenshots and troubleshooting cases.
