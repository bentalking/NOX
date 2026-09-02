# NOX – standalone

This is a standalone version of the NOX app, independent of the Grok sandbox.

## What was removed
- Grok/xAI API integration
- Grok preview iframe bridge
- Grok-specific PWA/deployment middleware
- Grok OAuth/auth broker integration
- Grok-specific build/deployment files

## Food logging
Food parsing now runs entirely in the browser using the built-in food database.
Examples:
- `200 g Hähnchenbrust und 150 g Reis`
- `2 Eier, 1 Banane`
- `300g Pizza`

No API key or internet connection is required for the app itself.

## Run locally

```bash
npm install
npm run dev
```

Build for deployment:

```bash
npm run build
npm run preview
```

The app is a normal Vite + React application and can be deployed to any static host that supports SPA fallback.


## NOX Standalone / Offline

NOX ist als installierbare PWA für Android und iOS vorbereitet. App-Daten werden lokal per Zustand-Persistenz im Browser gespeichert; es gibt keinen Grok-/xAI-Endpunkt.

### 3 lokale Stufen
1. **Smart Tracking:** lokale Lebensmitteldatenbank, Mengenparser und manuelle Einträge.
2. **Local AI:** semantische lokale Analyse von natürlicher Sprache ohne Upload.
3. **Foto-Assistent:** Kamera/Bildanalyse läuft lokal und liefert bewusst nur Vorschläge; Portions- und Lebensmittelwerte müssen bestätigt werden.

Die Foto-Stufe ist absichtlich konservativ: Ein Bild allein kann Portionsgröße und Kalorien nicht zuverlässig bestimmen. Es wird deshalb nichts heimlich als exakt ausgegeben.

### Android & iOS
- Android: Chrome/Samsung Internet → App installieren / Zum Startbildschirm
- iOS: Safari → Teilen → Zum Home-Bildschirm
- Service Worker aktiviert Offline-App-Shell nach dem ersten Laden.
- Keine Anmeldung, kein Server und kein Grok nötig.

### Entwicklung
```bash
npm install
npm run dev
```
