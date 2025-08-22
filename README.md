## DSGVO‑Check (Vue + Vite + Express)

Ein leichtgewichtiges Tool zur heuristischen Prüfung von Websites auf DSGVO‑relevante Indikatoren:

- Tracking‑Cookies ohne Einwilligung
- Tracker ohne Einwilligung
- Google‑Tools ohne Einwilligung
- Kritische Tools ohne Einwilligung
- Externe Dateien
- Indikatoren für mögliche Datenschutzprobleme inkl. Handlungstipps

### Schnellstart

Voraussetzungen: Node.js 18+

1) Abhängigkeiten installieren

```bash
cd backend && npm install && cd ../frontend && npm install
```

2) Backend starten (Standard: http://localhost:5174)

```bash
cd backend
npm run dev
```

3) Frontend starten (http://localhost:5173)

```bash
cd frontend
npm run dev
```

Das Frontend proxied Anfragen von `/api/*` an das Backend.

### Nutzung

Im Frontend eine vollständige URL (inkl. `https://`) eingeben und auf „Jetzt prüfen“ klicken. Die Analyse ist heuristisch und sollte als Hinweis/Indikator verstanden werden – keine Rechtsberatung.

### Heuristiken (Auszug)

- Tracker: `google-analytics.com`, `googletagmanager.com`, Facebook Pixel, Hotjar, Clarity, Matomo, DoubleClick
- Google‑Tools: reCAPTCHA, Maps, Google APIs/Static
- Kritische Tools: OneTrust, Segment, Sentry, Intercom, Mixpanel
- Externe Dateien: externe JS/CSS‑Ressourcen
- Consent‑Hinweise: CMP/TCF‑Artefakte, `__tcfapi`, `cookieconsent`

### SEO

- `index.html` enthält Title, Description, Keywords, Open‑Graph und Theme‑Color.

### Design

- Akzentfarbe: `#0BD281`
- Gradient in Überschriften: `linear-gradient(90deg, #0FD685, #A8EB12)`

### Hinweise / Grenzen

- Es erfolgt kein aktives Blockieren oder Cookie‑Setz‑Analyse im Browser‑Kontext. Die Erkennung basiert auf HTML‑Quelltext und Ressourcen.
- Prüfe zusätzlich Hand‑on im Browser (DevTools, Netzwerkanalyse) und dokumentiere Consent‑Flows.

### Lizenz

MIT


# dsgvo-checker
