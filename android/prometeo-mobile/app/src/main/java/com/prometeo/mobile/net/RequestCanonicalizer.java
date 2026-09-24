package com.prometeo.mobile.net;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public final class RequestCanonicalizer {
    public static final String SCHEMA = "prometeo.mobile.request/v1";
    public static final String METHOD = "POST";
    public static final String PATH = "/functions/v1/prometeo-mobile-v1";

    private RequestCanonicalizer() {}

    public static String canonical(
            String timestamp,
            String nonce,
            String exactBody
    ) throws Exception {
        return SCHEMA + "\n"
                + METHOD + "\n"
                + PATH + "\n"
                + timestamp + "\n"
                + nonce + "\n"
                + sha256Hex(exactBody);
    }

    public static String sha256Hex(String value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder out = new StringBuilder(digest.length * 2);
        for (byte b : digest) out.append(String.format("%02x", b & 0xff));
        return out.toString();
    }
}
