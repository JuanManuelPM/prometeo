package com.prometeo.mobile.data;

import android.content.Context;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

public final class SnapshotStore {
    private static final int MAX_BYTES = 2 * 1024 * 1024;
    private final File file;

    public SnapshotStore(Context context) {
        File dir = new File(context.getFilesDir(), "prometeo_mobile");
        if (!dir.exists()) dir.mkdirs();
        file = new File(dir, "snapshot_v1.json");
    }

    public synchronized JSONObject load() {
        if (!file.isFile() || file.length() <= 2 || file.length() > MAX_BYTES) return null;
        try (FileInputStream in = new FileInputStream(file);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int total = 0;
            int n;
            while ((n = in.read(buffer)) != -1) {
                total += n;
                if (total > MAX_BYTES) return null;
                out.write(buffer, 0, n);
            }
            return new JSONObject(out.toString(StandardCharsets.UTF_8.name()));
        } catch (Exception ignored) {
            return null;
        }
    }

    public synchronized void save(JSONObject snapshot) throws Exception {
        byte[] bytes = snapshot.toString().getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_BYTES) throw new IllegalArgumentException("Snapshot demasiado grande");

        File temp = new File(file.getParentFile(), file.getName() + ".tmp");
        try (FileOutputStream out = new FileOutputStream(temp)) {
            out.write(bytes);
            out.getFD().sync();
        }
        if (!temp.renameTo(file)) {
            if (file.exists() && !file.delete()) {
                throw new IllegalStateException("No se pudo reemplazar snapshot");
            }
            if (!temp.renameTo(file)) {
                throw new IllegalStateException("No se pudo guardar snapshot");
            }
        }
    }

    public synchronized boolean isFresh(int ttlSeconds) {
        if (!file.isFile()) return false;
        long age = System.currentTimeMillis() - file.lastModified();
        return age >= 0 && age <= Math.max(1, ttlSeconds) * 1000L;
    }

    public synchronized long ageMillis() {
        if (!file.isFile()) return Long.MAX_VALUE;
        return Math.max(0L, System.currentTimeMillis() - file.lastModified());
    }

    public synchronized void clear() {
        if (file.exists()) file.delete();
    }
}
