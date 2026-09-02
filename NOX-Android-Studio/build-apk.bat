@echo off
if not exist gradlew.bat (
  echo Gradle Wrapper ist in dieser Umgebung nicht mitgeliefert. Oeffne das Projekt einmal in Android Studio und starte danach den Build ueber Build ^> Build APK(s).
  exit /b 1
)
gradlew.bat :app:assembleDebug
