# Bekleyen iş akışı dosyaları (v1.12.0)

Bu oturumda `.github/workflows/` altına yazma izni yoktu (git push ve GitHub MCP `create_or_update_file` ikisi de 403).
Bu iki dosya etkin DEĞİLDİR; yalnızca kopyadır. Etkinleştirmek için (Milen'in bilgisayarında, depo kökünde, dal ortak-cekirdek-v1.12.0):

    git checkout ortak-cekirdek-v1.12.0 && git pull
    copy ci\workflows\release.yml .github\workflows\release.yml
    copy ci\workflows\eski-kanal.yml .github\workflows\eski-kanal.yml
    git add .github/workflows && git commit -m "CI: ortak çekirdek release + eski kanal" && git push

- `release.yml` eskisinin (guncelleme.zip yayınlayan) yerine geçer: test → Windows NSIS + app.asar → ortak reusable-release (latest.json, yamalar).
- `eski-kanal.yml`: `node tools/eski-kanal.mjs` ile imzalanan guncelleme.zip/json'u release'e ekler.
Dal CI'da yeşil olunca main'e birleştirip release'i `workflow_dispatch` ile başlatın; sonra köprü komutu (bkz. CLAUDE.md).
