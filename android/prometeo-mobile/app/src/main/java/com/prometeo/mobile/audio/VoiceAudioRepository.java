package com.prometeo.mobile.audio;

import android.content.Context;

import com.prometeo.mobile.net.MobileGatewayClient;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Comparator;

public final class VoiceAudioRepository {
    private static final long MAX_CACHE_BYTES = 48L * 1024L * 1024L;

    private final File dir;
    private final MobileGatewayClient gateway;

    public VoiceAudioRepository(Context context, MobileGatewayClient gateway) {
        this.gateway = gateway;
        dir = new File(context.getCacheDir(), "prometeo_voice_v1");
        if (!dir.exists()) dir.mkdirs();
    }

    public synchronized File getCached(String messageId, int partIndex) {
        String base = key(messageId, partIndex);
        for (String ext : new String[]{"wav", "mp3", "ogg"}) {
            File file = new File(dir, base + "." + ext);
            if (file.isFile() && file.length() > 1000) {
                file.setLastModified(System.currentTimeMillis());
                return file;
            }
        }
        return null;
    }

    public File getOrDownload(String messageId, int partIndex) throws Exception {
        File cached = getCached(messageId, partIndex);
        if (cached != null) return cached;

        MobileGatewayClient.GatewayResponse response =
                gateway.voiceAudio(messageId, partIndex);
        if (response.body.length < 1000) {
            throw new IllegalStateException("Audio vacío");
        }

        String ext = extension(response.contentType, response.body);
        String base = key(messageId, partIndex);
        File target = new File(dir, base + "." + ext);
        File temp = new File(dir, base + ".tmp");

        try (FileOutputStream out = new FileOutputStream(temp)) {
            out.write(response.body);
            out.getFD().sync();
        }

        synchronized (this) {
            if (!temp.renameTo(target)) {
                if (target.exists() && !target.delete()) {
                    throw new IllegalStateException("No se pudo reemplazar audio");
                }
                if (!temp.renameTo(target)) {
                    throw new IllegalStateException("No se pudo guardar audio");
                }
            }
            target.setLastModified(System.currentTimeMillis());
            prune();
        }
        return target;
    }

    private synchronized void prune() {
        File[] files = dir.listFiles(file ->
                file.isFile()
                        && !file.getName().endsWith(".tmp")
        );
        if (files == null || files.length == 0) return;

        long total = 0;
        for (File file : files) total += file.length();
        if (total <= MAX_CACHE_BYTES) return;

        Arrays.sort(files, Comparator.comparingLong(File::lastModified));
        for (File file : files) {
            if (total <= MAX_CACHE_BYTES) break;
            long size = file.length();
            if (file.delete()) total -= size;
        }
    }

    private static String key(String messageId, int partIndex) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(
                    (messageId + "|" + partIndex).getBytes(StandardCharsets.UTF_8)
            );
            StringBuilder out = new StringBuilder();
            for (int i = 0; i < 12; i++) {
                out.append(String.format("%02x", bytes[i] & 0xff));
            }
            return out.toString();
        } catch (Exception e) {
            return Integer.toHexString((messageId + "|" + partIndex).hashCode());
        }
    }

    private static String extension(String contentType, byte[] bytes) {
        String type = contentType == null ? "" : contentType.toLowerCase();
        if (type.contains("wav")) return "wav";
        if (type.contains("mpeg") || type.contains("mp3")) return "mp3";
        if (type.contains("ogg")) return "ogg";

        if (bytes.length >= 12
                && bytes[0] == 'R' && bytes[1] == 'I'
                && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'A'
                && bytes[10] == 'V' && bytes[11] == 'E') {
            return "wav";
        }
        if (bytes.length >= 4
                && bytes[0] == 'O' && bytes[1] == 'g'
                && bytes[2] == 'g' && bytes[3] == 'S') {
            return "ogg";
        }
        return "mp3";
    }
}
