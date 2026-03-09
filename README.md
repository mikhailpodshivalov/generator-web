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
2. Add NOWPayments checkout entry points and order status flow to CTA buttons.
3. Add post-purchase license activation guide with screenshots.
