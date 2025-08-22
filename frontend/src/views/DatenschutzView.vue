<script setup lang="ts">
import HeaderBar from '../components/HeaderBar.vue'
import FooterBar from '../components/FooterBar.vue'
</script>

<template>
  <div class="container">
    <HeaderBar />
    <section class="section">
      <h1 class="headline" style="font-size:32px;">Datenschutzerklärung</h1>
      <p class="muted">
        Diese Erklärung informiert über Art, Umfang und Zwecke der Verarbeitung personenbezogener Daten innerhalb dieses Onlineangebotes.
        Das Tool führt eine heuristische Analyse von öffentlich zugänglichen Webseiten durch; eine Speicherung personenbezogener Daten findet durch das Tool grundsätzlich nicht statt. Server‑seitig werden technische Logs (z. B. IP, Zeitstempel, Request‑URL) zum sicheren Betrieb verarbeitet und turnusmäßig gelöscht.
      </p>
      <h2 class="headline" style="font-size:24px;">Extern eingebundene Inhalte</h2>
      <p class="muted">Im Rahmen der Scan‑Funktion kann es zu Anfragen an Drittanbieter kommen (z. B. zur Screenshot‑Erstellung). Dabei werden Meta‑Daten wie IP‑Adresse und User‑Agent übertragen.</p>
      <h2 class="headline" style="font-size:24px;">Rechtsgrundlagen</h2>
      <p class="muted">Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) an der Bereitstellung und Sicherung des Angebots.</p>
      <h2 class="headline" style="font-size:24px;">Betroffenenrechte</h2>
      <p class="muted">Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung sowie Beschwerde bei einer Aufsichtsbehörde.</p>
    </section>
  </div>
  <FooterBar />
</template>


