import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import { load } from 'cheerio'
import puppeteer from 'puppeteer'
import tls from 'tls'
import { URL as NodeURL } from 'url'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
app.use(cors())
app.use(express.json())

// Static Frontend (in Produktion)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const staticDir = process.env.STATIC_DIR || path.join(__dirname, 'public')
app.use(express.static(staticDir))

const patterns = {
  trackers: [
    /google-analytics\.com\/analytics\.js/i,
    /gtag\s*\(/i,
    /googletagmanager\.com\/gtm\.js/i,
    /GTM-[A-Z0-9]+/i,
    /googlesyndication\.com|adservice\.google\.com|doubleclick\.net/i,
    /connect\.facebook\.net\//i,
    /fbq\s*\(/i,
    /facebook\.com\/tr\//i,
    /hotjar\.com\//i,
    /hj\s*\(/i,
    /clarity\.ms\//i,
    /clarity\s*\(/i,
    /matomo\.(js|php)/i,
    /plausible\.io\//i,
    /umami\.(js|is)/i,
    /tiktok\.com\/i18n\/pixel/i,
    /snap\.licdn\.com|px\.ads\.linkedin\.com/i,
  ],
  googleTools: [
    /googletagmanager\.com/i,
    /google-analytics\.com/i,
    /recaptcha\.net|google\.com\/recaptcha/i,
    /googleapis\.com|gstatic\.com/i,
    /maps\.googleapis\.com|maps\.google\.com/i,
  ],
  criticalTools: [
    /cdn\.cookielaw\.org/i,
    /cdn\.segment\.com/i,
    /cdn\.sentry-cdn\.com|browser\.sentry-cdn\.com/i,
    /intercomcdn\.com|widget\.intercom\.io/i,
    /mixpanel\.com/i,
  ],
  externalFiles: [
    /https?:\/\/[^\s]+\.(js|css)/i,
    /<link[^>]+href=\"https?:\/{2}\//i,
  ],
  consentHints: [
    /cookie(consent|banner|notice)/i,
    /tcfapi|__tcfapi/i,
    /consent([-_])?manager/i,
  ],
}

function testPatterns(text, list) {
  return list.some((re) => re.test(text))
}

function extractResources($) {
  const scripts = []
  const links = []
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src') || ''
    if (src) scripts.push(src)
  })
  $('link[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href) links.push(href)
  })
  return { scripts, links }
}

function buildFindings(html) {
  const $ = load(html)
  const { scripts, links } = extractResources($)
  const textBlob = [html, ...scripts, ...links].join('\n')

  const hasTracker = testPatterns(textBlob, patterns.trackers)
  const hasGoogle = testPatterns(textBlob, patterns.googleTools)
  const hasCritical = testPatterns(textBlob, patterns.criticalTools)
  const hasExternal = testPatterns(textBlob, patterns.externalFiles)
  const hasConsent = testPatterns(textBlob, patterns.consentHints)

  const indicators = []
  if (hasTracker) indicators.push('Tracker ohne Einwilligung möglich')
  if (hasGoogle) indicators.push('Google-Tools im Einsatz, Consent prüfen')
  if (hasCritical) indicators.push('Kritische Tools erkannt, AVV/DSA prüfen')
  if (hasExternal) indicators.push('Externe Dateien geladen, Herkunft prüfen')
  if (!hasConsent) indicators.push('Kein Consent-Manager gefunden')

  const tips = []
  if (hasTracker || hasGoogle) tips.push('Implementiere Consent vor Laden von Trackern (TCF 2.2/CMP).')
  if (!hasConsent) tips.push('Integriere einen CMP (z. B. Sourcepoint, OneTrust, Cookiebot).')
  if (hasExternal) tips.push('Setze Subresource Integrity und prüfe Drittlandtransfer.')
  if (hasCritical) tips.push('Schließe AV-Verträge, Dokumentiere Verarbeitungsverzeichnis und DPA/DSA.')
  if (scripts.some((s) => /http:\/\//.test(s))) tips.push('Nur HTTPS-Ressourcen laden (kein Mixed Content).')

  const categorized = {
    trackingCookies: hasTracker,
    trackers: hasTracker,
    googleTools: hasGoogle,
    criticalTools: hasCritical,
    externalFiles: hasExternal,
    consentPresent: hasConsent,
  }

  // WordPress Erkennung
  const isWordPress = /wp-content|wp-includes|<meta[^>]+name=["']generator["'][^>]+WordPress/i.test(html)
  let wpVersion = null
  const gen = $('meta[name="generator"]').attr('content') || ''
  const m = gen.match(/WordPress\s+([\d.]+)/i)
  if (m) wpVersion = m[1]

  // Plugins/Themes aus allen Head/Body-Quellen per Regex extrahieren
  const pluginMatches = [...html.matchAll(/\/wp-content\/plugins\/([^\/'"\s]+)/gi)]
  const themeMatches = [...html.matchAll(/\/wp-content\/themes\/([^\/'"\s]+)/gi)]
  const wpPlugins = Array.from(new Set(pluginMatches.map((m) => m[1])))
  const wpThemes = Array.from(new Set(themeMatches.map((m) => m[1])))

  const wpNotes = []
  if (isWordPress) {
    if (wpPlugins.length === 0) wpNotes.push('Keine Plugins erkannt – ggf. sind Ressourcen gebündelt oder minimiert.')
    if (wpThemes.length === 0) wpNotes.push('Kein Theme erkannt – Pfade könnten durch Caching/Proxy verändert sein.')
    if (testPatterns(textBlob, [/contact-form-7/i])) wpNotes.push('Contact Form 7 erkannt – prüfe Datenerhebung und Drittlandtransfer.')
    if (testPatterns(textBlob, [/woocommerce/i])) wpNotes.push('WooCommerce erkannt – prüfe Zahlungs-/Tracking‑Integrationen und AV‑Verträge.')
    if (testPatterns(textBlob, [/wordfence/i])) wpNotes.push('Wordfence erkannt – prüfe IP‑Speicherung und Log‑Aufbewahrung.')
  }

  const wp = { isWordPress, version: wpVersion, plugins: wpPlugins, themes: wpThemes, notes: wpNotes }

  // Ergänzende Handlungstipps für Einsteiger
  tips.push('Erstelle ein Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO).')
  tips.push('Überprüfe Datenschutzerklärung: Zwecke, Rechtsgrundlagen, Empfänger, Speicherdauer, Betroffenenrechte.')
  if (!hasConsent) tips.push('Vor dem Laden nicht-notwendiger Dienste Einwilligung einholen; Buttons/Overlays entsprechend gestalten.')

  // Wichtig: Score wird final im /scan-Handler anhand geladener Requests berechnet
  return { categorized, indicators, tips, scripts, links, wp }
}

// Health
app.get(['/health','/api/health'], (_req, res) => {
  res.json({ ok: true })
})

// Scan
app.get(['/scan','/api/scan'], async (req, res) => {
  const target = String(req.query.url || '')
  if (!target || !/^https?:\/\//i.test(target)) {
    return res.status(400).json({ error: 'Bitte vollständige URL mit http(s) angeben.' })
  }
  try {
    const resp = await fetch(target, { redirect: 'follow' })
    const html = await resp.text()
    const baseFindings = buildFindings(html)

    // Erweiterter Scan mit Browser
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setViewport({ width: 1366, height: 900 })

    const requests = []
    const requestTypes = {}
    page.on('requestfinished', async (request) => {
      try {
        const url = request.url()
        const type = request.resourceType()
        requestTypes[type] = (requestTypes[type] || 0) + 1
        const response = await request.response()
        const status = response?.status() || 0
        requests.push({ url, type, status })
      } catch {}
    })

    await page.goto(target, { waitUntil: 'networkidle2', timeout: 45000 })

    // Cookies aus dem Browser
    const pageCookies = await page.cookies()

    // Fingerprint/Client-Infos
    const fp = await page.evaluate(() => ({
      language: navigator.language,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      screen: { width: window.screen.width, height: window.screen.height, colorDepth: window.screen.colorDepth },
      timezoneMinutes: new Date().getTimezoneOffset(),
      touch: 'ontouchstart' in window,
      cookiesEnabled: navigator.cookieEnabled,
      plugins: (navigator.plugins ? Array.from(navigator.plugins).map(p => p.name).slice(0, 10) : [])
    }))

    // Zusätzliche Seiten (einfaches Crawling: interne Links, nur HTML fetch)
    const sameHostLinks = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a[href]'))
        .map(el => (el.getAttribute('href') || '').trim())
        .filter(h => !!h)
      return a
    })
    const origin = new NodeURL(target).origin
    const normalized = Array.from(new Set(sameHostLinks
      .map(h => {
        try { return new URL(h, origin).toString() } catch { return '' }
      })
      .filter(u => u.startsWith(origin))))
      .slice(0, 8)

    const crawledPages = []
    for (const u of normalized) {
      try {
        const r = await fetch(u, { redirect: 'follow' })
        const t = await r.text()
        crawledPages.push(u)
        // aggregiere scripts/links für bessere Erkennung
        const f = buildFindings(t)
        baseFindings.scripts.push(...f.scripts)
        baseFindings.links.push(...f.links)
        baseFindings.indicators.push(...f.indicators.filter(i => !baseFindings.indicators.includes(i)))
      } catch {}
    }

    await browser.close()

    // Consent- und Datenschutzerklärungs-Erkennung (gerenderte Seite)
    let consentEval = { found: false, hasTcf: false }
    let privacyEval = { present: false, url: null }
    try {
      consentEval = await (async () => {
        const browser2 = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
        const page2 = await browser2.newPage()
        await page2.setViewport({ width: 1366, height: 900 })
        await page2.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 })
        const result = await page2.evaluate(() => {
          const html = document.documentElement ? document.documentElement.innerHTML : ''
          const hints = [
            /__tcfapi|tcfapi/i,
            /cookie(consent|banner|notice)/i,
            /consent[-_]?manager/i,
            /real[-_ ]?cookie[-_ ]?banner/i,
            /borlabs[-_ ]?cookie/i,
            /usercentrics/i,
            /onetrust/i,
            /cookieyes/i,
            /complianz/i,
          ]
          const hasTcf = typeof (window).__tcfapi === 'function'
          const found = hints.some((re) => re.test(html)) || hasTcf
          return { found, hasTcf }
        })
        await browser2.close()
        return result
      })()
    } catch {}

    try {
      const browser3 = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
      const page3 = await browser3.newPage()
      await page3.setViewport({ width: 1366, height: 900 })
      await page3.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 })
      privacyEval = await page3.evaluate(() => {
        function findPrivacyLink() {
          const anchors = Array.from(document.querySelectorAll('a[href]'))
          const patterns = [/datenschutzerkl[aä]rung/i, /datenschutz/i, /privacy\s*policy/i]
          for (const a of anchors) {
            const text = (a.textContent || '').trim()
            const href = (a.getAttribute('href') || '').trim()
            if (patterns.some((re) => re.test(text)) || patterns.some((re) => re.test(href))) {
              try { return new URL(href, location.origin).toString() } catch { return href }
            }
          }
          return null
        }
        const url = findPrivacyLink()
        return { present: !!url, url }
      })
      await browser3.close()
    } catch {}

    // SSL-Infos
    async function getSSLInfo(u) {
      try {
        const { hostname, port, protocol } = new NodeURL(u)
        if (protocol !== 'https:') return { hasSSL: false }
        return await new Promise((resolve) => {
          const socket = tls.connect({ host: hostname, port: Number(port) || 443, servername: hostname, timeout: 8000 }, () => {
            const cert = socket.getPeerCertificate()
            const cipher = socket.getCipher()
            const info = {
              hasSSL: true,
              issuer: cert?.issuer?.O || cert?.issuer?.CN || null,
              validFrom: cert?.valid_from || null,
              validTo: cert?.valid_to || null,
              cipher: cipher?.name || null,
              bits: cipher?.standardName ? null : cipher?.bits || null,
            }
            socket.end()
            resolve(info)
          })
          socket.on('error', () => resolve({ hasSSL: false }))
          socket.on('timeout', () => { socket.destroy(); resolve({ hasSSL: false }) })
        })
      } catch { return { hasSSL: false } }
    }
    const ssl = await getSSLInfo(target)

    // Tools-Detektion über Request-URLs
    const requestUrls = requests.map(r => r.url)
    const toolDefs = [
      { name: 'Google Schriftarten', re: /(fonts\.googleapis\.com|fonts\.gstatic\.com)/i, requiresConsent: true, category: 'fonts' },
      { name: 'WordPress Stats (Jetpack)', re: /pixel\.wp\.com\/g\.gif/i, requiresConsent: true, category: 'analytics' },
      { name: 'AJAX CDN (Cloudflare)', re: /(cdnjs\.cloudflare\.com|ajax\.cloudflare\.com)/i, requiresConsent: true, category: 'cdn' },
      { name: 'YouTube', re: /(youtube\.com|youtu\.be|i\.ytimg\.com)/i, requiresConsent: true, category: 'video' },
    ]
    const tools = toolDefs
      .map(def => {
        const matches = requestUrls.filter(u => def.re.test(u)).slice(0, 5)
        if (!matches.length) return null
        const requiresConsent = def.requiresConsent !== false
        const nonCompliant = requiresConsent && !baseFindings.categorized.consentPresent
        return { name: def.name, matches, requiresConsent, nonCompliant, category: def.category }
      })
      .filter(Boolean)

    const externalPixels = requestUrls.filter(u => /pixel|track|collect|g\.gif|\/generate_204/i.test(u)).slice(0, 30)

    // Geladene-statt-nur-referenzierte Erkennung
    const hasTrackerLoaded = requestUrls.some(u => patterns.trackers.some(re => re.test(u)))
    const hasGoogleLoaded = requestUrls.some(u => patterns.googleTools.some(re => re.test(u)))
    const hasCriticalLoaded = requestUrls.some(u => patterns.criticalTools.some(re => re.test(u)))
    const externalScriptOrCssRequests = requests.filter(r => (r.type === 'script' || r.type === 'stylesheet') && /^https?:\/\//i.test(r.url))
    const hasExternalLoaded = externalScriptOrCssRequests.some(r => !r.url.startsWith(origin))

    const categorized = {
      trackingCookies: hasTrackerLoaded,
      trackers: hasTrackerLoaded,
      googleTools: hasGoogleLoaded,
      criticalTools: hasCriticalLoaded,
      externalFiles: hasExternalLoaded,
      consentPresent: baseFindings.categorized.consentPresent || consentEval.found,
    }

    // Score basierend auf geladenen Requests berechnen
    let score = 100
    if (categorized.trackers) score -= 25
    if (categorized.googleTools) score -= 20
    if (categorized.criticalTools) score -= 20
    if (categorized.externalFiles) score -= 10
    if (categorized.consentPresent) score += 10
    if (score < 0) score = 0
    if (score > 100) score = 100

    const scoreBreakdown = {
      base: 100,
      minusTrackers: categorized.trackers ? 25 : 0,
      minusGoogle: categorized.googleTools ? 20 : 0,
      minusCritical: categorized.criticalTools ? 20 : 0,
      minusExternal: categorized.externalFiles ? 10 : 0,
      plusConsent: categorized.consentPresent ? 10 : 0,
    }

    // Handlungstipps bereinigen: Datenschutzhinweis nur, wenn nicht gefunden
    const tips = baseFindings.tips.filter(t => !/Datenschutzerklärung/i.test(t))
    if (!privacyEval.present) {
      tips.push('Überprüfe Datenschutzerklärung: Zwecke, Rechtsgrundlagen, Empfänger, Speicherdauer, Betroffenenrechte.')
    }

    const stats = {
      ssl,
      pagesScanned: 1 + crawledPages.length,
      pagesSample: [target, ...crawledPages].slice(0, 20),
      scriptsCount: requestTypes['script'] || 0,
      imagesCount: requestTypes['image'] || 0,
      trackersCount: requestUrls.filter(u => patterns.trackers.some(re => re.test(u))).length,
      externalFilesCount: requestUrls.filter(u => /^https?:\/\//i.test(u) && !u.startsWith(origin)).length,
      cookiesCount: pageCookies.length,
    }

    res.json({
      url: target,
      indicators: baseFindings.indicators,
      scripts: baseFindings.scripts,
      links: baseFindings.links,
      wp: baseFindings.wp,
      categorized,
      tips,
      score,
      scoreBreakdown,
      cookies: pageCookies.map(c => ({ name: c.name, domain: c.domain, path: c.path, expires: c.expires, session: c.session })),
      tools,
      externalPixels,
      stats,
      fingerprint: fp,
      privacy: { present: privacyEval.present, url: privacyEval.url },
    })
  } catch (e) {
    res.status(500).json({ error: 'Scan fehlgeschlagen', details: e?.message })
  }
})

// Screenshot
app.get(['/screenshot','/api/screenshot'], async (req, res) => {
  const target = String(req.query.url || '')
  if (!target || !/^https?:\/\//i.test(target)) {
    return res.status(400).json({ error: 'Bitte vollständige URL mit http(s) angeben.' })
  }
  const size = String(req.query.size || '1280x720')
  const fullPage = String(req.query.fullPage || 'false') === 'true'
  const [w, h] = size.split('x').map((n) => parseInt(n, 10))
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setViewport({ width: Number.isFinite(w) ? w : 1280, height: Number.isFinite(h) ? h : 720 })
    await page.goto(target, { waitUntil: 'networkidle2', timeout: 30000 })
    const buffer = await page.screenshot({ type: 'png', fullPage })
    await browser.close()
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=60')
    return res.send(buffer)
  } catch (e) {
    return res.status(500).json({ error: 'Screenshot fehlgeschlagen', details: e?.message })
  }
})

// SPA-Fallback ohne Wildcard-Pattern (vermeidet path-to-regexp Fehler)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(staticDir, 'index.html'))
})

const port = process.env.PORT ? Number(process.env.PORT) : 5174
app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`)
})


