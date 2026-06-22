# pearbrowser.com

Static landing page for [PearBrowser Desktop](https://github.com/bigdestiny2/pearbrowser-desktop), with release metadata and ecosystem copy pinned to the first-party browser and relay anchors in this workspace.

This repo stays intentionally small:

- `index.html` is the site.
- `scripts/check-sync.js` is a no-deps guardrail that verifies the site still matches the current desktop release metadata and anchor links.
- `package.json` exists only to make preview and validation repeatable.

## Anchor inputs

Update this site against these sources first:

- [`../../01-browser/pearbrowser-desktop/README.md`](../../01-browser/pearbrowser-desktop/README.md)
- [`../../01-browser/PearBrowser/README.md`](../../01-browser/PearBrowser/README.md)
- [`../../00-core/hiverelay/docs/PEARBROWSER-INTEGRATION.md`](../../00-core/hiverelay/docs/PEARBROWSER-INTEGRATION.md)

The public page should describe the desktop browser accurately while making it clear that desktop and mobile share the same HiveRelay catalog, gateway, and capability-doc contract.

## Local workflow

```sh
npm run check
npm run preview
```

- `npm run check` validates the launch command, release version, production length, SWARM docs link, and mobile/browser ecosystem anchors.
- `npm run preview` serves the static site at `http://127.0.0.1:4173`.

No bundler, no framework, no install step beyond having Node and Python available locally.

## Release-sync checklist

When PearBrowser Desktop ships a new version:

1. Confirm the `**Current release:**` line in [`../../01-browser/pearbrowser-desktop/README.md`](../../01-browser/pearbrowser-desktop/README.md).
2. Update `index.html` hero/spec copy only if the version, production length, or surrounding product copy changed.
3. Re-run `npm run check`.
4. Preview locally and confirm the public site still reads cleanly on desktop and mobile.

If the mobile browser or `hiverelay` contract changes materially, refresh the ecosystem copy and FAQ language in the same pass.

## Deploy

Any static host works.

### Cloudflare Pages

1. Connect the repo.
2. Leave the build command empty.
3. Use `/` as the output directory.
4. Attach `pearbrowser.com`.

### Vercel

```sh
vercel --prod
```

### Netlify

Drop the repo root or `index.html` into Netlify Drop, then attach the custom domain.

### GitHub Pages

Deploy from the `main` branch root and point `pearbrowser.com` at the Pages host with a CNAME.

## Why static?

This page used to be easier to let drift. Static HTML keeps the trust surface inspectable: `view-source:` shows the exact launch key, release metadata, and ecosystem claims you are asking users to trust.

## License

The page content is MIT. The PearBrowser app is Apache-2.0 / MIT — see [pearbrowser-desktop/LICENSE](https://github.com/bigdestiny2/pearbrowser-desktop/blob/main/LICENSE).
