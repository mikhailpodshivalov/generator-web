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

## Next implementation steps

1. Replace placeholder examples with real audio files and screenshots.
2. Add NOWPayments checkout entry points and order status flow to CTA buttons.
3. Wire deploy workflow for production host at `mgen.fun`.
