package com.prometeo.mobile.data;

import android.content.Context;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

public final class PendingActionStore {
    private final File file;

    public PendingActionStore(Context context) {
        File dir = new File(context.getFilesDir(), "prometeo_mobile");
        if (!dir.exists()) dir.mkdirs();
        file = new File(dir, "pending_action_v1.json");
    }

    public synchronized boolean hasPending() {
        return file.isFile() && file.length() > 2;
    }

    public synchronized String load() {
        if (!hasPending()) return null;
        try (FileInputStream in = new FileInputStream(file);
             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int n;
            int total = 0;
            while ((n = in.read(buffer)) != -1) {
                total += n;
                if (total > 64 * 1024) return null;
                out.write(buffer, 0, n);
            }
            return out.toString(StandardCharsets.UTF_8.name());
        } catch (Exception ignored) {
            return null;
        }
    }

    public synchronized void save(String body) throws Exception {
        if (body == null || body.length() > 64 * 1024) {
            throw new IllegalArgumentException("Acción local inválida");
        }
        File temp = new File(file.getParentFile(), file.getName() + ".tmp");
        try (FileOutputStream out = new FileOutputStream(temp)) {
            out.write(body.getBytes(StandardCharsets.UTF_8));
            out.getFD().sync();
        }
        if (!temp.renameTo(file)) {
            if (file.exists() && !file.delete()) throw new IllegalStateException("No se pudo reemplazar acción pendiente");
            if (!temp.renameTo(file)) throw new IllegalStateException("No se pudo guardar acción pendiente");
        }
    }

    public synchronized void clear() {
        if (file.exists()) file.delete();
    }
}
