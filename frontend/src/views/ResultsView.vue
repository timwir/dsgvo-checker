<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import HeaderBar from '../components/HeaderBar.vue'
import FooterBar from '../components/FooterBar.vue'
import { useRoute, useRouter } from 'vue-router'

type Result = {
  url: string
  categorized: {
    trackingCookies: boolean
    trackers: boolean
    googleTools: boolean
    criticalTools: boolean
    externalFiles: boolean
    consentPresent: boolean
  }
  indicators: string[]
  tips: string[]
  scripts: string[]
  links: string[]
  wp?: {
    isWordPress: boolean
    version?: string | null
    plugins?: string[]
    themes?: string[]
    notes?: string[]
  }
  cookies?: { name: string; domain?: string; path?: string; expires?: number; session?: boolean }[]
  tools?: { name: string; matches: string[]; nonCompliant?: boolean }[]
  externalPixels?: string[]
  stats?: any
  fingerprint?: any
  score: number
  scoreBreakdown?: any
}

const route = useRoute()
const router = useRouter()
const url = ref<string>('')
const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<Result | null>(null)
const shareUrl = ref<string | null>(null)
const screenshotSrc = ref<string | null>(null)
const screenshotLoading = ref<boolean>(false)
const toast = ref<string | null>(null)
const showShare = ref<boolean>(false)

function updateShareUrl() {
  const qp = new URLSearchParams({ url: url.value })
  shareUrl.value = `${window.location.origin}/results?${qp.toString()}`
}

async function scan() {
  error.value = null
  result.value = null
  screenshotSrc.value = null
  if (!url.value) {
    error.value = 'Bitte eine vollständige URL eingeben (inkl. https://)'
    return
  }
  try {
    loading.value = true
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)
    const res = await fetch(`/api/scan?url=${encodeURIComponent(url.value)}`, { signal: controller.signal })
    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { throw new Error('Unerwartete Antwort vom Server (kein JSON)') }
    if (!res.ok) throw new Error(data?.error || 'Unbekannter Fehler')
    result.value = data
    updateShareUrl()
    screenshotLoading.value = true
    const src = `/api/screenshot?url=${encodeURIComponent(url.value)}&size=1280x720`
    // Vorladen für Loader-Steuerung
    const img = new Image()
    img.onload = () => { screenshotSrc.value = src; screenshotLoading.value = false }
    img.onerror = () => { screenshotSrc.value = src; screenshotLoading.value = false }
    img.src = src
  } catch (e: any) {
    error.value = e?.name === 'AbortError' ? 'Zeitüberschreitung beim Scan' : (e?.message || 'Scan fehlgeschlagen')
  } finally {
    try { clearTimeout(timeoutId as any) } catch {}
    loading.value = false
  }
}

const actions = computed(() => {
  const list: string[] = []
  const r = result.value
  if (!r) return list
  const c = r.categorized

  if (!c.consentPresent) {
    list.push('Consent‑Manager/CMP einführen (TCF 2.2), Banner vor Laden nicht‑notwendiger Dienste anzeigen.')
    list.push('Alle Tracker/Marketing‑Tags erst nach Opt‑In laden (Bedingung im Tag‑Manager/CMP setzen).')
  }
  if (c.trackers || c.trackingCookies) {
    list.push('Tracking‑Cookies/Tracker nur nach Einwilligung setzen; Ladebedingungen im Tag‑Manager prüfen.')
    list.push('Cookiekategorien korrekt im CMP deklarieren (Zwecke, Laufzeit, Anbieter).')
  }
  if (c.googleTools) {
    list.push('Google‑Dienste nur nach Opt‑In laden; IP‑Anonymisierung allein reicht nicht.')
    list.push('Drittlandtransfer prüfen (SCCs, TIA). Alternativen in der EU erwägen, falls möglich.')
  }
  if (c.criticalTools) {
    list.push('Auftragsverarbeitungsverträge/DSA mit Anbietern prüfen und dokumentieren.')
    list.push('Verzeichnis von Verarbeitungstätigkeiten ergänzen; ggf. DPIA durchführen.')
  }
  if (c.externalFiles) {
    list.push('Externe Ressourcen absichern: Subresource Integrity (SRI) + Content‑Security‑Policy (CSP).')
    list.push('Wo möglich Assets selbst hosten (Fonts, JS, CSS), um Drittland‑Requests zu reduzieren.')
  }

  // WordPress‑spezifisch
  if (r.wp?.isWordPress) {
    list.push('WordPress: Plugins/Theme‑Liste prüfen. Nicht genutzte Plugins deaktivieren/deinstallieren.')
    list.push('Consent‑Integration sicherstellen (z. B. CMP‑Plugin) und JS‑Ausführung bis Opt‑In verzögern.')
    if (r.wp?.plugins && r.wp.plugins.length) {
      list.push(`Relevante Plugins prüfen: ${r.wp.plugins.slice(0, 6).join(', ')}${r.wp.plugins.length > 6 ? ' …' : ''}`)
    }
  }

  if (!(r as any).privacy || !(r as any).privacy.present) {
    list.push('Datenschutzerklärung aktualisieren (Zwecke, Rechtsgrundlagen, Empfänger, Speicherdauer, Rechte).')
  }
  return list
})

async function clipboardWrite(text: string): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.clipboard) {
      await window.navigator.clipboard.writeText(text)
      return true
    }
  } catch {}
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.focus()
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}

async function copyActions() {
  const text = '- Maßnahmen\n' + actions.value.map((a) => `• ${a}`).join('\n')
  const ok = await clipboardWrite(text)
  if (ok) { toast.value = 'Checkliste kopiert'; setTimeout(() => (toast.value = null), 2000) }
}

async function copyShare() {
  if (!shareUrl.value) return
  const ok = await clipboardWrite(shareUrl.value)
  if (ok) { toast.value = 'Link kopiert'; setTimeout(() => (toast.value = null), 2000) }
}

onMounted(() => {
  const q = String(route.query.url || '')
  if (!q) {
    router.replace('/')
    return
  }
  url.value = q
  scan()
})

watch(() => route.query.url, (n) => {
  if (typeof n === 'string') {
    url.value = n
    scan()
  }
})
</script>

<template>
  <div class="container">
    <HeaderBar />
    <header style="margin-bottom: 16px; display:flex; gap:10px; align-items:center; justify-content:space-between;">
      <h1 class="headline" style="font-size:34px;">Ergebnisse</h1>
      <div style="display:flex; gap:10px; align-items:center;">
        <input v-model="url" class="input" placeholder="https://example.com" inputmode="url" style="max-width:420px;" />
        <button :disabled="loading" @click="scan">Neu scannen</button>
        <button v-if="shareUrl" type="button" @click="showShare = true">Teilen</button>
      </div>
    </header>

    <p v-if="error" style="color:#ff6b6b;">{{ error }}</p>

    <div v-if="result" class="grid">
      <div class="card" style="grid-column: 1 / -1; text-align:center;">
        <h2 class="headline" style="font-size:22px;">Vorschau (Screenshot)</h2>
        <div class="screenshot-wrap">
          <img v-if="screenshotSrc" :src="screenshotSrc" alt="Screenshot" class="screenshot" />
          <div v-if="screenshotLoading || !screenshotSrc" class="screenshot-loader">
            <div class="spinner"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="headline" style="font-size:22px;">Status</h2>
        <div class="badges">
          <div class="badge" title="Tracking‑Cookies ohne Einwilligung könnten gesetzt werden."><span class="dot" :class="result!.categorized.trackingCookies ? 'warn' : 'ok'"></span> Tracking‑Cookies: {{ result!.categorized.trackingCookies ? 'Auffällig' : 'OK' }}</div>
          <div class="badge" title="Tracker dürfen erst nach Einwilligung laden."><span class="dot" :class="result!.categorized.trackers ? 'warn' : 'ok'"></span> Tracker: {{ result!.categorized.trackers ? 'Auffällig' : 'OK' }}</div>
          <div class="badge" title="Google‑Dienste sind verbreitet; Rechtskonformität und Consent prüfen."><span class="dot" :class="result!.categorized.googleTools ? 'note' : 'ok'"></span> Google‑Tools: {{ result!.categorized.googleTools ? 'Gefunden' : 'OK' }} <span v-if="result!.categorized.googleTools" class="muted" style="font-size:12px;">(neutral)</span></div>
          <div class="badge" title="Kritische Tools: Verträge/DSA/AV prüfen."><span class="dot" :class="result!.categorized.criticalTools ? 'warn' : 'ok'"></span> Kritische Tools: {{ result!.categorized.criticalTools ? 'Gefunden' : 'OK' }}</div>
          <div class="badge" title="Externe Ressourcen sind nicht per se schlecht; Quelle, SRI und CSP prüfen."><span class="dot" :class="result!.categorized.externalFiles ? 'note' : 'ok'"></span> Externe Dateien: {{ result!.categorized.externalFiles ? 'Vorhanden' : 'Keine' }} <span v-if="result!.categorized.externalFiles" class="muted" style="font-size:12px;">(neutral)</span></div>
          <div class="badge" title="Consent‑Banner/CMP notwendig, bevor nicht‑notwendige Dienste laden."><span class="dot" :class="result!.categorized.consentPresent ? 'ok' : 'warn'"></span> Consent‑Manager: {{ result!.categorized.consentPresent ? 'Erkannt' : 'Fehlt' }}</div>
        </div>
      </div>

      <div class="card">
        <h2 class="headline" style="font-size:22px;">Score</h2>
        <div class="score-wrap">
          <svg class="score-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" stroke="#1e252b" stroke-width="12" fill="none" />
            <circle cx="60" cy="60" r="52" :stroke="'url(#grad)'" stroke-width="12" fill="none" stroke-linecap="round"
              :stroke-dasharray="Math.PI * 2 * 52" :stroke-dashoffset="(1 - (result!.score/100)) * Math.PI * 2 * 52" transform="rotate(-90 60 60)" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#0FD685" />
                <stop offset="100%" stop-color="#A8EB12" />
              </linearGradient>
            </defs>
            <text x="60" y="66" text-anchor="middle" font-size="28" fill="currentColor">{{ Math.round(result!.score) }}%</text>
          </svg>
          <div>
            <div class="score-text">Compliance‑Score</div>
            <p class="muted">Höher ist besser. Der Score ist heuristisch und dient als Orientierung für Maßnahmen.</p>
          </div>
        </div>
      </div>

      <div class="card" style="grid-column: 1 / -1;">
        <h2 class="headline" style="font-size:22px; display:flex; align-items:center; justify-content:space-between;">
          <span>Empfohlene Maßnahmen</span>
          <button @click="copyActions">Checkliste kopieren</button>
        </h2>
        <ul>
          <li v-for="(a, i) in actions" :key="i">{{ a }}</li>
        </ul>
      </div>

      <div class="card">
        <h2 class="headline" style="font-size:22px;">WordPress</h2>
        <template v-if="result!.wp?.isWordPress">
          <p class="muted">WordPress erkannt<span v-if="result!.wp?.version">, Version {{ result!.wp?.version }}</span>.</p>
          <div class="grid" style="margin-top:12px;">
            <div class="card">
              <h3 class="headline" style="font-size:18px;">Plugins</h3>
              <div class="chip-list">
                <span v-for="(p, i) in (result!.wp?.plugins || [])" :key="i" class="chip">{{ p }}</span>
              </div>
            </div>
            <div class="card">
              <h3 class="headline" style="font-size:18px;">Themes</h3>
              <div class="chip-list">
                <span v-for="(t, i) in (result!.wp?.themes || [])" :key="i" class="chip">{{ t }}</span>
              </div>
            </div>
          </div>
          <div v-if="result!.wp?.notes?.length" class="card" style="margin-top:12px;">
            <h3 class="headline" style="font-size:18px;">Hinweise</h3>
            <ul>
              <li v-for="(n, i) in result!.wp!.notes!" :key="i">{{ n }}</li>
            </ul>
          </div>
        </template>
        <p v-else class="muted">Kein WordPress erkannt.</p>
      </div>

      <div class="card">
        <h2 class="headline" style="font-size:22px;">Statistik</h2>
        <ul>
          <li>SSL: {{ result!.stats?.ssl?.hasSSL ? 'gefunden' : 'nicht vorhanden' }}<span v-if="result!.stats?.ssl?.issuer">, CA: {{ result!.stats.ssl.issuer }}</span></li>
          <li>Gescannte Seiten: {{ result!.stats?.pagesScanned }}</li>
          <li>Skripte: {{ result!.stats?.scriptsCount }}</li>
          <li>Tracker‑Requests: {{ result!.stats?.trackersCount }}</li>
          <li>Externe Dateien: {{ result!.stats?.externalFilesCount }}</li>
          <li>Cookies: {{ result!.stats?.cookiesCount }}</li>
        </ul>
      </div>

      <div class="card">
        <h2 class="headline" style="font-size:22px;">Tools</h2>
        <template v-if="result!.tools?.length">
          <ul>
            <li v-for="(t, i) in result!.tools" :key="i">
              <strong>{{ t.name }}</strong>
              <span v-if="t.nonCompliant" style="margin-left:8px; padding:2px 6px; border-radius:999px; background:#ffb86b22; border:1px solid #ffb86b55; color:#ffb86b; font-size:12px;">Nicht konform</span>
              <ul>
                <li v-for="(m, j) in t.matches" :key="j"><code>{{ m }}</code></li>
              </ul>
            </li>
          </ul>
        </template>
        <p v-else class="muted">Keine Tools erkannt.</p>
      </div>

      <div class="card" style="grid-column: 1 / -1;">
        <h2 class="headline" style="font-size:22px;">Cookies</h2>
        <template v-if="result!.cookies?.length">
          <table style="width:100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align:left; padding:6px;">Name</th>
                <th style="text-align:left; padding:6px;">Domain</th>
                <th style="text-align:left; padding:6px;">Pfad</th>
                <th style="text-align:left; padding:6px;">Lebensdauer</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(c, i) in result!.cookies" :key="i" style="border-top: 1px solid #1e252b;">
                <td style="padding:6px;">{{ c.name }}</td>
                <td style="padding:6px;">{{ c.domain || '-' }}</td>
                <td style="padding:6px;">{{ c.path || '/' }}</td>
                <td style="padding:6px;">{{ c.session ? 'Sitzung' : (c.expires ? Math.round((c.expires*1000 - Date.now())/86400000) + ' Tage' : '-') }}</td>
              </tr>
            </tbody>
          </table>
        </template>
        <p v-else class="muted">Keine Cookies ermittelt (oder durch Browser blockiert).</p>
      </div>

      <div class="card" style="grid-column: 1 / -1;">
        <h2 class="headline" style="font-size:22px;">Externe Bilder & Zählpixel</h2>
        <ul>
          <li v-for="(p, i) in (result!.externalPixels || [])" :key="i"><code>{{ p }}</code></li>
        </ul>
      </div>

      <div class="card" style="grid-column: 1 / -1;">
        <h2 class="headline" style="font-size:22px;">Gefundene Ressourcen</h2>
        <details>
          <summary>Skripte</summary>
          <ul>
            <li v-for="(s, i) in result!.scripts" :key="i"><code>{{ s }}</code></li>
          </ul>
        </details>
        <details>
          <summary>Styles/Links</summary>
          <ul>
            <li v-for="(l, i) in result!.links" :key="i"><code>{{ l }}</code></li>
          </ul>
        </details>
      </div>
    </div>
  </div>
  <FooterBar />
  <div v-if="loading" class="overlay"><div class="spinner"></div><div class="muted">Scanne…</div></div>
  <div v-if="toast" class="toast">{{ toast }}</div>

  <div v-if="showShare" class="modal-overlay" @click.self="showShare=false">
    <div class="modal">
      <div class="modal-header">
        <div class="headline" style="font-size:20px;">Ergebnis teilen</div>
        <button @click="showShare=false">Schließen</button>
      </div>
      <div class="modal-body">
        <input class="input-readonly" :value="shareUrl || ''" readonly />
      </div>
      <div class="modal-actions">
        <button @click="copyShare">Link kopieren</button>
      </div>
    </div>
  </div>
</template>

