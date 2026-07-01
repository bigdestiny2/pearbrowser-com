/* PearBrowser downloads — renders download.html from downloads.json. */
(function () {
  'use strict'

  var OS_ICON = {
    macos: '<svg class="dl-os-ico" viewBox="0 0 24 24" fill="#17211b" aria-hidden="true"><path d="M16.4 1.9c0 1-.4 2-1.1 2.8-.8.9-2 1.6-3.1 1.5-.1-1 .4-2.1 1.1-2.8.8-.9 2.1-1.5 3.1-1.5zM20 17.1c-.5 1.2-.8 1.8-1.5 2.9-1 1.5-2.4 3.4-4.1 3.4-1.5 0-1.9-1-4-1-2 0-2.5 1-4 1-1.7 0-3-1.7-4-3.2-2.8-4.2-3.1-9.2-1.4-11.9 1.2-1.9 3.1-3 4.9-3 1.8 0 3 1 4.5 1 1.5 0 2.4-1 4.5-1 1.6 0 3.3.9 4.5 2.4-3.9 2.2-3.3 7.8.1 9.4z"/></svg>',
    windows: '<svg class="dl-os-ico" viewBox="0 0 24 24" fill="#0f766e" aria-hidden="true"><path d="M3 5.5 10.5 4.4v7.1H3zM3 12.5h7.5v7.1L3 18.5zM11.5 4.2 21 3v8.5h-9.5zM11.5 12.5H21V21l-9.5-1.3z"/></svg>',
    linux: '<svg class="dl-os-ico" viewBox="0 0 24 24" fill="#b97812" aria-hidden="true"><path d="M12 2c2 0 3 1.8 3 4 0 1.5-.6 2.4-.6 3.6 0 .8.6 1.3 1.4 2.6.9 1.4 2.2 3.2 2.2 5.3 0 1.7-1 2.9-2.4 3.4.2.4.3.8.3 1.1H7.1c0-.3.1-.7.3-1.1C6 22.9 5 21.7 5 20c0-2.1 1.3-3.9 2.2-5.3.8-1.3 1.4-1.8 1.4-2.6 0-1.2-.6-2.1-.6-3.6 0-2.2 1-4 3-4z"/></svg>',
    android: '<svg class="dl-os-ico" viewBox="0 0 24 24" fill="#16834f" aria-hidden="true"><path d="M6 9h12v8a1 1 0 0 1-1 1h-1v3h-2v-3h-2v3H9v-3H7a1 1 0 0 1-1-1zM4 9.5A1.5 1.5 0 0 1 5.5 11v4A1.5 1.5 0 0 1 2.5 15v-4A1.5 1.5 0 0 1 4 9.5zM20 9.5A1.5 1.5 0 0 1 21.5 11v4A1.5 1.5 0 0 1 18.5 15v-4A1.5 1.5 0 0 1 20 9.5zM7.5 8a4.5 4.5 0 0 1 9 0z"/></svg>',
    ios: '<svg class="dl-os-ico" viewBox="0 0 24 24" fill="#17211b" aria-hidden="true"><path d="M16.4 1.9c0 1-.4 2-1.1 2.8-.8.9-2 1.6-3.1 1.5-.1-1 .4-2.1 1.1-2.8.8-.9 2.1-1.5 3.1-1.5zM20 17.1c-.5 1.2-.8 1.8-1.5 2.9-1 1.5-2.4 3.4-4.1 3.4-1.5 0-1.9-1-4-1-2 0-2.5 1-4 1-1.7 0-3-1.7-4-3.2-2.8-4.2-3.1-9.2-1.4-11.9 1.2-1.9 3.1-3 4.9-3 1.8 0 3 1 4.5 1 1.5 0 2.4-1 4.5-1 1.6 0 3.3.9 4.5 2.4-3.9 2.2-3.3 7.8.1 9.4z"/></svg>'
  }

  function el (tag, cls, html) {
    var node = document.createElement(tag)
    if (cls) node.className = cls
    if (html != null) node.innerHTML = html
    return node
  }

  function esc (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  function mb (bytes) { return (bytes / (1024 * 1024)).toFixed(1) + ' MB' }

  function detectOS () {
    var ua = navigator.userAgent || ''
    var uad = navigator.userAgentData
    var plat = (uad && uad.platform) || navigator.platform || ''
    if (/Android/i.test(ua)) return { os: 'android', arch: null }
    if (/iPhone|iPad|iPod/i.test(ua)) return { os: 'ios', arch: null }
    if (/Mac/i.test(plat) || /Mac OS X/i.test(ua)) {
      // Apple Silicon detection is unreliable from JS; default to arm64 (current Macs), offer both.
      return { os: 'macos', arch: 'arm64' }
    }
    if (/Win/i.test(plat) || /Windows/i.test(ua)) return { os: 'windows', arch: 'x64' }
    if (/Linux/i.test(plat) || /Linux/i.test(ua)) return { os: 'linux', arch: 'x64' }
    return { os: null, arch: null }
  }

  function buildCard (data, p, detected) {
    var card = el('div', 'dl-card' + (detected && detected.os === p.os ? ' is-detected' : ''))
    var badgeCls = p.status === 'preview' ? 'preview' : p.status === 'blocked' ? 'blocked' : 'ok'
    card.appendChild(el('h3', null, OS_ICON[p.os] + '<span>' + esc(p.label) + '</span>' +
      '<span class="dl-badge ' + badgeCls + '" style="margin-left:auto;">' + esc(p.statusLabel) + '</span>'))

    p.builds.forEach(function (b) {
      var build = el('div', 'dl-build')
      var url = data.assetBase + b.file
      var disabled = p.status === 'blocked'
      var btn = disabled
        ? '<span class="btn subtle" aria-disabled="true" style="opacity:.55;cursor:not-allowed;">Unsigned ' + esc(b.archLabel) + '</span>'
        : '<a class="btn primary" href="' + esc(url) + '" download>Download ' + esc(b.archLabel) + '</a>'
      build.appendChild(el('div', 'dl-build-row',
        btn + '<span class="dl-build-size">' + mb(b.bytes) + '</span>'))
      var shaShort = b.sha256.slice(0, 16) + '…' + b.sha256.slice(-8)
      var sha = el('div', 'dl-sha')
      sha.setAttribute('data-copy', b.sha256)
      sha.innerHTML = '<span title="' + esc(b.sha256) + '">SHA-256 ' + esc(shaShort) + '</span>' +
        '<button class="dl-copy" type="button" aria-label="Copy SHA-256">copy</button>'
      build.appendChild(sha)
      card.appendChild(build)
    })

    if (p.openNote) card.appendChild(el('p', 'dl-note', esc(p.openNote)))
    return card
  }

  function renderDesktop (data, detected) {
    var host = document.getElementById('dl-desktop')
    if (!host) return
    host.innerHTML = ''
    data.platforms.forEach(function (p) { host.appendChild(buildCard(data, p, detected)) })
  }

  function renderDetected (data, detected) {
    var box = document.getElementById('dl-detected')
    var text = document.getElementById('dl-detected-text')
    var action = document.getElementById('dl-detected-action')
    if (!box) return
    box.hidden = false
    if (detected.os === 'ios') {
      text.innerHTML = '<strong>iPhone / iPad</strong> detected — PearBrowser for iOS ships via the App Store / TestFlight (coming soon).'
      return
    }
    if (detected.os === 'android') {
      text.innerHTML = '<strong>Android</strong> detected — a signed APK and Play listing are coming soon.'
      return
    }
    var p = data.platforms.find(function (x) { return x.os === detected.os })
    if (!p) { text.textContent = 'Pick your platform below.'; return }
    if (p.status === 'blocked') {
      text.innerHTML = 'Detected <strong>' + esc(p.label) + '</strong> — desktop build is an unsigned preview; see the P2P launch path below.'
      return
    }
    var b = p.builds.find(function (x) { return x.arch === detected.arch }) || p.builds[0]
    text.innerHTML = 'Detected <strong>' + esc(p.label) + '</strong> · ' + esc(b.archLabel)
    action.innerHTML = '<a class="btn primary" href="' + esc(data.assetBase + b.file) + '" download>Download for ' + esc(p.label) + '</a>'
  }

  function renderP2P (data) {
    var card = document.getElementById('dl-p2p')
    if (card) {
      card.setAttribute('data-copy', data.p2p.pearRunCommand)
      card.innerHTML =
        '<div class="dl-build-row"><span class="dl-build-arch">Launch over Pear</span>' +
        '<button class="dl-copy" type="button" aria-label="Copy launch command">copy command</button></div>' +
        '<div class="dl-cmd" style="margin:0;"><code>' + esc(data.p2p.pearRunCommand) + '</code></div>' +
        '<p class="dl-note">First install the runtime: <code>npm i -g pear</code></p>' +
        '<div class="dl-build-row" style="border-top:1px solid var(--line);padding-top:10px;">' +
        '<a class="btn subtle" href="' + esc(data.p2p.hyper) + '">Open the P2P edition of this site ↗</a></div>'
    }
    var note = document.getElementById('dl-p2p-note')
    if (note) note.textContent = data.p2p.note
  }

  function renderMobile (data) {
    var host = document.getElementById('dl-mobile')
    if (!host || !data.mobile) return
    var rows = [['android', 'Android', data.mobile.android], ['ios', 'iOS', data.mobile.ios]]
    rows.forEach(function (r) {
      var m = r[2]; if (!m) return
      var card = el('div', 'dl-card')
      card.appendChild(el('h3', null, OS_ICON[r[0]] + '<span>' + esc(r[1]) + '</span>' +
        '<span class="dl-badge blocked" style="margin-left:auto;">' + esc(m.statusLabel) + '</span>'))
      card.appendChild(el('p', 'dl-note', esc(m.note)))
      host.appendChild(card)
    })
  }

  function fail (msg) {
    var host = document.getElementById('dl-desktop')
    if (host) host.innerHTML = '<p class="dl-note">Could not load the download list. Get every asset from the ' +
      '<a href="https://github.com/bigdestiny2/pearbrowser-desktop/releases">GitHub releases page</a>. (' + esc(msg) + ')</p>'
  }

  fetch('downloads.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
    .then(function (data) {
      var v = document.getElementById('dl-version')
      if (v) v.textContent = data.version
      var detected = detectOS()
      renderDetected(data, detected)
      renderDesktop(data, detected)
      renderP2P(data)
      renderMobile(data)
    })
    .catch(function (e) { fail(e.message) })
})()
