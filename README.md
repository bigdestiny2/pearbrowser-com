# pearbrowser.com

Landing page for [PearBrowser Desktop](https://github.com/bigdestiny2/pearbrowser-desktop) — a peer-to-peer browser, app store, and site publisher built on the Pear Runtime.

This repo is one static file (`index.html`) — no build step, no framework, no JS dependencies. Just open it.

## Deploy

Any static host works. One-click options, in order of effort:

### Cloudflare Pages (recommended)
1. https://dash.cloudflare.com → Workers & Pages → Create → Connect to Git
2. Pick `bigdestiny2/pearbrowser-com`
3. Build command: *(leave empty)*
4. Build output: `/` (root)
5. Add custom domain `pearbrowser.com` → DNS is one CNAME

### Vercel
```sh
vercel --prod
```
No config needed. Set the custom domain in the dashboard.

### Netlify
Drag-and-drop `index.html` into https://app.netlify.com/drop. Add custom domain in site settings.

### GitHub Pages
Settings → Pages → Source: deploy from `main` branch, `/` root. Then point `pearbrowser.com` at `bigdestiny2.github.io` via CNAME.

## What's on the page

- The current install command: `pear run pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty`
- Three-pillar pitch: Browse / Run apps / Publish
- Ecosystem cards (HiveWorm, HiveRelay, P2P Builders, hyper-fetch)
- Honest FAQ — what works, what's coming, why no installer yet
- Spec table for the people who scroll to the bottom first

## Why static?

The previous deployment was a Lovable.dev React SPA that baked stale pear:// keys into the JS bundle. Static HTML is verifiable at a glance — `view-source:pearbrowser.com` shows the exact keys you're being asked to trust.

## Updates

When PearBrowser ships a new version:
1. Edit the `<span>v0.4.3 · ...` hero tag
2. Edit the spec table's `Version` row (`length` is from `pear info pear://...`)
3. Commit and push — the host picks it up

## License

The page content is MIT. The PearBrowser app is Apache-2.0 / MIT — see [pearbrowser-desktop/LICENSE](https://github.com/bigdestiny2/pearbrowser-desktop/blob/main/LICENSE).
