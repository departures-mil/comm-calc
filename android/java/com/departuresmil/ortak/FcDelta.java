package com.departuresmil.ortak;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.zip.DataFormatException;
import java.util.zip.Inflater;

/**
 * FCD1 yama uygulayıcı (yalnızca apply). Java 8 / Android uyumlu, dış bağımlılık yok.
 * Format: delta/FORMAT.md
 *
 * Kullanım:
 *   FcDelta.Header h = FcDelta.apply(oldApk, patchFile, outFile, progress);
 * Kaynak ya da sonuç SHA-256 uyuşmazsa {@link FcDeltaException} fırlatır ve outFile oluşmaz.
 * Bellek: sabit (~1 MB); eski dosya RandomAccessFile ile okunur.
 *
 * CLI (test için): java com.departuresmil.ortak.FcDelta apply <old> <patch> <out>
 */
public final class FcDelta {

    public static final int HEADER_LEN = 85;
    public static final int CODEC_ZLIB = 0x01;
    private static final byte[] MAGIC = {'F', 'C', 'D', '1'};
    private static final int OP_END = 0, OP_COPY = 1, OP_INSERT = 2;
    private static final int IO_BLOCK = 1 << 20;

    private FcDelta() {}

    /** İlerleme bildirimi (yazılan bayt, toplam). */
    public interface Progress {
        void onProgress(long written, long total);
    }

    public static final class FcDeltaException extends IOException {
        public FcDeltaException(String m) { super(m); }
    }

    public static final class Header {
        public final long srcLen, dstLen;
        public final byte[] srcSha256, dstSha256;

        Header(long srcLen, byte[] srcSha, long dstLen, byte[] dstSha) {
            this.srcLen = srcLen; this.srcSha256 = srcSha; this.dstLen = dstLen; this.dstSha256 = dstSha;
        }

        public String dstSha256Hex() { return hex(dstSha256); }
        public String srcSha256Hex() { return hex(srcSha256); }
    }

    public static Header readHeader(File patch) throws IOException {
        InputStream in = new FileInputStream(patch);
        try {
            byte[] h = new byte[HEADER_LEN];
            readFully(in, h, 0, HEADER_LEN);
            return parseHeader(h);
        } finally {
            in.close();
        }
    }

    public static Header parseHeader(byte[] h) throws FcDeltaException {
        if (h.length < HEADER_LEN) throw new FcDeltaException("FCD1: yama çok kısa");
        for (int i = 0; i < 4; i++) if (h[i] != MAGIC[i]) throw new FcDeltaException("FCD1: yama dosyası değil");
        if ((h[4] & 0xFF) != CODEC_ZLIB) throw new FcDeltaException("FCD1: bilinmeyen codec " + (h[4] & 0xFF));
        long src = u64(h, 5), dst = u64(h, 45);
        if (src < 0 || dst < 0) throw new FcDeltaException("FCD1: uzunluk çok büyük");
        return new Header(src, Arrays.copyOfRange(h, 13, 45), dst, Arrays.copyOfRange(h, 53, 85));
    }

    /** SHA-256 (ham bayt) — Android'de kurulu APK'yı kontrol etmek için de kullanılabilir. */
    public static byte[] sha256(File f) throws IOException {
        MessageDigest md = newSha();
        InputStream in = new FileInputStream(f);
        try {
            byte[] buf = new byte[IO_BLOCK];
            int n;
            while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
        } finally {
            in.close();
        }
        return md.digest();
    }

    /**
     * Yamayı uygular: önce outFile + ".part" dosyasına yazar, SHA-256 doğrular, sonra outFile'a taşır.
     */
    public static Header apply(File oldFile, File patchFile, File outFile, Progress progress) throws IOException {
        Header hd = readHeader(patchFile);
        if (oldFile.length() != hd.srcLen || !Arrays.equals(sha256(oldFile), hd.srcSha256))
            throw new FcDeltaException("FCD1: kurulu dosya yamanın kaynağı değil");

        File tmp = new File(outFile.getPath() + ".part");
        boolean ok = false;
        RandomAccessFile old = new RandomAccessFile(oldFile, "r");
        OutputStream out = new FileOutputStream(tmp);
        InputStream pin = new FileInputStream(patchFile);
        Inflater inf = new Inflater(false); // zlib (RFC 1950) başlıklı
        try {
            skipFully(pin, HEADER_LEN);
            MessageDigest md = newSha();
            Parser p = new Parser(hd, old, out, md, progress);
            byte[] inBuf = new byte[256 * 1024];
            byte[] outBuf = new byte[256 * 1024];
            while (true) {
                if (inf.finished()) {
                    if (inf.getRemaining() > 0 || pin.read() >= 0)
                        throw new FcDeltaException("FCD1: zlib akışından sonra fazla veri");
                    break;
                }
                if (inf.needsInput()) {
                    int n = pin.read(inBuf);
                    if (n < 0) throw new FcDeltaException("FCD1: zlib akışı kesik");
                    inf.setInput(inBuf, 0, n);
                }
                int k;
                try {
                    k = inf.inflate(outBuf);
                } catch (DataFormatException e) {
                    throw new FcDeltaException("FCD1: bozuk zlib verisi: " + e.getMessage());
                }
                if (k > 0) p.feed(outBuf, k);
                else if (inf.needsDictionary()) throw new FcDeltaException("FCD1: zlib sözlük istiyor");
            }
            p.finish();
            out.close();
            out = null;
            if (!Arrays.equals(md.digest(), hd.dstSha256))
                throw new FcDeltaException("FCD1: sonuç SHA-256 uyuşmuyor");
            if (outFile.exists() && !outFile.delete()) throw new IOException("silinemedi: " + outFile);
            if (!tmp.renameTo(outFile)) throw new IOException("taşınamadı: " + outFile);
            ok = true;
            return hd;
        } finally {
            inf.end();
            closeQuietly(pin);
            closeQuietly(out);
            closeQuietly(old);
            if (!ok) tmp.delete();
        }
    }

    /** Açılmış op akışı için durum makinesi. */
    private static final class Parser {
        final Header hd;
        final RandomAccessFile old;
        final OutputStream out;
        final MessageDigest md;
        final Progress progress;
        final byte[] copyBuf = new byte[IO_BLOCK];
        int state = 0, op = 0, need = 0, nf = 0, shift = 0;
        final long[] fields = new long[2];
        long v = 0, remain = 0, written = 0, emitted = 0;
        boolean ended = false;

        Parser(Header hd, RandomAccessFile old, OutputStream out, MessageDigest md, Progress progress) {
            this.hd = hd; this.old = old; this.out = out; this.md = md; this.progress = progress;
        }

        void feed(byte[] c, int n) throws IOException {
            int i = 0;
            while (i < n) {
                if (ended) throw new FcDeltaException("FCD1: END sonrası fazla veri");
                if (state == 0) {
                    op = c[i++] & 0xFF;
                    if (op == OP_END) { ended = true; continue; }
                    if (op == OP_COPY) need = 2;
                    else if (op == OP_INSERT) need = 1;
                    else throw new FcDeltaException("FCD1: geçersiz op " + op);
                    nf = 0; v = 0; shift = 0; state = 1;
                } else if (state == 1) {
                    int b = c[i++] & 0xFF;
                    if (shift > 56) throw new FcDeltaException("FCD1: varint çok uzun");
                    v |= ((long) (b & 0x7F)) << shift;
                    shift += 7;
                    if (b < 0x80) {
                        if (v < 0) throw new FcDeltaException("FCD1: varint çok büyük");
                        fields[nf++] = v; v = 0; shift = 0;
                        if (nf == need) exec();
                    }
                } else {
                    int k = (int) Math.min(remain, (long) (n - i));
                    emit(c, i, k);
                    i += k; remain -= k;
                    if (remain == 0) state = 0;
                }
            }
        }

        private void grow(long len) throws FcDeltaException {
            written += len;
            if (written < 0 || written > hd.dstLen) throw new FcDeltaException("FCD1: çıktı dstLen değerini aşıyor");
        }

        private void exec() throws IOException {
            if (op == OP_COPY) {
                long off = fields[0], len = fields[1];
                if (off + len < 0 || off + len > hd.srcLen) throw new FcDeltaException("FCD1: COPY aralığı kaynak dışında");
                grow(len);
                old.seek(off);
                while (len > 0) {
                    int k = (int) Math.min(len, (long) copyBuf.length);
                    old.readFully(copyBuf, 0, k);
                    emit(copyBuf, 0, k);
                    len -= k;
                }
                state = 0;
            } else {
                long len = fields[0];
                grow(len);
                remain = len;
                state = len > 0 ? 2 : 0;
            }
        }

        private void emit(byte[] b, int off, int len) throws IOException {
            out.write(b, off, len);
            md.update(b, off, len);
            emitted += len;
            if (progress != null) progress.onProgress(emitted, hd.dstLen);
        }

        void finish() throws FcDeltaException {
            if (!ended) throw new FcDeltaException("FCD1: END op yok (yama kesik)");
            if (written != hd.dstLen) throw new FcDeltaException("FCD1: çıktı uzunluğu dstLen ile uyuşmuyor");
        }
    }

    // ---- yardımcılar ----

    private static long u64(byte[] b, int o) {
        long v = 0;
        for (int i = 7; i >= 0; i--) v = (v << 8) | (b[o + i] & 0xFFL);
        return v;
    }

    private static MessageDigest newSha() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void readFully(InputStream in, byte[] b, int off, int len) throws IOException {
        while (len > 0) {
            int n = in.read(b, off, len);
            if (n < 0) throw new FcDeltaException("FCD1: yama çok kısa");
            off += n; len -= n;
        }
    }

    private static void skipFully(InputStream in, long n) throws IOException {
        byte[] tmp = new byte[(int) n];
        readFully(in, tmp, 0, (int) n);
    }

    public static String hex(byte[] b) {
        StringBuilder sb = new StringBuilder(b.length * 2);
        for (byte x : b) sb.append(Character.forDigit((x >> 4) & 0xF, 16)).append(Character.forDigit(x & 0xF, 16));
        return sb.toString();
    }

    private static void closeQuietly(java.io.Closeable c) {
        if (c == null) return;
        try { c.close(); } catch (IOException ignored) { }
    }

    /** Test CLI'ı. */
    public static void main(String[] args) {
        if (args.length != 4 || !"apply".equals(args[0])) {
            System.err.println("kullanım: FcDelta apply <old> <patch> <out>");
            System.exit(2);
        }
        try {
            Header h = apply(new File(args[1]), new File(args[2]), new File(args[3]), null);
            System.out.println("ok " + args[3] + " sha256=" + h.dstSha256Hex());
        } catch (IOException e) {
            System.err.println("hata: " + e.getMessage());
            System.exit(1);
        }
    }
}
