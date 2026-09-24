package com.prometeo.mobile.net;

import android.os.Build;
import android.util.Base64;

import com.prometeo.mobile.BuildConfig;
import com.prometeo.mobile.data.SessionStore;
import com.prometeo.mobile.security.DeviceIdentity;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.List;
import java.util.Map;

import javax.net.ssl.HttpsURLConnection;

public final class MobileGatewayClient {
    public static final String CONTRACT = "prometeo.mobile/v1";
    private static final String PATH = RequestCanonicalizer.PATH;
    private static final String ENDPOINT =
            "https://catnohyouxqjjtseaueb.supabase.co" + PATH;

    private final DeviceIdentity identity;
    private final SessionStore sessions;
    private final SecureRandom random = new SecureRandom();

    public MobileGatewayClient(DeviceIdentity identity, SessionStore sessions) {
        this.identity = identity;
        this.sessions = sessions;
    }

    public JSONObject pair(String pairToken) throws Exception {
        identity.ensureKeys();

        JSONObject body = new JSONObject();
        body.put("op", "pair");
        body.put("pairToken", pairToken == null ? "" : pairToken.trim());
        body.put("publicKeySpki", identity.publicKeySpki());
        body.put("approvalPublicKeySpki", identity.approvalPublicKeySpki());
        body.put("deviceLabel", Build.MANUFACTURER + " " + Build.MODEL);
        body.put("deviceModel", Build.MODEL);
        body.put("appVersionCode", BuildConfig.VERSION_CODE);
        body.put("protocolMax", 1);

        GatewayResponse response = executeRaw(body.toString(), null, null);
        JSONObject result = parseJsonOrThrow(response);
        String sessionId = result.optString("session_id", "");
        if (sessionId.isEmpty()) throw new GatewayException(500, "PAIR_SESSION_MISSING");
        sessions.saveSessionId(sessionId);
        return result;
    }

    public JSONObject bootstrap() throws Exception {
        JSONObject body = new JSONObject();
        body.put("op", "bootstrap");
        return postSignedJson(body);
    }

    public GatewayResponse voiceAudio(String messageId, int partIndex) throws Exception {
        JSONObject body = new JSONObject();
        body.put("op", "voice_audio");
        body.put("messageId", messageId);
        body.put("partIndex", partIndex);
        PreparedRequest request = prepareSigned(body.toString());
        GatewayResponse response = execute(request, null);
        if (!response.isSuccessful()) throw gatewayError(response);
        return response;
    }

    public JSONObject postSignedJson(JSONObject body) throws Exception {
        PreparedRequest request = prepareSigned(body.toString());
        return executeJson(request, null);
    }

    public PreparedRequest prepareSigned(String exactBody) throws Exception {
        String sessionId = sessions.sessionId();
        if (sessionId == null || sessionId.isEmpty()) {
            throw new GatewayException(401, "DEVICE_NOT_PAIRED");
        }

        String timestamp = Long.toString(System.currentTimeMillis() / 1000L);
        byte[] nonceBytes = new byte[24];
        random.nextBytes(nonceBytes);
        String nonce = Base64.encodeToString(
                nonceBytes,
                Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING
        );

        String canonical = RequestCanonicalizer.canonical(
                timestamp,
                nonce,
                exactBody
        );

        String signature = identity.sign(canonical);
        return new PreparedRequest(
                exactBody,
                sessionId,
                timestamp,
                nonce,
                signature,
                canonical
        );
    }

    public JSONObject executeJson(
            PreparedRequest request,
            String approvalSignature
    ) throws Exception {
        return parseJsonOrThrow(execute(request, approvalSignature));
    }

    public GatewayResponse execute(
            PreparedRequest request,
            String approvalSignature
    ) throws Exception {
        return executeRaw(request.body, request, approvalSignature);
    }

    private GatewayResponse executeRaw(
            String body,
            PreparedRequest signed,
            String approvalSignature
    ) throws Exception {
        byte[] requestBytes = body.getBytes(StandardCharsets.UTF_8);
        HttpsURLConnection connection =
                (HttpsURLConnection) new URL(ENDPOINT).openConnection();

        connection.setRequestMethod("POST");
        connection.setConnectTimeout(12_000);
        connection.setReadTimeout(120_000);
        connection.setUseCaches(false);
        connection.setDoInput(true);
        connection.setDoOutput(true);
        connection.setInstanceFollowRedirects(false);
        connection.setFixedLengthStreamingMode(requestBytes.length);
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty(
                "User-Agent",
                "PrometeoMobile/" + BuildConfig.VERSION_NAME
                        + " Android/" + Build.VERSION.SDK_INT
        );

        if (signed != null) {
            connection.setRequestProperty("x-prometeo-device", signed.sessionId);
            connection.setRequestProperty("x-prometeo-timestamp", signed.timestamp);
            connection.setRequestProperty("x-prometeo-nonce", signed.nonce);
            connection.setRequestProperty("x-prometeo-signature", signed.signature);
        }
        if (approvalSignature != null && !approvalSignature.isEmpty()) {
            connection.setRequestProperty(
                    "x-prometeo-approval-signature",
                    approvalSignature
            );
        }

        try (OutputStream out = connection.getOutputStream()) {
            out.write(requestBytes);
        }

        int code = connection.getResponseCode();
        InputStream stream = code >= 200 && code < 400
                ? connection.getInputStream()
                : connection.getErrorStream();
        byte[] responseBytes = readAll(stream, 16 * 1024 * 1024);
        String contentType = connection.getContentType();
        Map<String, List<String>> headers = connection.getHeaderFields();
        connection.disconnect();

        return new GatewayResponse(code, responseBytes, contentType, headers);
    }

    private static JSONObject parseJsonOrThrow(GatewayResponse response)
            throws Exception {
        String text = new String(response.body, StandardCharsets.UTF_8);
        JSONObject json;
        try {
            json = new JSONObject(text.isEmpty() ? "{}" : text);
        } catch (Exception e) {
            if (!response.isSuccessful()) {
                throw new GatewayException(response.status, "HTTP_" + response.status);
            }
            throw new IOException("Respuesta JSON inválida", e);
        }

        if (!response.isSuccessful()) {
            String code = json.optString("code", "HTTP_" + response.status);
            throw new GatewayException(response.status, code);
        }
        return json;
    }

    private static GatewayException gatewayError(GatewayResponse response) {
        try {
            String text = new String(response.body, StandardCharsets.UTF_8);
            JSONObject json = new JSONObject(text);
            return new GatewayException(
                    response.status,
                    json.optString("code", "HTTP_" + response.status)
            );
        } catch (Exception ignored) {
            return new GatewayException(response.status, "HTTP_" + response.status);
        }
    }

    private static byte[] readAll(InputStream input, int maxBytes) throws IOException {
        if (input == null) return new byte[0];
        try (InputStream in = input; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int total = 0;
            int n;
            while ((n = in.read(buffer)) != -1) {
                total += n;
                if (total > maxBytes) throw new IOException("Respuesta demasiado grande");
                out.write(buffer, 0, n);
            }
            return out.toByteArray();
        }
    }

    public static final class PreparedRequest {
        public final String body;
        public final String sessionId;
        public final String timestamp;
        public final String nonce;
        public final String signature;
        public final String canonical;

        PreparedRequest(
                String body,
                String sessionId,
                String timestamp,
                String nonce,
                String signature,
                String canonical
        ) {
            this.body = body;
            this.sessionId = sessionId;
            this.timestamp = timestamp;
            this.nonce = nonce;
            this.signature = signature;
            this.canonical = canonical;
        }
    }

    public static final class GatewayResponse {
        public final int status;
        public final byte[] body;
        public final String contentType;
        public final Map<String, List<String>> headers;

        GatewayResponse(
                int status,
                byte[] body,
                String contentType,
                Map<String, List<String>> headers
        ) {
            this.status = status;
            this.body = body;
            this.contentType = contentType == null ? "" : contentType;
            this.headers = headers;
        }

        public boolean isSuccessful() {
            return status >= 200 && status < 300;
        }

        public String header(String name) {
            if (headers == null || name == null) return null;
            for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
                if (entry.getKey() != null
                        && entry.getKey().equalsIgnoreCase(name)
                        && entry.getValue() != null
                        && !entry.getValue().isEmpty()) {
                    return entry.getValue().get(0);
                }
            }
            return null;
        }
    }

    public static final class GatewayException extends IOException {
        public final int status;
        public final String code;

        public GatewayException(int status, String code) {
            super(code);
            this.status = status;
            this.code = code;
        }
    }
}
