#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const indexPath = path.join(root, 'index.html')
const desktopReadmePath = path.join(root, '..', '..', '01-browser', 'pearbrowser-desktop', 'README.md')

function read(file) {
  return fs.readFileSync(file, 'utf8')
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

try {
  const site = read(indexPath)
  const desktopReadme = read(desktopReadmePath)

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

  const expectedHero = `Desktop ${version} · production length ${length} · macOS · Windows · Linux`
  const expectedSpec = `${version} · production length ${length} · pinned on 5+ relays`
  const expectedLaunch = `pear run ${driveKey}`
  const requiredPhrases = [
    'Shared catalog + gateway contract with PearBrowser Mobile',
    'https://github.com/bigdestiny2/pearbrowser-desktop/blob/main/docs/SWARM-V1.md',
    'https://github.com/bigdestiny2/PearBrowser'
  ]

  if (!site.includes(expectedHero)) fail(`hero release line is out of sync; expected "${expectedHero}"`)
  if (!site.includes(expectedSpec)) fail(`spec table release line is out of sync; expected "${expectedSpec}"`)
  if (!site.includes(expectedLaunch)) fail(`launch command is out of sync; expected "${expectedLaunch}"`)

  for (const phrase of requiredPhrases) {
    if (!site.includes(phrase)) fail(`site is missing expected ecosystem anchor: ${phrase}`)
  }

  if (process.exitCode) process.exit(process.exitCode)
  console.log('check-sync: ok')
} catch (error) {
  fail(error.message)
  process.exit(process.exitCode)
}
