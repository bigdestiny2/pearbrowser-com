#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')

const routeFiles = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/privacy': 'privacy.html',
  '/privacy.html': 'privacy.html',
  '/features': 'features.html',
  '/features.html': 'features.html',
  '/apps': 'apps.html',
  '/apps.html': 'apps.html',
  '/docs': 'docs.html',
  '/docs.html': 'docs.html',
  '/download': 'download.html',
  '/download.html': 'download.html',
  '/download.js': 'download.js',
  '/downloads.json': 'downloads.json',
  '/site-manifest.json': 'site-manifest.json',
  '/robots.txt': 'robots.txt',
  '/sitemap.xml': 'sitemap.xml',
  '/llms.txt': 'llms.txt',
  '/llms-full.txt': 'llms-full.txt',
  '/assets/styles.css': 'assets/styles.css',
  '/assets/og.png': 'assets/og.png'
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
}

const files = {}
for (const [route, relPath] of Object.entries(routeFiles)) {
  const absolute = path.join(root, relPath)
  const body = fs.readFileSync(absolute)
  files[route] = {
    body: body.toString('base64'),
    contentType: contentTypes[path.extname(relPath)] || 'application/octet-stream',
    cacheControl: route.startsWith('/assets/')
      ? 'public, max-age=86400, stale-while-revalidate=604800'
      : 'public, max-age=0, must-revalidate'
  }
}

const worker = `const files = ${JSON.stringify(files)}

function decodeBase64 (value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export default {
  async fetch (request) {
    const url = new URL(request.url)
    let pathname = url.pathname
    if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1)
    const file = files[pathname]
    if (!file) {
      return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><title>Not found — PearBrowser</title><body><h1>Not found</h1><p><a href="/">Return to PearBrowser</a></p></body></html>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }
      })
    }

    const headers = {
      'Content-Type': file.contentType,
      'Cache-Control': file.cacheControl,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
    return new Response(request.method === 'HEAD' ? null : decodeBase64(file.body), { status: 200, headers })
  }
}
`

fs.rmSync(dist, { recursive: true, force: true })
fs.mkdirSync(path.join(dist, 'server'), { recursive: true })
fs.writeFileSync(path.join(dist, 'server', 'index.js'), worker)
console.log(`build-sites: ${Object.keys(files).length} routes -> dist/server/index.js`)
