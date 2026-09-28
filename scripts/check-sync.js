#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const indexPath = path.join(root, 'index.html')
const manifestPath = path.join(root, 'site-manifest.json')
const downloadsPath = path.join(root, 'downloads.json')
const htmlPages = ['index.html', 'privacy.html', 'features.html', 'apps.html', 'docs.html', 'download.html']
const releaseUrl = 'https://github.com/bigdestiny2/pearbrowser-desktop/releases'
// Cross-checked against the four immutable v0.9.0 GitHub release manifests and
// their .sha256 sidecars on 2026-09-28. A new release must update this record.
const approvedRelease = {
  version: 'v0.9.0',
  sourceCommit: '6661f4a476c5916e6c9fb8c0b693eb94607589f7',
  assets: {
    'PearBrowser-0.9.0-macos-arm64.app.zip': { sha256: '98e4ca705ea69dafdb751f33a151a01a5758e4684025f3323b9f986b936975b4', bytes: 22608144 },
    'PearBrowser-0.9.0-macos-x64.app.zip': { sha256: 'bc1c972b636be4f1d45928bc90c0cde6c955fab098fe9b7eb7797758393ab11c', bytes: 23694347 },
    'PearBrowser-0.9.0-windows-x64.msix': { sha256: '6a9cd982ee5cf18644a7e8fb974c836cfad9159bdfb502ba62029f7428c0732e', bytes: 19223171 },
    'PearBrowser-0.9.0-linux-x64.AppImage': { sha256: '12ebac6e74959af3c2d72c1c7a0922b9c60d374d61e2bfe428b194229cac777b', bytes: 52595192 }
  }
}
const requiredPhrases = [
  "PearBrowser doesn't track you.",
  'No telemetry. No analytics. No ads. No tracking SDKs. No central account.',
  'Private, not anonymous.',
  'Open the browser. Search without a profile.',
  'DuckDuckGo receives the query and your network address',
  'Package-proof builds: macOS .app.zip · Windows .msix · Linux .AppImage',
  'Migration boundary:',
  'PearBrowser Mobile',
  'https://github.com/bigdestiny2/pearbrowser-desktop/blob/main/docs/SWARM-V1.md',
  'https://github.com/bigdestiny2/PearBrowser'
]
const publicRoutes = {
  'index.html': 'https://pearbrowser.com/',
  'privacy.html': 'https://pearbrowser.com/privacy',
  'features.html': 'https://pearbrowser.com/features',
  'apps.html': 'https://pearbrowser.com/apps',
  'docs.html': 'https://pearbrowser.com/docs',
  'download.html': 'https://pearbrowser.com/download'
}

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function readJson(file) {
  return JSON.parse(read(file))
}

function fail(message) {
  console.error(`check-sync: ${message}`)
  process.exitCode = 1
}

function mustMatch(source, pattern, label) {
  const match = source.match(pattern)
  if (!match) {
    throw new Error(`Missing ${label}`)
  }
  return match
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) fail(`${label} is out of sync; expected "${expected}", got "${actual}"`)
}

function fileExists(relPath) {
  return fs.existsSync(path.join(root, relPath))
}

function isExternalRef(ref) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref) && !ref.startsWith('file:')
}

function normalizeLocalPath(ref, currentPage) {
  const withoutQuery = ref.split('?')[0]
  const [target, hash] = withoutQuery.split('#')
  if (!target) return { relPath: currentPage, hash }
  if (target.startsWith('/')) return { relPath: target.replace(/^\/+/, ''), hash }
  return { relPath: path.posix.normalize(path.posix.join(path.posix.dirname(currentPage), target)), hash }
}

function extractIds(source) {
  const ids = new Set()
  const pattern = /\bid=["']([^"']+)["']/g
  let match
  while ((match = pattern.exec(source))) ids.add(match[1])
  return ids
}

function checkHtmlReferences(pages) {
  const idsByPage = new Map()
  const titles = new Set()
  for (const page of pages) idsByPage.set(page, extractIds(read(path.join(root, page))))

  const attrPattern = /\b(?:href|src)=["']([^"']+)["']/g
  for (const page of pages) {
    const source = read(path.join(root, page))
    const [, title] = mustMatch(source, /<title>([^<]+)<\/title>/, `${page} title`)
    if (titles.has(title)) fail(`${page} duplicates another page title: ${title}`)
    titles.add(title)
    if (!source.includes('href="site-manifest.json"')) fail(`${page} is missing the site manifest discovery link`)
    if (!source.includes('href="llms.txt"')) fail(`${page} is missing the AI facts discovery link`)
    if (!source.includes('href="privacy.html"')) fail(`${page} is missing the privacy page navigation link`)
    if (!source.includes('name="description"')) fail(`${page} is missing a meta description`)
    if (!source.includes('name="robots"')) fail(`${page} is missing the robots meta directive`)
    if (!source.includes('property="og:image" content="https://pearbrowser.com/assets/og.png"')) fail(`${page} is missing the canonical Open Graph image`)
    if (!source.includes(`rel="canonical" href="${publicRoutes[page]}"`)) fail(`${page} has the wrong canonical URL`)
    if (/\bnoindex\b/i.test(source)) fail(`${page} must remain indexable`)
    if (/<link\b[^>]*\brel=["'][^"']*\bicon\b[^"']*["'][^>]*>/i.test(source)) {
      fail(`${page} must not declare a favicon`)
    }
    if (!/href="assets\/styles\.css(?:\?[^"]*)?"/.test(source)) fail(`${page} is missing the shared stylesheet`)

    let match
    while ((match = attrPattern.exec(source))) {
      const ref = match[1]
      if (
        isExternalRef(ref) ||
        ref.startsWith('data:') ||
        ref.startsWith('mailto:') ||
        ref.startsWith('tel:')
      ) {
        continue
      }

      const { relPath, hash } = normalizeLocalPath(ref, page)
      if (!fileExists(relPath)) {
        fail(`${page} references missing local path "${ref}"`)
        continue
      }

      if (hash && relPath.endsWith('.html')) {
        const ids = idsByPage.get(relPath) || extractIds(read(path.join(root, relPath)))
        idsByPage.set(relPath, ids)
        if (!ids.has(hash)) fail(`${page} references missing anchor "${ref}"`)
      }
    }

    const jsonLdPattern = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g
    while ((match = jsonLdPattern.exec(source))) {
      try { JSON.parse(match[1]) } catch (error) { fail(`${page} has invalid JSON-LD: ${error.message}`) }
    }
  }
}

try {
  const site = read(indexPath)
  const manifest = readJson(manifestPath)
  const downloads = readJson(downloadsPath)
  const robots = read(path.join(root, 'robots.txt'))
  const sitemap = read(path.join(root, 'sitemap.xml'))
  const llms = read(path.join(root, 'llms.txt'))
  const llmsFull = read(path.join(root, 'llms-full.txt'))

  const version = String(manifest.desktopRelease && manifest.desktopRelease.version || '')
  const sourceVersion = String(manifest.desktopSource && manifest.desktopSource.version || '')
  const catalogueVersion = String(manifest.desktopRelease && manifest.desktopRelease.catalogueVersion || '')
  const legacyMigrationId = String(manifest.desktopRelease && manifest.desktopRelease.legacyMigrationId || '')
  if (!/^v\d+\.\d+\.\d+$/.test(version)) throw new Error('Missing desktop release version in site manifest')
  if (!/^v\d+\.\d+\.\d+$/.test(sourceVersion)) throw new Error('Missing desktop source version in site manifest')
  if (!/^\d+$/.test(catalogueVersion)) throw new Error('Missing signed catalogue version in site manifest')
  if (!/^[a-z0-9]+$/.test(legacyMigrationId)) throw new Error('Missing legacy migration identifier in site manifest')

  const [, siteDriveKey] = mustMatch(
    site,
    /hyper:\/\/([0-9a-f]{64})\//,
    'site Hyperdrive key'
  )

  const expectedHero = `Desktop ${version} · signed catalogue v${catalogueVersion} live · package-proof builds · macOS · Windows · Linux`
  const expectedSpec = `${version} · signed catalogue v${catalogueVersion} · package-proof release`
  const expectedLegacyMigration = `Legacy migration identifier: ${legacyMigrationId}`
  const expectedSourceStatus = `${sourceVersion} is an unmerged`

  const artifactVersion = version.slice(1)
  if (!site.includes(`"softwareVersion": "${artifactVersion}"`)) fail('SoftwareApplication JSON-LD version is out of sync with the published release')
  for (const page of ['index.html', 'docs.html', 'download.html']) {
    for (const match of read(path.join(root, page)).matchAll(/PearBrowser-(\d+\.\d+\.\d+)-(?:macos|windows|linux)-/g)) {
      if (match[1] !== artifactVersion) fail(`${page} contains a stale desktop asset version: ${match[1]}`)
    }
  }

  if (!site.includes(expectedHero)) fail(`hero release line is out of sync; expected "${expectedHero}"`)
  if (!site.includes(expectedSpec)) fail(`spec table release line is out of sync; expected "${expectedSpec}"`)
  if (!site.includes(releaseUrl)) fail(`installer URL is missing from the public HTML; expected "${releaseUrl}"`)
  if (!site.includes(expectedLegacyMigration)) fail(`legacy migration record is out of sync; expected "${expectedLegacyMigration}"`)
  if (!site.includes(expectedSourceStatus) || !site.includes('draft candidate') || !site.includes(`${version} remains the latest published download`)) fail(`source/runtime line is out of sync with ${sourceVersion} draft and ${version} published download`)

  for (const phrase of requiredPhrases) {
    if (!site.includes(phrase)) fail(`site is missing expected ecosystem anchor: ${phrase}`)
  }

  requireEqual(manifest.id, 'pearbrowser-com', 'manifest id')
  requireEqual(version, approvedRelease.version, 'approved release version')
  requireEqual(manifest.version, version.replace(/^v/, ''), 'manifest version')
  requireEqual(manifest.desktopRelease && manifest.desktopRelease.releaseCommit, approvedRelease.sourceCommit, 'approved release source commit')
  requireEqual(manifest.hyperdrive && manifest.hyperdrive.driveKey, siteDriveKey, 'manifest Hyperdrive key')
  requireEqual(manifest.hyperdrive && manifest.hyperdrive.url, `hyper://${siteDriveKey}/`, 'manifest Hyperdrive URL')
  requireEqual(manifest.desktopRelease && manifest.desktopRelease.distribution && manifest.desktopRelease.distribution.primary, 'package-proof', 'manifest primary distribution')
  requireEqual(manifest.desktopRelease && manifest.desktopRelease.distribution && manifest.desktopRelease.distribution.installerUrl, releaseUrl, 'manifest installer URL')
  requireEqual(manifest.desktopSource && manifest.desktopSource.status, 'draft-candidate', 'source status')
  requireEqual(manifest.desktopSource && manifest.desktopSource.pullRequest, 'https://github.com/bigdestiny2/pearbrowser-desktop/pull/84', 'desktop draft PR')
  requireEqual(manifest.desktopSource && manifest.desktopSource.autobee && manifest.desktopSource.autobee.userDataMigration, false, 'Autobee migration boundary')
  requireEqual(manifest.desktopSource && manifest.desktopSource.releaseAssetsAvailable, false, 'source release-assets boundary')
  requireEqual(manifest.desktopSource && manifest.desktopSource.runtime && manifest.desktopSource.runtime.entrypoint, 'local-resolved-worker-only', 'source runtime entrypoint')
  requireEqual(manifest.desktopSource && manifest.desktopSource.runtime && manifest.desktopSource.runtime.pearRuntime, '1.3.1', 'source pear-runtime version')
  requireEqual(manifest.desktopSource && manifest.desktopSource.runtime && manifest.desktopSource.runtime.pearRuntimeUpdater, '3.4.0', 'source pear-runtime-updater version')
  requireEqual(manifest.desktopSource && manifest.desktopSource.runtime && manifest.desktopSource.runtime.pearInstall, '1.3.0', 'source pear-install version')
  requireEqual(manifest.desktopSource && manifest.desktopSource.runtime && manifest.desktopSource.runtime.removedLauncherSupported, false, 'removed launcher support boundary')
  requireEqual(manifest.privacy && manifest.privacy.telemetry, false, 'manifest telemetry claim')
  requireEqual(manifest.privacy && manifest.privacy.remoteAnalytics, false, 'manifest remote analytics claim')
  requireEqual(manifest.privacy && manifest.privacy.anonymity, 'not-an-anonymity-network', 'manifest anonymity boundary')
  requireEqual(manifest.webSearch && manifest.webSearch.provider, 'DuckDuckGo', 'manifest web search provider')
  requireEqual(manifest.webSearch && manifest.webSearch.pearBrowserSearchAnalytics, false, 'manifest search analytics claim')
  requireEqual(manifest.webSearch && manifest.webSearch.optionalPersistentVisitLogEntry, false, 'manifest search visit-log claim')
  requireEqual(manifest.webSearch && manifest.webSearch.anonymity, false, 'manifest web search anonymity boundary')

  requireEqual(downloads.version, version, 'downloads release version')
  requireEqual(downloads.sourceStatus && downloads.sourceStatus.version, sourceVersion, 'downloads source version')
  requireEqual(downloads.sourceStatus && downloads.sourceStatus.candidateCommit, manifest.desktopSource && manifest.desktopSource.candidateCommit, 'desktop draft commit')
  if (!/^[0-9a-f]{40}$/.test(manifest.desktopSource && manifest.desktopSource.candidateCommit || '')) fail('desktop draft commit must be a full Git SHA')
  requireEqual(downloads.sourceStatus && downloads.sourceStatus.status, 'draft-candidate', 'downloads source status')
  requireEqual(downloads.sourceStatus && downloads.sourceStatus.pullRequest, 'https://github.com/bigdestiny2/pearbrowser-desktop/pull/84', 'downloads desktop draft PR')
  requireEqual(downloads.mobile && downloads.mobile.android && downloads.mobile.android.pullRequest, 'https://github.com/bigdestiny2/PearBrowser/pull/6', 'Android draft PR')
  requireEqual(downloads.mobile && downloads.mobile.ios && downloads.mobile.ios.pullRequest, 'https://github.com/bigdestiny2/PearBrowser/pull/6', 'iOS draft PR')
  requireEqual(downloads.sourceStatus && downloads.sourceStatus.releaseAssetsAvailable, false, 'downloads source release-assets boundary')
  requireEqual(downloads.sourceStatus && downloads.sourceStatus.pearRuntime, '1.3.1', 'downloads pear-runtime version')
  requireEqual(downloads.sourceStatus && downloads.sourceStatus.pearRuntimeUpdater, '3.4.0', 'downloads pear-runtime-updater version')
  requireEqual(downloads.sourceStatus && downloads.sourceStatus.pearInstall, '1.3.0', 'downloads pear-install version')
  requireEqual(downloads.p2p && downloads.p2p.legacyMigrationId, legacyMigrationId, 'downloads legacy migration identifier')
  requireEqual(downloads.releaseUrl, `${releaseUrl}/tag/${version}`, 'downloads release URL')
  requireEqual(downloads.assetBase, `${releaseUrl}/download/${version}/`, 'downloads asset base')
  const builds = (downloads.platforms || []).flatMap((platform) => platform.builds || [])
  if (builds.length !== Object.keys(approvedRelease.assets).length) fail('download build count differs from the approved GitHub release')
  const filenames = new Set()
  for (const build of builds) {
    if (!String(build.file || '').includes(version.replace(/^v/, ''))) fail(`download filename is out of sync with ${version}: ${build.file || '(missing)'}`)
    if (!/^[0-9a-f]{64}$/.test(build.sha256 || '')) fail(`download SHA-256 is invalid for ${build.file || '(missing)'}`)
    if (!Number.isInteger(build.bytes) || build.bytes <= 0) fail(`download byte size is invalid for ${build.file || '(missing)'}`)
    if (filenames.has(build.file)) fail(`duplicate download filename: ${build.file}`)
    const proof = approvedRelease.assets[build.file]
    if (!proof) fail(`download is absent from the approved GitHub release: ${build.file}`)
    else {
      requireEqual(build.sha256, proof.sha256, `${build.file} SHA-256`)
      requireEqual(build.bytes, proof.bytes, `${build.file} byte size`)
    }
    filenames.add(build.file)
  }
  const linuxAppImages = builds.filter((build) => /-linux-[A-Za-z0-9._-]+\.AppImage$/.test(build.file || ''))
  requireEqual(linuxAppImages.length, 1, 'Linux product AppImage count')

  for (const entry of manifest.files || []) {
    if (!entry.path || !fileExists(entry.path)) fail(`manifest references missing file "${entry.path}"`)
  }
  for (const page of htmlPages) {
    if (!manifest.files.some((entry) => entry.path === page)) fail(`manifest files missing ${page}`)
  }

  checkHtmlReferences(htmlPages)

  for (const route of Object.values(publicRoutes)) {
    if (!sitemap.includes(`<loc>${route}</loc>`)) fail(`sitemap is missing ${route}`)
  }
  if ((sitemap.match(new RegExp(`<lastmod>${manifest.updated}</lastmod>`, 'g')) || []).length !== htmlPages.length) fail('sitemap lastmod dates are out of sync with the site manifest')
  if (!read(path.join(root, 'privacy.html')).includes(`\"dateModified\": \"${manifest.updated}\"`)) fail('privacy structured dateModified is out of sync')
  if (!robots.includes('User-agent: OAI-SearchBot')) fail('robots.txt must explicitly allow OAI-SearchBot')
  if (!robots.includes('Sitemap: https://pearbrowser.com/sitemap.xml')) fail('robots.txt is missing the canonical sitemap URL')
  if (!llms.includes("PearBrowser is private, not anonymous.")) fail('llms.txt is missing the anonymity boundary')
  if (!llms.includes('DuckDuckGo receives the query and network address')) fail('llms.txt is missing the web-search provider boundary')
  if (!llmsFull.includes('explicitly excludes submitted web searches from its optional persistent visit log')) fail('llms-full.txt is missing the web-search visit-log behavior')
  if (!llmsFull.includes('does not automatically detect those endpoints or route browser traffic through Tor')) fail('llms-full.txt is missing the Tor routing boundary')
  for (const page of ['index.html', 'download.html', 'privacy.html', 'llms.txt', 'llms-full.txt']) {
    const source = read(path.join(root, page))
    if (!source.includes('cookies') || !source.includes('127.0.0.1')) fail(`${page} is missing the published P2P app cookie limitation`)
  }

  const publicTextFiles = [...htmlPages, 'README.md', 'site-manifest.json', 'llms.txt', 'llms-full.txt']
  const prohibitedLegacyName = ['peer', 'sky'].join('')
  const removedLauncher = new RegExp(`\\b${['pear', 'run'].join('\\s+')}\\b`, 'i')
  for (const file of publicTextFiles) {
    const source = read(path.join(root, file))
    if (source.toLowerCase().includes(prohibitedLegacyName)) fail(`${file} contains a prohibited legacy name`)
    if (/No servers behind it/i.test(source)) fail(`${file} contains the overbroad no-servers claim`)
    if (removedLauncher.test(source)) fail(`${file} contains the removed Pear launcher command`)
    if (/legacy fallback/i.test(source)) fail(`${file} contains legacy fallback guidance`)
  }

  if (process.exitCode) process.exit(process.exitCode)
  console.log('check-sync: ok')
} catch (error) {
  fail(error.message)
  process.exit(process.exitCode)
}
