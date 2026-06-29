#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const indexPath = path.join(root, 'index.html')
const manifestPath = path.join(root, 'site-manifest.json')
const desktopReadmePath = path.join(root, '..', '..', '01-browser', 'pearbrowser-desktop', 'README.md')
const htmlPages = ['index.html', 'features.html', 'apps.html', 'docs.html', 'download.html']
const releaseUrl = 'https://github.com/bigdestiny2/pearbrowser-desktop/releases'
const requiredPhrases = [
  'Preview builds: macOS .app.zip · Windows .msix · Linux .AppImage',
  'Legacy fallback:',
  'Shared catalog + gateway contract with PearBrowser Mobile',
  'https://github.com/bigdestiny2/pearbrowser-desktop/blob/main/docs/SWARM-V1.md',
  'https://github.com/bigdestiny2/PearBrowser'
]

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
  for (const page of pages) idsByPage.set(page, extractIds(read(path.join(root, page))))

  const attrPattern = /\b(?:href|src)=["']([^"']+)["']/g
  for (const page of pages) {
    const source = read(path.join(root, page))
    if (!source.includes('href="site-manifest.json"')) fail(`${page} is missing the site manifest discovery link`)
    if (!source.includes('href="assets/styles.css"')) fail(`${page} is missing the shared stylesheet`)

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
  }
}

try {
  const site = read(indexPath)
  const desktopReadme = read(desktopReadmePath)
  const manifest = readJson(manifestPath)

  const [, version, length] = mustMatch(
    desktopReadme,
    /\*\*Current release:\*\*\s*`(v[^`]+)` · production length `(\d+)`/,
    'desktop release metadata'
  )

  const [, driveKey] = mustMatch(
    desktopReadme,
    /pear run (pear:\/\/[a-z0-9]+)/,
    'desktop launch key'
  )

  const [, siteDriveKey] = mustMatch(
    site,
    /hyper:\/\/([0-9a-f]{64})\//,
    'site Hyperdrive key'
  )

  const expectedHero = `Desktop ${version} · production length ${length} · preview builds · macOS · Windows · Linux`
  const expectedSpec = `${version} · production length ${length} · pinned on the HiveRelay backbone`
  const expectedLegacyLaunch = `pear run ${driveKey}`

  if (!site.includes(expectedHero)) fail(`hero release line is out of sync; expected "${expectedHero}"`)
  if (!site.includes(expectedSpec)) fail(`spec table release line is out of sync; expected "${expectedSpec}"`)
  if (!site.includes(releaseUrl)) fail(`installer URL is missing from the public HTML; expected "${releaseUrl}"`)
  if (!site.includes(expectedLegacyLaunch)) fail(`legacy launch command is out of sync; expected "${expectedLegacyLaunch}"`)

  for (const phrase of requiredPhrases) {
    if (!site.includes(phrase)) fail(`site is missing expected ecosystem anchor: ${phrase}`)
  }

  requireEqual(manifest.id, 'pearbrowser-com', 'manifest id')
  requireEqual(manifest.version, version.replace(/^v/, ''), 'manifest version')
  requireEqual(manifest.hyperdrive && manifest.hyperdrive.driveKey, siteDriveKey, 'manifest Hyperdrive key')
  requireEqual(manifest.hyperdrive && manifest.hyperdrive.url, `hyper://${siteDriveKey}/`, 'manifest Hyperdrive URL')
  requireEqual(manifest.desktopRelease && manifest.desktopRelease.version, version, 'manifest desktop release version')
  requireEqual(manifest.desktopRelease && manifest.desktopRelease.productionLength, Number(length), 'manifest production length')
  requireEqual(manifest.desktopRelease && manifest.desktopRelease.legacyLaunchCommand, expectedLegacyLaunch, 'manifest legacy launch command')
  requireEqual(manifest.desktopRelease && manifest.desktopRelease.distribution && manifest.desktopRelease.distribution.primary, 'preview-unsigned', 'manifest primary distribution')
  requireEqual(manifest.desktopRelease && manifest.desktopRelease.distribution && manifest.desktopRelease.distribution.installerUrl, releaseUrl, 'manifest installer URL')

  for (const entry of manifest.files || []) {
    if (!entry.path || !fileExists(entry.path)) fail(`manifest references missing file "${entry.path}"`)
  }
  for (const page of htmlPages) {
    if (!manifest.files.some((entry) => entry.path === page)) fail(`manifest files missing ${page}`)
  }

  checkHtmlReferences(htmlPages)

  if (process.exitCode) process.exit(process.exitCode)
  console.log('check-sync: ok')
} catch (error) {
  fail(error.message)
  process.exit(process.exitCode)
}
