import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import cheerio from 'cheerio'

const app = express()
app.use(cors())
app.use(express.json())

// Heuristische Muster für Tracker, Tools, Cookies ohne Consent, externe Dateien
const patterns = {
  trackers: [
    /google-analytics\.com\/analytics\.js/i,
    /gtag\(\s*['\"][Aa]nalytics['\"]\s*,/i,
    /googletagmanager\.com\/gtm\.js/i,
    /connect\.facebook\.net\//i,
    /facebook\.com\/tr\//i,
    /hotjar\.com\//i,
    /clarity\.ms\//i,
    /matomo\.(js|php)/i,
    /doubleclick\.net/i,
  ],
  googleTools: [
    /googletagmanager\.com/i,
    /google-analytics\.com/i,
    /recaptcha\.net|google\.com\/recaptcha/i,
    /googleapis\.com|gstatic\.com/i,
    /maps\.googleapis\.com|maps\.google\.com/i,
  ],
  criticalTools: [
    /cdn\.cookielaw\.org/i, // OneTrust
    /cdn\.segment\.com/i,   // Segment
    /cdn\.sentry-cdn\.com|browser\.sentry-cdn\.com/i, // Sentry
    /intercomcdn\.com|widget\.intercom\.io/i,
    /mixpanel\.com/i,
  ],
  externalFiles: [
    /https?:\/\/[^\s]+\.(js|css)/i,
    /<link[^>]+href=\"https?:\/\//i,
  ],
  consentHints: [
    /cookie(consent|banner|notice)/i,
    /tcfapi|__tcfapi/i,
    /consent([-_])?manager/i,
  ],
}

function testPatterns(text: string, list: RegExp[]): boolean {
  return list.some((re) => re.test(text))
}

function extractResources($: cheerio.CheerioAPI) {
  const scripts: string[] = []
  const links: string[] = []
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

function buildFindings(html: string) {
  const $ = cheerio.load(html)
  const { scripts, links } = extractResources($)
  const textBlob = [html, ...scripts, ...links].join('\n')

  const hasTracker = testPatterns(textBlob, patterns.trackers)
  const hasGoogle = testPatterns(textBlob, patterns.googleTools)
  const hasCritical = testPatterns(textBlob, patterns.criticalTools)
  const hasExternal = testPatterns(textBlob, patterns.externalFiles)
  const hasConsent = testPatterns(textBlob, patterns.consentHints)

  const indicators: string[] = []
  if (hasTracker) indicators.push('Tracker ohne Einwilligung möglich')
  if (hasGoogle) indicators.push('Google-Tools im Einsatz, Consent prüfen')
  if (hasCritical) indicators.push('Kritische Tools erkannt, AVV/DSA prüfen')
  if (hasExternal) indicators.push('Externe Dateien geladen, Herkunft prüfen')
  if (!hasConsent) indicators.push('Kein Consent-Manager gefunden')

  const tips: string[] = []
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

  return { categorized, indicators, tips, scripts, links }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/scan', async (req, res) => {
  const target = String(req.query.url || '')
  if (!target || !/^https?:\/\//i.test(target)) {
    return res.status(400).json({ error: 'Bitte vollständige URL mit http(s) angeben.' })
  }
  try {
    const resp = await fetch(target, { redirect: 'follow' as any })
    const html = await resp.text()
    const result = buildFindings(html)
    res.json({ url: target, ...result })
  } catch (e: any) {
    res.status(500).json({ error: 'Scan fehlgeschlagen', details: e?.message })
  }
})

const port = process.env.PORT ? Number(process.env.PORT) : 5174
app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`)
})


