<script setup lang="ts">
import HeaderBar from '../components/HeaderBar.vue'
import FooterBar from '../components/FooterBar.vue'
</script>

<template>
  <div class="container">
    <HeaderBar />
    <section class="section">
      <h1 class="headline" style="font-size:32px;">Impressum</h1>
      <p class="muted">Angaben gemäß § 5 TMG</p>
      <p>
        Timo Wirkner<br/>
        c/o Timwir.de<br/>
        Nussweg 4<br/>
        33334 Gütersloh<br/>
        Germany
      </p>
      <p>
        E‑Mail: info@timwir.eu · Telefon: 05241 / 4039367 · Fax: 05241 / 6018672<br/>
        Kontaktformular: <a href="https://www.timwir.de/kontakt" target="_blank" rel="noopener">www.timwir.de/kontakt</a>
      </p>
      <p>
        Sitzland: Deutschland · Zuständige Aufsichtsbehörde: Landesanstalt für Medien NRW<br/>
        USt‑ID: DE345000651 · <a href="/agb">AGB</a>
      </p>
      <h2 class="headline" style="font-size:24px;">Haftung und Schutzrechte</h2>
      <p class="muted">
        Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt, dienen der allgemeinen Information und stellen keine Rechtsberatung dar. Für Inhalte verlinkter Seiten sind ausschließlich deren Betreiber verantwortlich. Inhalte unterliegen Schutzrechten; Nutzung nur mit Genehmigung.
      </p>
    </section>
  </div>
  <FooterBar />
</template>


