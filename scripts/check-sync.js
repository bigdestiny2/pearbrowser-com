#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const indexPath = path.join(root, 'index.html')
const manifestPath = path.join(root, 'site-manifest.json')
const downloadsPath = path.join(root, 'downloads.json')
const htmlPages = ['index.html', 'features.html', 'apps.html', 'docs.html', 'download.html']
const releaseUrl = 'https://github.com/bigdestiny2/pearbrowser-desktop/releases'
const requiredPhrases = [
  'Preview builds: macOS .app.zip · Windows .msix · Linux .AppImage',
  'Migration boundary:',
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
  }
}

try {
  const site = read(indexPath)
  const manifest = readJson(manifestPath)
  const downloads = readJson(downloadsPath)

  const version = String(manifest.desktopRelease && manifest.desktopRelease.version || '')
  const length = String(manifest.desktopRelease && manifest.desktopRelease.productionLength || '')
  const driveKey = String(manifest.desktopRelease && manifest.desktopRelease.legacyMigrationKey || '')
  if (!/^v\d+\.\d+\.\d+$/.test(version)) throw new Error('Missing desktop release version in site manifest')
  if (!/^\d+$/.test(length)) throw new Error('Missing desktop production length in site manifest')
  if (!/^pear:\/\/[a-z0-9]+$/.test(driveKey)) throw new Error('Missing legacy migration key in site manifest')

  const [, siteDriveKey] = mustMatch(
    site,
    /hyper:\/\/([0-9a-f]{64})\//,
    'site Hyperdrive key'
  )

  const expectedHero = `Desktop ${version} · production length ${length} · preview builds live · macOS · Windows · Linux`
  const expectedSpec = `${version} · production length ${length} · pinned on the HiveRelay backbone`
  const expectedLegacyMigration = `Legacy migration record: ${driveKey}`

  if (!site.includes(expectedHero)) fail(`hero release line is out of sync; expected "${expectedHero}"`)
  if (!site.includes(expectedSpec)) fail(`spec table release line is out of sync; expected "${expectedSpec}"`)
  if (!site.includes(releaseUrl)) fail(`installer URL is missing from the public HTML; expected "${releaseUrl}"`)
  if (!site.includes(expectedLegacyMigration)) fail(`legacy migration record is out of sync; expected "${expectedLegacyMigration}"`)

  for (const phrase of requiredPhrases) {
    if (!site.includes(phrase)) fail(`site is missing expected ecosystem anchor: ${phrase}`)
  }

  requireEqual(manifest.id, 'pearbrowser-com', 'manifest id')
  requireEqual(manifest.version, version.replace(/^v/, ''), 'manifest version')
  requireEqual(manifest.hyperdrive && manifest.hyperdrive.driveKey, siteDriveKey, 'manifest Hyperdrive key')
  requireEqual(manifest.hyperdrive && manifest.hyperdrive.url, `hyper://${siteDriveKey}/`, 'manifest Hyperdrive URL')
  requireEqual(manifest.desktopRelease && manifest.desktopRelease.distribution && manifest.desktopRelease.distribution.primary, 'preview-unsigned', 'manifest primary distribution')
  requireEqual(manifest.desktopRelease && manifest.desktopRelease.distribution && manifest.desktopRelease.distribution.installerUrl, releaseUrl, 'manifest installer URL')

  requireEqual(downloads.version, version, 'downloads release version')
  requireEqual(downloads.releaseUrl, `${releaseUrl}/tag/${version}`, 'downloads release URL')
  requireEqual(downloads.assetBase, `${releaseUrl}/download/${version}/`, 'downloads asset base')
  const builds = (downloads.platforms || []).flatMap((platform) => platform.builds || [])
  const filenames = new Set()
  for (const build of builds) {
    if (!String(build.file || '').includes(version.replace(/^v/, ''))) fail(`download filename is out of sync with ${version}: ${build.file || '(missing)'}`)
    if (!/^[0-9a-f]{64}$/.test(build.sha256 || '')) fail(`download SHA-256 is invalid for ${build.file || '(missing)'}`)
    if (!Number.isInteger(build.bytes) || build.bytes <= 0) fail(`download byte size is invalid for ${build.file || '(missing)'}`)
    if (filenames.has(build.file)) fail(`duplicate download filename: ${build.file}`)
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

  if (process.exitCode) process.exit(process.exitCode)
  console.log('check-sync: ok')
} catch (error) {
  fail(error.message)
  process.exit(process.exitCode)
}
