<script setup lang="ts">
</script>

<template>
  <footer class="footer">
    <div class="container footer-inner">
      <div class="col">
        <div class="brand">DSGVO‑Check</div>
        <p class="muted">Ein heuristisches Analyse‑Tool – keine Rechtsberatung.</p>
      </div>
      <nav class="links">
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutz</a>
        <a href="https://www.timwir.de" target="_blank" rel="noopener">timwir.de</a>
        <a href="https://www.timwir.de/kontakt" target="_blank" rel="noopener">Kontakt</a>
      </nav>
      <div class="copy muted">© {{ new Date().getFullYear() }} Timo Wirkner</div>
    </div>
  </footer>
</template>

<style scoped>
.footer { margin-top: 40px; border-top: 1px solid rgba(30,37,43,.5); background: var(--bg); }
:root[data-theme="light"] .footer { border-top-color: rgba(201,207,213,.5); }
.footer-inner { display: grid; gap: 10px; padding: 20px 24px; align-items: center; }
@media (min-width: 800px) { .footer-inner { grid-template-columns: 1fr auto auto; } }
.brand { font-weight: 700; }
.links { display: flex; gap: 14px; flex-wrap: wrap; }
.copy { text-align: left; }
</style>


