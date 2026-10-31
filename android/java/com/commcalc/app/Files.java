package com.commcalc.app;

// Uygulamanın geçici dosyalarını (paylaşım, kamera çıktısı) diğer uygulamalara verir.



import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;

import java.io.File;
import java.io.FileNotFoundException;

public class Files extends ContentProvider {
    static final String AUTH = "com.commcalc.app.files";

    static File root(Context c, String k) {
        if ("c".equals(k)) return c.getCacheDir();
        if ("e".equals(k)) return c.getExternalFilesDir(null);
        return null;
    }

    static Uri uriFor(Context c, File f) throws Exception {
        String p = f.getCanonicalPath();
        for (String k : new String[] { "c", "e" }) {
            File r = root(c, k);
            if (r == null) continue;
            String rp = r.getCanonicalPath() + "/";
            if (p.startsWith(rp)) {
                Uri.Builder b = new Uri.Builder().scheme("content").authority(AUTH).appendPath(k);
                for (String s : p.substring(rp.length()).split("/")) b.appendPath(s);
                return b.build();
            }
        }
        throw new IllegalArgumentException("outside");
    }

    File fileFor(Uri u) throws FileNotFoundException {
        java.util.List<String> seg = u.getPathSegments();
        if (seg.size() < 2) throw new FileNotFoundException();
        File r = root(getContext(), seg.get(0));
        if (r == null) throw new FileNotFoundException();
        File f = r;
        for (int i = 1; i < seg.size(); i++) f = new File(f, seg.get(i));
        try {
            if (!f.getCanonicalPath().startsWith(r.getCanonicalPath() + "/")) throw new FileNotFoundException();
        } catch (java.io.IOException e) { throw new FileNotFoundException(); }
        return f;
    }

    @Override public boolean onCreate() { return true; }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File f = fileFor(uri);
        // Kamera uygulaması yalnızca önbellekteki "kamera" klasörüne yazabilir
        if (mode != null && mode.contains("w") && "c".equals(uri.getPathSegments().get(0)) && "kamera".equals(uri.getPathSegments().get(1)))
            return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_WRITE | ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_TRUNCATE);
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public String getType(Uri uri) {
        String n = uri.getLastPathSegment();
        int i = n == null ? -1 : n.lastIndexOf('.');
        String m = i < 0 ? null : MimeTypeMap.getSingleton().getMimeTypeFromExtension(n.substring(i + 1).toLowerCase());
        if (m == null && n != null && n.toLowerCase().endsWith(".docx")) m = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        return m != null ? m : "application/octet-stream";
    }

    @Override
    public Cursor query(Uri uri, String[] proj, String sel, String[] args, String sort) {
        File f;
        try { f = fileFor(uri); } catch (FileNotFoundException e) { return null; }
        if (proj == null) proj = new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE };
        MatrixCursor c = new MatrixCursor(proj, 1);
        Object[] row = new Object[proj.length];
        for (int i = 0; i < proj.length; i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(proj[i])) row[i] = f.getName();
            else if (OpenableColumns.SIZE.equals(proj[i])) row[i] = f.length();
        }
        c.addRow(row);
        return c;
    }

    @Override public Uri insert(Uri uri, ContentValues v) { return null; }
    @Override public int delete(Uri uri, String s, String[] a) { return 0; }
    @Override public int update(Uri uri, ContentValues v, String s, String[] a) { return 0; }
}
