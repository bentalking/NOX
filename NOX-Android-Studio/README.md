# NOX — Android Studio Project

Dieses Projekt verpackt die bestehende NOX-Vite/React-App als native Android-App mit einer lokalen WebView.

## Voraussetzungen
- Android Studio Ladybug oder neuer
- Android SDK 35
- JDK 17
- Node.js 20+ und npm
- Internet beim ersten Gradle-/npm-Setup, damit Android Gradle Plugin und Web-Abhängigkeiten geladen werden können

## Öffnen
1. ZIP entpacken.
2. Android Studio → **Open** → diesen Ordner auswählen.
3. Gradle Sync abwarten.
4. Ein Android-Gerät oder Emulator auswählen.
5. **Run ▶** drücken.

## APK
Android Studio:
**Build → Build APK(s)**

Die Debug-APK liegt danach unter:
`app/build/outputs/apk/debug/app-debug.apk`

## Wichtig
Beim ersten Android-Build führt Gradle automatisch `npm install` und `npm run build` im Ordner `web/` aus und kopiert den erzeugten `dist/`-Ordner in die Android-App.

Die App selbst nutzt keinen Grok-/xAI-Endpunkt. NOX-Daten werden weiterhin lokal von der Web-App gespeichert.

## iOS später
Die Web-App unter `web/` bleibt die gemeinsame Codebasis. Für iOS kann anschließend ein Xcode/Capacitor-Projekt aus derselben Web-Build-Ausgabe erzeugt werden.
