package com.prometeo.mobile.security;

import android.app.Activity;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.CancellationSignal;

public final class ApprovalAuthenticator {
    private ApprovalAuthenticator() {}

    public interface Callback {
        void onAuthenticated();
        void onError(String message);
    }

    public static CancellationSignal authenticate(Activity activity, Callback callback) {
        CancellationSignal cancellation = new CancellationSignal();

        BiometricPrompt prompt = new BiometricPrompt.Builder(activity)
                .setTitle("Autorizar acción")
                .setSubtitle("Prometeo va a ejecutar una acción desde este teléfono.")
                .setAllowedAuthenticators(
                        BiometricManager.Authenticators.BIOMETRIC_STRONG
                                | BiometricManager.Authenticators.DEVICE_CREDENTIAL
                )
                .build();

        prompt.authenticate(
                cancellation,
                activity.getMainExecutor(),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(
                            BiometricPrompt.AuthenticationResult result
                    ) {
                        callback.onAuthenticated();
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, CharSequence errString) {
                        callback.onError(errString == null
                                ? "Autorización cancelada"
                                : errString.toString());
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        // The platform keeps the prompt open. No state transition is needed here.
                    }
                }
        );
        return cancellation;
    }
}
