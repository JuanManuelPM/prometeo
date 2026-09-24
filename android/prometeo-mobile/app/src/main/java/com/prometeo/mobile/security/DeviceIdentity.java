package com.prometeo.mobile.security;

import android.app.KeyguardManager;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.security.GeneralSecurityException;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.cert.Certificate;

public final class DeviceIdentity {
    private static final String STORE = "AndroidKeyStore";
    private static final String DEVICE_ALIAS = "prometeo_device_sign_v1";
    private static final String APPROVAL_ALIAS = "prometeo_approval_sign_v1";

    private final Context context;
    private final KeyStore keyStore;

    public DeviceIdentity(Context context) throws GeneralSecurityException {
        this.context = context.getApplicationContext();
        try {
            keyStore = KeyStore.getInstance(STORE);
            keyStore.load(null);
        } catch (Exception e) {
            throw new GeneralSecurityException("No se pudo abrir Android Keystore", e);
        }
    }

    public boolean isDeviceSecure() {
        KeyguardManager km = context.getSystemService(KeyguardManager.class);
        return km != null && km.isDeviceSecure();
    }

    public synchronized void ensureKeys() throws GeneralSecurityException {
        if (!keyStore.containsAlias(DEVICE_ALIAS)) {
            createDeviceKey();
        }
        if (!keyStore.containsAlias(APPROVAL_ALIAS)) {
            if (!isDeviceSecure()) {
                throw new GeneralSecurityException(
                        "Necesitás bloqueo de pantalla seguro para habilitar acciones."
                );
            }
            createApprovalKey();
        }
    }

    public synchronized String publicKeySpki() throws GeneralSecurityException {
        ensureKeys();
        return publicKeyFor(DEVICE_ALIAS);
    }

    public synchronized String approvalPublicKeySpki() throws GeneralSecurityException {
        ensureKeys();
        return publicKeyFor(APPROVAL_ALIAS);
    }

    public synchronized String sign(String message) throws GeneralSecurityException {
        ensureKeys();
        return signWith(DEVICE_ALIAS, message);
    }

    public synchronized String signApproval(String message) throws GeneralSecurityException {
        ensureKeys();
        return signWith(APPROVAL_ALIAS, message);
    }

    public synchronized void reset() throws GeneralSecurityException {
        if (keyStore.containsAlias(DEVICE_ALIAS)) keyStore.deleteEntry(DEVICE_ALIAS);
        if (keyStore.containsAlias(APPROVAL_ALIAS)) keyStore.deleteEntry(APPROVAL_ALIAS);
    }

    private void createDeviceKey() throws GeneralSecurityException {
        KeyPairGenerator generator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_RSA, STORE
        );
        KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(
                DEVICE_ALIAS,
                KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY
        )
                .setKeySize(2048)
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
                .setUserAuthenticationRequired(false)
                .build();
        generator.initialize(spec);
        generator.generateKeyPair();
    }

    private void createApprovalKey() throws GeneralSecurityException {
        KeyPairGenerator generator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_RSA, STORE
        );
        KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(
                APPROVAL_ALIAS,
                KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY
        )
                .setKeySize(2048)
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
                .setUserAuthenticationRequired(true)
                .setUserAuthenticationParameters(
                        30,
                        KeyProperties.AUTH_BIOMETRIC_STRONG
                                | KeyProperties.AUTH_DEVICE_CREDENTIAL
                )
                .build();
        generator.initialize(spec);
        generator.generateKeyPair();
    }

    private String publicKeyFor(String alias) throws GeneralSecurityException {
        Certificate certificate = keyStore.getCertificate(alias);
        if (certificate == null) throw new GeneralSecurityException("Clave pública ausente");
        return Base64.encodeToString(certificate.getPublicKey().getEncoded(), Base64.NO_WRAP);
    }

    private String signWith(String alias, String message) throws GeneralSecurityException {
        PrivateKey key = (PrivateKey) keyStore.getKey(alias, null);
        if (key == null) throw new GeneralSecurityException("Clave privada ausente");
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(key);
        signature.update(message.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return Base64.encodeToString(signature.sign(), Base64.NO_WRAP);
    }
}
