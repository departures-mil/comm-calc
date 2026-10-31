package com.commcalc.app;

// Comm Calc - Android kabuğu.
// Masaüstü sürümüyle aynı arayüz (assets/www/src) tam ekran bir WebView içinde çalışır ve
// https://commcalc.local adresinden uygulamanın kendi dosyalarından sunulur.
// Veriler files/veri.json dosyasında tutulur; uygulama içinden kurulan güncellemeler bu dosyaya dokunmaz.

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.Window;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class MainActivity extends Activity {
    static final String HOST = "commcalc.local";
    static final String START = "https://" + HOST + "/src/index.html";
    static final String FOLDER = "Comm Calc";
    static final String REPO = "departures-mil/comm-calc";
    static final int REQ_FILE = 41;
    // Bu APK'nın içindeki arayüz sürümü; uygulama içinden kurulan güncelleme daha yeniyse o kullanılır
    static final String BUILTIN = "1.4.0";
    // Kabuk sürümü: güncelleme paketindeki minShell bundan büyükse yeni APK gerekir
    static final int SHELL = 1;
    // Güncelleme paketlerini doğrulayan açık anahtar (lib/update-key.js ile aynı, ECDSA P-256)
    static final String UPD_KEY = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEsn357csU5kTr0ICBzh35WD25JNXMZlYU6WAAuXmyPJFb3nKvG90K5N2rRIiE1ZdZyW0S3eQI/+2zu4TGsl6vxw==";
    static File ota;
    static String otaVer;
    static boolean otaPicked;
    SharedPreferences upd;

    WebView web;
    ValueCallback<Uri[]> fileCb;
    Uri cameraOut;
    final Handler ui = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Window w = getWindow();
        w.setStatusBarColor(0xFF0B121B);
        w.setNavigationBarColor(0xFF0B121B);

        web = new WebView(this);
        web.setBackgroundColor(0xFF0B121B);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        upd = getSharedPreferences("guncelleme", MODE_PRIVATE);
        if (!otaPicked) { otaPicked = true; pickUpdate(); }
        if (state != null) web.restoreState(state);
        if (web.getUrl() == null) web.loadUrl(START);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        // Önce açık pencere kapanır / Link Bütçesi'ne dönülür; yapacak bir şey kalmadıysa arka plana alınır
        web.evaluateJavascript("(window.__onBack && window.__onBack()) ? 1 : 0", new ValueCallback<String>() {
            @Override public void onReceiveValue(String v) { if (!"1".equals(v)) moveTaskToBack(true); }
        });
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req != REQ_FILE) { super.onActivityResult(req, res, data); return; }
        Uri[] out = null;
        if (res == RESULT_OK) {
            ClipData cd = data == null ? null : data.getClipData();
            if (cd != null && cd.getItemCount() > 0) {
                out = new Uri[cd.getItemCount()];
                for (int i = 0; i < cd.getItemCount(); i++) out[i] = cd.getItemAt(i).getUri();
            } else if (data != null && data.getData() != null) out = new Uri[] { data.getData() };
            else if (cameraOut != null) out = new Uri[] { cameraOut };
        }
        if (fileCb != null) fileCb.onReceiveValue(out);
        fileCb = null;
        cameraOut = null;
    }

    static int verCode(String v) {
        String[] p = (v == null ? "0" : v).split("\\.");
        int r = 0;
        for (int i = 0; i < 3; i++) { int n = 0; try { n = Integer.parseInt(p.length > i ? p[i] : "0"); } catch (Exception e) { } r = r * 100 + n; }
        return r;
    }

    // ---------------- Uygulama içinden güncelleme
    // Kurulan paket files/guncelleme/v<sürüm> altına açılır; sayfa dosyaları önce oradan, yoksa APK içinden sunulur.
    void pickUpdate() {
        ota = null; otaVer = null;
        String v = upd.getString("version", null), dir = upd.getString("dir", null);
        if (v == null || dir == null || verCode(v) <= verCode(BUILTIN)) return;
        File d = new File(getFilesDir(), "guncelleme/" + dir);
        if (!new File(d, "src/index.html").isFile()) return;
        // İki açılışta üst üste arayüz yüklenemediyse güncelleme bırakılır, APK içindeki sürüme dönülür
        int tries = upd.getInt("tries", 0);
        if (tries >= 2) { upd.edit().clear().commit(); return; }
        upd.edit().putInt("tries", tries + 1).commit();
        ota = d; otaVer = v;
    }

    String version() { return otaVer != null ? otaVer : BUILTIN; }

    static void deleteTree(File f) {
        File[] ch = f.listFiles();
        if (ch != null) for (File c : ch) deleteTree(c);
        f.delete();
    }

    static byte[] httpBytes(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            c.setConnectTimeout(15000);
            c.setReadTimeout(60000);
            c.setInstanceFollowRedirects(true);
            c.setRequestProperty("User-Agent", "CommCalc-Android/" + BUILTIN);
            c.setRequestProperty("Accept", "application/vnd.github+json, */*");
            int st = c.getResponseCode();
            InputStream in = st < 400 ? c.getInputStream() : c.getErrorStream();
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] buf = new byte[65536];
            int r;
            if (in != null) { while ((r = in.read(buf)) > 0) b.write(buf, 0, r); in.close(); }
            if (st == 404) return null;
            if (st >= 400) throw new Exception("HTTP " + st);
            return b.toByteArray();
        } finally { c.disconnect(); }
    }

    JSONObject latest() throws Exception {
        byte[] b = httpBytes("https://api.github.com/repos/" + REPO + "/releases/latest");
        return b == null ? new JSONObject() : new JSONObject(new String(b, "UTF-8"));
    }

    static String asset(JSONObject rel, String nameEnd) throws Exception {
        JSONArray a = rel.optJSONArray("assets");
        if (a != null) for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.getJSONObject(i);
            if (o.optString("name").endsWith(nameEnd)) return o.optString("browser_download_url");
        }
        return null;
    }

    String checkUpdate() {
        try {
            JSONObject rel = latest();
            JSONObject r = new JSONObject().put("ok", true).put("current", version()).put("pageUrl", rel.optString("html_url"));
            String ju = asset(rel, "guncelleme.json");
            if (ju == null) return r.put("available", false).put("version", version()).toString();
            JSONObject info = new JSONObject(new String(httpBytes(ju), "UTF-8"));
            String v = info.optString("version");
            String apk = asset(rel, ".apk");
            return r.put("version", v).put("notes", rel.optString("body")).put("name", rel.optString("name"))
                .put("available", verCode(v) > verCode(version()))
                .put("needsFull", info.optInt("minShell", 1) > SHELL)
                .put("exeUrl", apk == null ? rel.optString("html_url") : apk).toString();
        } catch (Exception e) { return err(e); }
    }

    String installUpdate() {
        try {
            JSONObject rel = latest();
            String ju = asset(rel, "guncelleme.json"), zu = asset(rel, "guncelleme.zip");
            if (ju == null || zu == null) return new JSONObject().put("ok", false).put("error", "Sürümde güncelleme paketi yok").toString();
            JSONObject info = new JSONObject(new String(httpBytes(ju), "UTF-8"));
            if (info.optInt("minShell", 1) > SHELL) return new JSONObject().put("ok", false).put("error", "full").toString();
            String version = info.getString("version");
            byte[] data = httpBytes(zu);
            StringBuilder h = new StringBuilder();
            for (byte b : MessageDigest.getInstance("SHA-256").digest(data)) h.append(String.format("%02x", b & 0xff));
            String sha = h.toString();
            PublicKey pk = KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(Base64.decode(UPD_KEY, Base64.DEFAULT)));
            Signature s = Signature.getInstance("SHA256withECDSA");
            s.initVerify(pk);
            s.update(("CC-GUNCELLEME\n" + version + "\n" + sha).getBytes("UTF-8"));
            if (!sha.equals(info.optString("sha256")) || !s.verify(Base64.decode(info.optString("sig"), Base64.DEFAULT)))
                return new JSONObject().put("ok", false).put("error", "İmza doğrulanamadı").toString();
            File root = new File(getFilesDir(), "guncelleme");
            String name = "v" + version;
            File tmp = new File(root, name + ".tmp");
            deleteTree(tmp);
            tmp.mkdirs();
            String base = tmp.getCanonicalPath() + File.separator;
            ZipInputStream z = new ZipInputStream(new ByteArrayInputStream(data));
            ZipEntry e;
            byte[] buf = new byte[65536];
            while ((e = z.getNextEntry()) != null) {
                String n = e.getName();
                if (e.isDirectory() || !(n.startsWith("src/") || n.startsWith("assets/"))) continue;
                File out = new File(tmp, n);
                if (!out.getCanonicalPath().startsWith(base)) continue;
                out.getParentFile().mkdirs();
                FileOutputStream fo = new FileOutputStream(out);
                int r;
                while ((r = z.read(buf)) > 0) fo.write(buf, 0, r);
                fo.close();
            }
            z.close();
            if (!new File(tmp, "src/index.html").isFile()) return new JSONObject().put("ok", false).put("error", "Paket eksik").toString();
            File dst = new File(root, name);
            deleteTree(dst);
            if (!tmp.renameTo(dst)) return new JSONObject().put("ok", false).put("error", "rename").toString();
            upd.edit().putString("version", version).putString("dir", name).putInt("tries", 0).commit();
            ota = dst; otaVer = version;
            File[] old = root.listFiles();
            if (old != null) for (File f : old) if (!f.getName().equals(name)) deleteTree(f);
            return new JSONObject().put("ok", true).put("version", version).toString();
        } catch (Exception e) { return err(e); }
    }

    static String err(Exception e) {
        try { return new JSONObject().put("ok", false).put("error", String.valueOf(e.getMessage())).toString(); } catch (Exception x) { return "{\"ok\":false}"; }
    }

    // ---------------- Uygulama dosyalarının sunulması
    static final Map<String, String> MIME = new HashMap<String, String>();
    static {
        MIME.put("html", "text/html"); MIME.put("js", "text/javascript"); MIME.put("mjs", "text/javascript");
        MIME.put("css", "text/css"); MIME.put("json", "application/json"); MIME.put("svg", "image/svg+xml"); MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg"); MIME.put("jpeg", "image/jpeg"); MIME.put("webp", "image/webp"); MIME.put("ico", "image/x-icon");
        MIME.put("woff", "font/woff"); MIME.put("woff2", "font/woff2"); MIME.put("ttf", "font/ttf"); MIME.put("wasm", "application/wasm");
    }
    static String extOf(String n) { int i = n.lastIndexOf('.'); return i < 0 ? "" : n.substring(i + 1).toLowerCase(); }

    class Client extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (!HOST.equals(u.getHost())) return null;
            String path = u.getPath() == null ? "" : u.getPath();
            while (path.startsWith("/")) path = path.substring(1);
            Map<String, String> h = new HashMap<String, String>();
            h.put("Cache-Control", "no-cache");
            if (path.contains("..")) return new WebResourceResponse("text/plain", "utf-8", 403, "Forbidden", h, new ByteArrayInputStream(new byte[0]));
            try {
                File f = ota == null ? null : new File(ota, path);
                InputStream in = f != null && f.isFile() ? new FileInputStream(f) : getAssets().open("www/" + path);
                String ext = extOf(path);
                String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
                boolean text = mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("svg+xml");
                return new WebResourceResponse(mime, text ? "utf-8" : null, 200, "OK", h, in);
            } catch (Exception e) {
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", h, new ByteArrayInputStream(new byte[0]));
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri u = Uri.parse(url);
            if (HOST.equals(u.getHost())) return false;
            openExternal(url);
            return true;
        }
    }

    void openExternal(String url) {
        try { Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url)); i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(i); }
        catch (Exception e) { toast("Bağlantı açılamadı"); }
    }

    // ---------------- Dosya ve görsel seçme (görsel seçilirken kamera da sunulur)
    class Chrome extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (fileCb != null) fileCb.onReceiveValue(null);
            fileCb = cb;
            cameraOut = null;
            boolean image = false;
            List<String> mimes = new ArrayList<String>();
            String[] acc = p.getAcceptTypes();
            if (acc != null) for (String a0 : acc) for (String a : a0.split(",")) {
                a = a.trim().toLowerCase();
                if (a.isEmpty()) continue;
                if (a.startsWith("image/")) image = true;
                if (a.equals(".json")) a = "application/json";
                if (a.startsWith(".")) continue;
                if (!mimes.contains(a)) mimes.add(a);
            }
            if (mimes.contains("application/json")) { mimes.add("text/plain"); mimes.add("application/octet-stream"); }
            Intent i = new Intent(Intent.ACTION_GET_CONTENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType(mimes.size() == 1 ? mimes.get(0) : "*/*");
            if (mimes.size() > 1) i.putExtra(Intent.EXTRA_MIME_TYPES, mimes.toArray(new String[0]));
            if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            Intent chooser = Intent.createChooser(i, null);
            if (image) {
                try {
                    File dir = new File(getCacheDir(), "kamera");
                    dir.mkdirs();
                    File f = new File(dir, "foto-" + System.currentTimeMillis() + ".jpg");
                    cameraOut = Files.uriFor(MainActivity.this, f);
                    Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    cam.putExtra(MediaStore.EXTRA_OUTPUT, cameraOut);
                    cam.setClipData(ClipData.newRawUri("", cameraOut));
                    cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[] { cam });
                } catch (Exception e) { cameraOut = null; }
            }
            try { startActivityForResult(chooser, REQ_FILE); }
            catch (ActivityNotFoundException e) { fileCb = null; cb.onReceiveValue(null); return false; }
            return true;
        }

        @Override
        public boolean onConsoleMessage(ConsoleMessage m) {
            Log.d("CommCalc", m.message() + " @" + m.sourceId() + ":" + m.lineNumber());
            return true;
        }
    }

    void toast(final String msg) {
        ui.post(new Runnable() { public void run() { Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show(); } });
    }

    void callback(final String id, final String res) {
        final String js = "window.__ccDone(" + JSONObject.quote(id) + "," + JSONObject.quote(res) + ")";
        ui.post(new Runnable() { public void run() { web.evaluateJavascript(js, null); } });
    }

    // ---------------- JavaScript köprüsü (src/js/android.js bunu window.api olarak sunar)
    class Bridge {
        @JavascriptInterface
        public String info() {
            try {
                return new JSONObject().put("version", version()).put("builtin", BUILTIN).put("shell", SHELL).put("repo", REPO)
                    .put("platform", "android").put("dataDir", getFilesDir().getAbsolutePath()).toString();
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface
        public String load() {
            try {
                File f = new File(getFilesDir(), "veri.json");
                if (!f.isFile()) return "null";
                FileInputStream in = new FileInputStream(f);
                ByteArrayOutputStream b = new ByteArrayOutputStream();
                byte[] buf = new byte[65536];
                int r;
                while ((r = in.read(buf)) > 0) b.write(buf, 0, r);
                in.close();
                return new String(b.toByteArray(), "UTF-8");
            } catch (Exception e) { return "null"; }
        }

        // Önce geçici dosyaya yazılır, sonra yer değiştirilir: yarım kalan kayıt eski veriyi bozmaz
        @JavascriptInterface
        public boolean save(String json) {
            try {
                File tmp = new File(getFilesDir(), "veri.json.tmp");
                FileOutputStream o = new FileOutputStream(tmp);
                o.write(json.getBytes("UTF-8"));
                o.getFD().sync();
                o.close();
                return tmp.renameTo(new File(getFilesDir(), "veri.json"));
            } catch (Exception e) { return false; }
        }

        // İndirilenler/Comm Calc klasörüne kaydeder (Android 10+: izin gerektirmez)
        @JavascriptInterface
        public String saveText(String name, String mime, String text) {
            try {
                byte[] data = text.getBytes("UTF-8");
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentResolver cr = getContentResolver();
                    ContentValues v = new ContentValues();
                    v.put("_display_name", name);
                    v.put("mime_type", mime);
                    v.put("relative_path", Environment.DIRECTORY_DOWNLOADS + "/" + FOLDER);
                    v.put("is_pending", 1);
                    Uri uri = cr.insert(Uri.parse("content://media/external/downloads"), v);
                    if (uri == null) return new JSONObject().put("ok", false).put("error", "insert").toString();
                    OutputStream o = cr.openOutputStream(uri);
                    o.write(data); o.close();
                    ContentValues done = new ContentValues();
                    done.put("is_pending", 0);
                    cr.update(uri, done, null, null);
                    return new JSONObject().put("ok", true).put("path", "İndirilenler/" + FOLDER + "/" + name).toString();
                }
                File dir = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), FOLDER);
                dir.mkdirs();
                File f = new File(dir, name);
                FileOutputStream o = new FileOutputStream(f);
                o.write(data); o.close();
                return new JSONObject().put("ok", true).put("path", f.getAbsolutePath()).toString();
            } catch (Exception e) { return err(e); }
        }

        @JavascriptInterface
        public void openUrl(final String url) { ui.post(new Runnable() { public void run() { openExternal(url); } }); }

        @JavascriptInterface
        public void checkUpdate(final String id) {
            new Thread(new Runnable() { public void run() { callback(id, MainActivity.this.checkUpdate()); } }).start();
        }

        @JavascriptInterface
        public void installUpdate(final String id) {
            new Thread(new Runnable() { public void run() { callback(id, MainActivity.this.installUpdate()); } }).start();
        }

        @JavascriptInterface
        public void updateOk() { upd.edit().putInt("tries", 0).apply(); }

        @JavascriptInterface
        public void restart() {
            ui.post(new Runnable() { public void run() { web.clearCache(true); web.loadUrl(START); } });
        }

        @JavascriptInterface
        public void exit() { ui.post(new Runnable() { public void run() { moveTaskToBack(true); } }); }
    }
}
