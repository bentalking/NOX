#!/usr/bin/env bash
set -e
if [ ! -x ./gradlew ]; then
  echo "Gradle Wrapper ist in dieser Umgebung nicht mitgeliefert. Oeffne das Projekt einmal in Android Studio und starte danach Build > Build APK(s)."
  exit 1
fi
./gradlew :app:assembleDebug
