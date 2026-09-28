# pearbrowser.com

Static landing page for [PearBrowser Desktop](https://github.com/bigdestiny2/pearbrowser-desktop), with release metadata and ecosystem copy pinned to the first-party browser and relay anchors in this workspace.

This repo stays intentionally small:

- `index.html`, `privacy.html`, `features.html`, `apps.html`, `docs.html`, and `download.html` are the static site.
- `downloads.json` is the machine-readable native-download manifest; its file sizes and SHA-256 values come from verified GitHub release assets.
- `site-manifest.json` is the machine-readable Hyperdrive/publish surface for the public site.
- `robots.txt` and `sitemap.xml` expose the canonical crawl surface to search engines and answer engines.
- `llms.txt` and `llms-full.txt` provide a supplemental, plain-text factual reference; they complement the canonical HTML rather than replacing it.
- `scripts/check-sync.js` is a no-deps guardrail that verifies the site still matches the current desktop release metadata, manifest, local page links, local assets, and anchor links.
- `package.json` exists only to make preview and validation repeatable.

## Release state for this candidate

- Latest published desktop download: [v0.9.0](https://github.com/bigdestiny2/pearbrowser-desktop/releases/tag/v0.9.0), with checksum-verifiable package-proof assets for macOS, Windows, and Linux. Developer ID notarization and Windows public-trust signing are pending.
- [Desktop PR #84](https://github.com/bigdestiny2/pearbrowser-desktop/pull/84) is an unmerged v0.9.1 Pear 3.4/Autobee compatibility candidate. Autobee is not a production data migration. P2P app cookies remain shared across drive ports on the loopback host; do not claim cookie isolation.
- [Mobile PR #6](https://github.com/bigdestiny2/PearBrowser/pull/6) is an unmerged draft. Signed distribution, store validation, and device smoke are pending.
- A source commit and passing local checks do not establish deployment. Check the public HTTPS site and advertised Hyperdrive mirror separately; the latter was last verified as an older v0.7.1 edition on 2026-09-28.

## Anchor inputs

Update this site against these sources first:

- [`../../01-browser/PearBrowser/README.md`](../../01-browser/PearBrowser/README.md)
- [`../../00-core/hiverelay/docs/PEARBROWSER-INTEGRATION.md`](../../00-core/hiverelay/docs/PEARBROWSER-INTEGRATION.md)

The public page should describe the desktop browser accurately while making it clear that desktop and mobile share the same HiveRelay catalog, gateway, and capability-doc contract. Treat this site's manifest and verified native release assets as the public release record; a development README is not a publication API.

## Local workflow

```sh
npm run check
npm run preview
npm run build:sites
```

- `npm run check` validates the public release/download record, independently tracked source/runtime record, legacy migration record, production length, SWARM docs link, site manifest, native download filenames/checksums/sizes, local page links, metadata, JSON-LD, sitemap, crawler directives, AI facts files, privacy boundaries, and mobile/browser ecosystem anchors.
- `npm run preview` serves the static site at `http://127.0.0.1:4173`.
- `npm run build:sites` packages the same static source into the Cloudflare Workers-compatible entrypoint used for private Sites deployment.

No bundler, no framework, no install step beyond having Node and Python available locally.

## Release-sync checklist

When PearBrowser Desktop ships a new version:

1. Confirm the approved native release artifacts and their SHA-256 values.
2. Update `index.html`, `site-manifest.json`, and `downloads.json` if the source version/runtime contract, downloadable version, production length, site drive key, installer artifact URL/status, exact file size, checksum, or surrounding product copy changed. Source and download versions are independent until new artifacts pass verification.
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

This page used to be easier to let drift. Static HTML keeps the trust surface inspectable: `view-source:` shows the installer URL, legacy migration record, release metadata, manifest link, and ecosystem claims you are asking users to trust.

## License

The page content is MIT. The PearBrowser app is Apache-2.0 / MIT — see [pearbrowser-desktop/LICENSE](https://github.com/bigdestiny2/pearbrowser-desktop/blob/main/LICENSE).
