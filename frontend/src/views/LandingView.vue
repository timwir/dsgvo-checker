<script setup lang="ts">
import { ref, onMounted } from 'vue'
import HeaderBar from '../components/HeaderBar.vue'
import FooterBar from '../components/FooterBar.vue'
import { useRouter } from 'vue-router'

const url = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const router = useRouter()
const showDisclaimer = ref(false)
const disclaimerAccepted = ref(false)

async function goScan() {
  error.value = null
  if (!disclaimerAccepted.value) {
    showDisclaimer.value = true
    error.value = 'Bitte bestätige zuerst den Hinweis.'
    return
  }
  if (!url.value) {
    error.value = 'Bitte eine vollständige URL eingeben (inkl. https://)'
    return
  }
  loading.value = true
  router.push({ path: '/results', query: { url: url.value } })
}

onMounted(() => {
  const qp = new URLSearchParams(window.location.search)
  const qsUrl = qp.get('url')
  if (qsUrl) {
    url.value = qsUrl
  }
  try {
    const saved = localStorage.getItem('dsgvo_disclaimer_accepted')
    disclaimerAccepted.value = saved === '1'
  } catch {}
  if (!disclaimerAccepted.value) showDisclaimer.value = true
})

function acceptDisclaimer() {
  disclaimerAccepted.value = true
  showDisclaimer.value = false
  try { localStorage.setItem('dsgvo_disclaimer_accepted', '1') } catch {}
}

function closeDisclaimer() {
  showDisclaimer.value = false
}

</script>

<template>
  <div class="container">
    <HeaderBar />
    <section class="section hero">
      <div>
        <h1 class="headline" style="font-size:44px;">Datenschutz‑Risiken managen mit dem DSGVO‑Scanner</h1>
        <p class="muted" style="margin: 12px 0 18px 0;">Erkenne Tracker, Google‑Dienste, kritische Tools und fehlenden Consent. Erhalte klare Handlungsempfehlungen.</p>
        <form @submit.prevent="goScan" class="toolbar" style="margin-bottom:12px;">
          <input v-model="url" class="input" placeholder="https://example.com" inputmode="url" />
          <button :disabled="loading" type="submit">{{ loading ? 'Scanne…' : 'Jetzt prüfen' }}</button>
        </form>
        <p v-if="error" style="color:#ff6b6b; margin-top:6px;">{{ error }}</p>
        <ul class="steps" style="margin-top:12px;">
          <li><span class="num">1</span> URL eingeben</li>
          <li><span class="num">2</span> Heuristischer Scan analysiert HTML & Ressourcen</li>
          <li><span class="num">3</span> Ergebnis teilen oder Maßnahmen ableiten</li>
        </ul>
      </div>
      <img src="/ill-detect.svg" width="320" height="180" alt="Illustration Scan" style="justify-self:center;" />
    </section>

    <section class="section">
      <div class="features">
        <div class="feature">
          <h3 class="headline" style="font-size:20px;">Automatische Erkennung</h3>
          <p class="muted">Findet gängige Tracker, Cookies, Google‑Dienste und externe Ressourcen – sofort, ohne Setup.</p>
        </div>
        <div class="feature">
          <h3 class="headline" style="font-size:20px;">Konkrete Tipps</h3>
          <p class="muted">Empfehlungen zu Consent‑Flows, AV‑Verträgen, SRI, Drittländern und Dokumentation.</p>
        </div>
        <div class="feature">
          <h3 class="headline" style="font-size:20px;">Teilen & Zusammenarbeit</h3>
          <p class="muted">Ergebnislink generieren und mit Stakeholdern teilen, um Maßnahmen zu priorisieren.</p>
        </div>
      </div>
    </section>

    <section class="section faq">
      <h2 class="headline" style="font-size:28px; margin-bottom:10px;">Häufige Fragen</h2>
      <details>
        <summary>Ist der Check eine Rechtsberatung?</summary>
        <p class="muted">Nein. Die Ergebnisse sind heuristische Indikatoren und ersetzen keine Rechtsberatung.</p>
      </details>
      <details>
        <summary>Werden Cookies wirklich gesetzt?</summary>
        <p class="muted">Wir analysieren den HTML‑Quelltext und Ressourcen. Manches erfordert eine tiefergehende Browser‑Analyse.</p>
      </details>
      <details>
        <summary>Kann ich die Berichte teilen?</summary>
        <p class="muted">Ja, über den Teilen‑Button wird ein URL‑basierter Link erzeugt, den du weitergeben kannst.</p>
      </details>
    </section>
  </div>
  <FooterBar />
  
  <div v-if="showDisclaimer" class="modal-overlay" @click.self="closeDisclaimer">
    <div class="modal">
      <div class="modal-header">
        <div class="headline" style="font-size:20px;">Hinweis & Zustimmung</div>
        <button @click="closeDisclaimer">Schließen</button>
      </div>
      <div class="modal-body">
        <p class="muted" style="display:flex; gap:10px; align-items:flex-start;">
          <span style="display:inline-block; width:20px; height:20px; background:currentColor; color:#f5c451; mask:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22%3E%3Cpath fill=%22%23f5c451%22 d=%22M12 2L1 21h22zm0 4l8.66 15H3.34zM11 10h2v6h-2zm0 8h2v2h-2z%22/%3E%3C/svg%3E') center/contain no-repeat; flex:0 0 20px; opacity:.9"></span>
          <span>
            Bitte bestätige, dass du die Erlaubnis hast, die angegebene Website zu prüfen und die rechtlichen Rahmenbedingungen beachtest.
            Die Analyse ist heuristisch und ersetzt keine Rechtsberatung.
          </span>
        </p>
      </div>
      <div class="modal-actions">
        <button @click="acceptDisclaimer">Zustimmen</button>
      </div>
    </div>
  </div>
  
</template>

