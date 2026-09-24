package com.prometeo.voice;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final String RPC_URL =
            "https://catnohyouxqjjtseaueb.supabase.co/rest/v1/rpc/prometeo_strategic_console_v2";
    private static final String TTS_URL =
            "https://catnohyouxqjjtseaueb.supabase.co/functions/v1/prometeo-strategy-audio-v1";
    private static final String PUBLISHABLE_KEY =
            "sb_publishable_eqh3PngXs4UjLLWiY3pz1w_nhHtf7X-";
    private static final int CHUNK_SIZE = 500;

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private TextView status;
    private Button playLatest;
    private Button toggle;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(28), dp(56), dp(28), dp(28));
        root.setBackgroundColor(Color.BLACK);

        TextView title = new TextView(this);
        title.setText("PROMETEO\nVOZ");
        title.setTextColor(Color.WHITE);
        title.setTextSize(34);
        title.setGravity(Gravity.CENTER);
        title.setLetterSpacing(0.08f);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        root.addView(title, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        status = new TextView(this);
        status.setText("Listo para escuchar el último mensaje.");
        status.setTextColor(Color.rgb(170, 170, 170));
        status.setTextSize(15);
        status.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams statusLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        statusLp.setMargins(0, dp(28), 0, dp(28));
        root.addView(status, statusLp);

        playLatest = new Button(this);
        playLatest.setText("▶  ESCUCHAR ÚLTIMO");
        playLatest.setTextSize(16);
        playLatest.setAllCaps(false);
        playLatest.setOnClickListener(v -> loadAndPlayLatest());
        root.addView(playLatest, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(60)));

        toggle = new Button(this);
        toggle.setText("Ⅱ  PAUSA / CONTINUAR");
        toggle.setTextSize(14);
        toggle.setAllCaps(false);
        toggle.setEnabled(false);
        toggle.setOnClickListener(v -> {
            Intent intent = new Intent(this, PlaybackService.class);
            intent.setAction(PlaybackService.ACTION_TOGGLE);
            startService(intent);
        });
        LinearLayout.LayoutParams toggleLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        toggleLp.setMargins(0, dp(12), 0, 0);
        root.addView(toggle, toggleLp);

        TextView note = new TextView(this);
        note.setText("Podés salir de la app o bloquear la pantalla. El audio sigue en el reproductor del sistema.");
        note.setTextColor(Color.rgb(105, 105, 105));
        note.setTextSize(12);
        note.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams noteLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        noteLp.setMargins(0, dp(30), 0, 0);
        root.addView(note, noteLp);

        setContentView(root);
    }

    private void loadAndPlayLatest() {
        playLatest.setEnabled(false);
        toggle.setEnabled(false);
        status.setText("Buscando el último mensaje…");

        io.execute(() -> {
            try {
                Brief brief = fetchLatestBrief();
                if (brief.text.trim().isEmpty()) throw new IllegalStateException("No hay texto de voz disponible.");

                List<String> chunks = splitText(brief.text);
                ArrayList<String> uris = new ArrayList<>();

                for (int i = 0; i < chunks.size(); i++) {
                    int part = i + 1;
                    runOnUiThread(() ->
                            status.setText("Preparando voz " + part + " / " + chunks.size() + "…"));
                    File audio = fetchOrGenerateAudio(brief.id, i, chunks.get(i));
                    uris.add(Uri.fromFile(audio).toString());
                }

                runOnUiThread(() -> {
                    Intent intent = new Intent(this, PlaybackService.class);
                    intent.setAction(PlaybackService.ACTION_PLAY);
                    intent.putStringArrayListExtra(PlaybackService.EXTRA_URIS, uris);
                    intent.putExtra(PlaybackService.EXTRA_TITLE, brief.headline);
                    startService(intent);

                    status.setText("Reproduciendo · ya podés salir o bloquear la pantalla.");
                    playLatest.setEnabled(true);
                    toggle.setEnabled(true);
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    status.setText("No pude preparar la voz: " + compactError(e));
                    playLatest.setEnabled(true);
                });
            }
        });
    }

    private Brief fetchLatestBrief() throws Exception {
        JSONObject args = new JSONObject();
        args.put("p_channel_key", "PROMETEO_MAIN");

        HttpURLConnection c = open(RPC_URL, "POST");
        c.setRequestProperty("apikey", PUBLISHABLE_KEY);
        c.setRequestProperty("Authorization", "Bearer " + PUBLISHABLE_KEY);
        c.setRequestProperty("Content-Type", "application/json");
        c.getOutputStream().write(args.toString().getBytes(StandardCharsets.UTF_8));

        int code = c.getResponseCode();
        String body = new String(readAll(code >= 200 && code < 300
                ? c.getInputStream() : c.getErrorStream()), StandardCharsets.UTF_8);
        c.disconnect();
        if (code < 200 || code >= 300) throw new IllegalStateException("estado HTTP " + code);

        JSONObject state = new JSONObject(body);
        JSONObject preview = state.optJSONObject("preview");
        JSONObject firm = state.optJSONObject("firm");

        JSONObject selected;
        boolean usePreview;
        if (preview != null && firm != null) {
            usePreview = timestamp(preview) > timestamp(firm);
            selected = usePreview ? preview : firm;
        } else if (preview != null) {
            usePreview = true;
            selected = preview;
        } else if (firm != null) {
            usePreview = false;
            selected = firm;
        } else {
            throw new IllegalStateException("Prometeo todavía no publicó un mensaje.");
        }

        String text = usePreview
                ? selected.optString("preview_text", "")
                : selected.optString("spoken_brief", selected.optString("preview_text", ""));
        String epoch = selected.optString("epoch_id", "current");
        String id = usePreview
                ? "strategic-preview-" + epoch
                : selected.optString("tts_message_id", epoch);
        String headline = selected.optString("headline", "Estado actual");

        return new Brief(cleanId(id), text.replaceAll("\\s+", " ").trim(), headline);
    }

    private File fetchOrGenerateAudio(String baseId, int index, String text) throws Exception {
        String messageId = cleanId("android-v1-" + baseId + "-" + (index + 1) + "-" + shortHash(text));

        HttpURLConnection cached = open(TTS_URL + "?id=" +
                java.net.URLEncoder.encode(messageId, "UTF-8"), "GET");
        int cachedCode = cached.getResponseCode();
        if (cachedCode == 200) {
            byte[] bytes = readAll(cached.getInputStream());
            String type = cached.getContentType();
            cached.disconnect();
            return storeAudio(messageId, bytes, type);
        }
        cached.disconnect();

        JSONObject payload = new JSONObject();
        payload.put("messageId", messageId);
        payload.put("text", text);

        HttpURLConnection c = open(TTS_URL, "POST");
        c.setRequestProperty("Content-Type", "application/json");
        c.getOutputStream().write(payload.toString().getBytes(StandardCharsets.UTF_8));

        int code = c.getResponseCode();
        byte[] bytes = readAll(code >= 200 && code < 300 ? c.getInputStream() : c.getErrorStream());
        String type = c.getContentType();
        c.disconnect();

        if (code < 200 || code >= 300) {
            throw new IllegalStateException("voz HTTP " + code);
        }
        if (bytes.length < 1000) throw new IllegalStateException("audio vacío");

        return storeAudio(messageId, bytes, type);
    }

    private File storeAudio(String id, byte[] bytes, String contentType) throws Exception {
        String ext = audioExtension(bytes, contentType);
        File dir = new File(getCacheDir(), "prometeo_voice");
        if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("sin cache local");
        File out = new File(dir, shortHash(id) + "." + ext);
        try (FileOutputStream fos = new FileOutputStream(out)) {
            fos.write(bytes);
        }
        return out;
    }

    private static String audioExtension(byte[] b, String type) {
        String t = type == null ? "" : type.toLowerCase(Locale.ROOT);
        if (t.contains("wav")) return "wav";
        if (t.contains("mpeg") || t.contains("mp3")) return "mp3";
        if (t.contains("ogg")) return "ogg";
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'A' && b[10] == 'V' && b[11] == 'E') return "wav";
        if (b.length >= 3 && b[0] == 'I' && b[1] == 'D' && b[2] == '3') return "mp3";
        if (b.length >= 4 && b[0] == 'O' && b[1] == 'g' && b[2] == 'g' && b[3] == 'S') return "ogg";
        return "mp3";
    }

    private static List<String> splitText(String raw) {
        ArrayList<String> out = new ArrayList<>();
        String text = raw.trim();
        int p = 0;
        while (p < text.length()) {
            int end = Math.min(text.length(), p + CHUNK_SIZE);
            if (end < text.length()) {
                int min = p + (int) (CHUNK_SIZE * 0.60);
                int cut = -1;
                for (int i = end; i >= min; i--) {
                    char ch = text.charAt(i - 1);
                    if (ch == '.' || ch == '!' || ch == '?' || ch == ';' || ch == ':' || ch == ',') {
                        cut = i;
                        break;
                    }
                }
                if (cut < 0) {
                    for (int i = end; i >= min; i--) {
                        if (Character.isWhitespace(text.charAt(i - 1))) {
                            cut = i;
                            break;
                        }
                    }
                }
                if (cut > p) end = cut;
            }
            String chunk = text.substring(p, end).trim();
            if (!chunk.isEmpty()) out.add(chunk);
            p = end;
            while (p < text.length() && Character.isWhitespace(text.charAt(p))) p++;
        }
        return out;
    }

    private static long timestamp(JSONObject o) {
        try {
            return OffsetDateTime.parse(o.optString("generated_at", "")).toInstant().toEpochMilli();
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private static HttpURLConnection open(String url, String method) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(15000);
        c.setReadTimeout(90000);
        c.setUseCaches(false);
        c.setDoInput(true);
        if ("POST".equals(method)) c.setDoOutput(true);
        return c;
    }

    private static byte[] readAll(InputStream in) throws Exception {
        if (in == null) return new byte[0];
        try (InputStream input = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = input.read(buf)) != -1) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }

    private static String cleanId(String value) {
        return value.replaceAll("[^a-zA-Z0-9._:-]", "-");
    }

    private static String shortHash(String value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder s = new StringBuilder();
        for (int i = 0; i < 8; i++) s.append(String.format(Locale.ROOT, "%02x", digest[i]));
        return s.toString();
    }

    private static String compactError(Exception e) {
        String s = e.getMessage();
        if (s == null || s.trim().isEmpty()) s = e.getClass().getSimpleName();
        return s.length() > 90 ? s.substring(0, 90) : s;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onDestroy() {
        io.shutdownNow();
        super.onDestroy();
    }

    private static final class Brief {
        final String id;
        final String text;
        final String headline;

        Brief(String id, String text, String headline) {
            this.id = id;
            this.text = text;
            this.headline = headline;
        }
    }
}
