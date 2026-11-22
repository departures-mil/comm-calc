#!/bin/bash
# Comm Calc APK (2026-11-22'den itibaren): aapt2 + d8 (Gradle'sız). Paket: com.departures.commcalc (yeni anahtar).
# Araçlar: ANDROID_TOOLS (bt/<build-tools 35>, pf/android-35) — dl.google.com/android/repository/build-tools_r35_linux.zip, platform-35_r02.zip
# Anahtar depoda DEĞİL: C:\Claude Programlarım\_Anahtarlar\CommCalc\android (comm-calc.keystore + sifre.txt, alias commcalc) → KEYDIR
# Kullanım: KEYDIR=... android/build2.sh   → android/out/Comm-Calc-v<sürüm>.apk
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/.." && pwd)
SDK="${ANDROID_TOOLS:-/home/claude/tools}"; BT="$(ls -d "$SDK"/bt/*/ | head -1)"; JAR="$SDK/pf/android-35/android.jar"
KEYDIR=${KEYDIR:?anahtar klasörü}; PW=$(tr -d '\r\n' < "$KEYDIR/sifre.txt")
VER=$(node -p "require('$ROOT/package.json').version")
IFS=. read -r MA MI PA <<< "$VER"; SHORT="$MA.$MI"; [ "${PA:-0}" != "0" ] && SHORT="$SHORT.$PA"
OUT="$HERE/out/Comm-Calc-v$SHORT.apk"
B=$(mktemp -d); trap 'rm -rf "$B"' EXIT
mkdir -p "$B/assets/www" "$B/gen" "$B/cls" "$B/java"
node "$ROOT/web/build.mjs" >/dev/null
cp -r "$ROOT/src" "$ROOT/assets" "$B/assets/www/"; rm -f "$B/assets/www/assets/icon.ico"
sed -e "s/android:versionCode=\"[0-9]*\"/android:versionCode=\"$((MA * 10000 + MI * 100 + ${PA:-0}))\"/" \
    -e "s/android:versionName=\"[^\"]*\"/android:versionName=\"$SHORT\"/" "$HERE/AndroidManifest.xml" > "$B/AndroidManifest.xml"
cp -r "$HERE/java/." "$B/java/"
sed -i "s/static final String BUILTIN = \"[^\"]*\"/static final String BUILTIN = \"$VER\"/" "$B/java/com/commcalc/app/MainActivity.java"
"$BT/aapt2" compile --dir "$HERE/res" -o "$B/res.zip"
"$BT/aapt2" link -o "$B/base.apk" -I "$JAR" --manifest "$B/AndroidManifest.xml" -R "$B/res.zip" --custom-package com.commcalc.app \
  --java "$B/gen" -A "$B/assets" --min-sdk-version 24 --target-sdk-version 34 --auto-add-overlay
javac -nowarn --release 8 -encoding UTF-8 -classpath "$JAR" -d "$B/cls" $(find "$B/gen" "$B/java" -name '*.java') 2>&1 | grep -v "^Picked up\|^warning\|^Note:\|warning$" || true
"$BT/d8" --release --min-api 24 --lib "$JAR" --output "$B" $(find "$B/cls" -name '*.class')
(cd "$B" && cp base.apk u.apk && zip -q -j u.apk classes.dex)
"$BT/zipalign" -f -p 4 "$B/u.apk" "$B/a.apk"
mkdir -p "$(dirname "$OUT")"
"$BT/apksigner" sign --ks "$KEYDIR/comm-calc.keystore" --ks-key-alias commcalc --ks-pass "pass:$PW" --key-pass "pass:$PW" --out "$OUT" "$B/a.apk"
"$BT/apksigner" verify "$OUT" && echo "APK: $OUT"
