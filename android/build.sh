#!/bin/bash
# Comm Calc APK derlemesi (Gradle gerekmez): aapt + javac + dx + zipalign + apksigner
# Gerekenler (Ubuntu): apt-get install android-sdk android-sdk-platform-23 zipalign apksigner
# Kullanım: android/build.sh [çıktı.apk]   (anahtar: /mnt/project-files/comm-calc-android-imza/)
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/.." && pwd)
SDK=/usr/lib/android-sdk; JAR=$SDK/platforms/android-23/android.jar; BT=$SDK/build-tools/debian
KEYDIR=${KEYDIR:-/mnt/project-files/comm-calc-android-imza}
KEYSTORE=${KEYSTORE:-$KEYDIR/comm-calc.keystore}; KSPASS=${KSPASS:-$(cat "$KEYDIR/sifre.txt")}
VER=$(node -p "require('$ROOT/package.json').version")
OUT=${1:-$HERE/out/Comm-Calc-v${VER%.0}.apk}
B=$(mktemp -d)
trap 'rm -rf "$B"' EXIT
mkdir -p "$B/gen" "$B/cls" "$B/assets/www"

# 1) Arayüz dosyaları (masaüstüyle aynı) ve sürüm numaraları
node "$ROOT/web/build.mjs" >/dev/null
cp -r "$ROOT/src" "$ROOT/assets" "$B/assets/www/"
rm -f "$B/assets/www/assets/icon.ico"
IFS=. read -r MA MI PA <<< "$VER"
sed -e "s/android:versionCode=\"[0-9]*\"/android:versionCode=\"$((MA * 10000 + MI * 100 + PA))\"/" \
    -e "s/android:versionName=\"[^\"]*\"/android:versionName=\"$MA.$MI\"/" "$HERE/AndroidManifest.xml" > "$B/AndroidManifest.xml"
mkdir -p "$B/java"; cp -r "$HERE/java/." "$B/java/"
sed -i "s/static final String BUILTIN = \"[^\"]*\"/static final String BUILTIN = \"$VER\"/" "$B/java/com/commcalc/app/MainActivity.java"

# 2) Kaynaklar ve R.java
aapt package -f -m -J "$B/gen" -M "$B/AndroidManifest.xml" -S "$HERE/res" -I "$JAR" -A "$B/assets" -F "$B/app.ap_" --no-version-vectors

# 3) Java -> dex
if ! javac -nowarn -source 8 -target 8 -bootclasspath "$JAR" -classpath "$JAR" -d "$B/cls" $(find "$B/gen" "$B/java" -name '*.java') > "$B/javac.log" 2>&1; then
  grep -v JAVA_TOOL "$B/javac.log"; exit 1; fi
"$BT/dx" --dex --min-sdk-version=24 --output="$B/classes.dex" "$B/cls" 2>&1 | grep -v JAVA_TOOL || true
test -f "$B/classes.dex"
(cd "$B" && aapt add -f app.ap_ classes.dex >/dev/null)

# 4) Hizalama ve imza
zipalign -f -p 4 "$B/app.ap_" "$B/aligned.apk"
mkdir -p "$(dirname "$OUT")"
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KSPASS" --ks-key-alias commcalc --out "$OUT" "$B/aligned.apk" 2>&1 | grep -v JAVA_TOOL || true
apksigner verify "$OUT" 2>&1 | grep -v JAVA_TOOL || true
echo "APK: $OUT ($(du -h "$OUT" | cut -f1))"
