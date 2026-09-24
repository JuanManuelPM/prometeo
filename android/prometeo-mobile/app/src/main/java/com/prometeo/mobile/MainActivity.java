package com.prometeo.mobile;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.text.InputType;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.prometeo.mobile.audio.PlaybackService;
import com.prometeo.mobile.data.PendingActionStore;
import com.prometeo.mobile.data.PrometeoRepository;
import com.prometeo.mobile.data.SessionStore;
import com.prometeo.mobile.data.SnapshotStore;
import com.prometeo.mobile.net.MobileGatewayClient;
import com.prometeo.mobile.security.ApprovalAuthenticator;
import com.prometeo.mobile.security.DeviceIdentity;
import com.prometeo.mobile.ui.BlockRenderer;

import org.json.JSONArray;
import org.json.JSONObject;

import java.security.GeneralSecurityException;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity implements BlockRenderer.Host {
    private static final int WHITE = Color.rgb(245, 245, 245);
    private static final int MUTED = Color.rgb(145, 145, 145);

    private final ExecutorService io = Executors.newSingleThreadExecutor();

    private LinearLayout root;
    private BlockRenderer renderer;
    private DeviceIdentity identity;
    private SessionStore sessions;
    private SnapshotStore snapshots;
    private PendingActionStore pendingActions;
    private MobileGatewayClient gateway;
    private PrometeoRepository repository;

    private JSONObject currentSnapshot;
    private boolean refreshing;
    private boolean hasNetworkSnapshot;
    private int cacheTtlSeconds = 30;
    private CancellationSignal approvalCancellation;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildShell();

        try {
            identity = new DeviceIdentity(this);
            sessions = new SessionStore(this);
            snapshots = new SnapshotStore(this);
            pendingActions = new PendingActionStore(this);
            gateway = new MobileGatewayClient(identity, sessions);
            repository = new PrometeoRepository(gateway, snapshots);
            renderer = new BlockRenderer(this, root, this);
        } catch (Exception e) {
            renderFatal("Android Keystore no está disponible.");
            return;
        }

        if (sessions.isPaired()) {
            showCachedAndRefresh();
        } else {
            renderPairing(null);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (repository == null || sessions == null || !sessions.isPaired()) return;
        if (!refreshing && currentSnapshot != null
                && !snapshots.isFresh(cacheTtlSeconds)) {
            refresh();
        }
    }

    private void buildShell() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.BLACK);

        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.BLACK);

        scroll.addView(root, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        setContentView(scroll);
    }

    private void showCachedAndRefresh() {
        currentSnapshot = repository.cached();
        hasNetworkSnapshot = false;
        if (currentSnapshot != null) {
            cacheTtlSeconds = Math.max(
                    5,
                    currentSnapshot.optInt("cache_ttl_seconds", 30)
            );
            renderSnapshot("local");
        } else {
            renderLoading("Conectando con Prometeo…");
        }
        refresh();
    }

    private void refresh() {
        if (refreshing || repository == null || !sessions.isPaired()) return;
        refreshing = true;

        if (currentSnapshot != null) {
            renderSnapshot(hasNetworkSnapshot ? "refreshing" : "local");
        }

        repository.refresh(new PrometeoRepository.Callback() {
            @Override
            public void onSuccess(JSONObject snapshot) {
                runOnUiThread(() -> {
                    refreshing = false;
                    currentSnapshot = snapshot;
                    hasNetworkSnapshot = true;
                    cacheTtlSeconds = Math.max(
                            5,
                            snapshot.optInt("cache_ttl_seconds", 30)
                    );
                    renderSnapshot("connected");
                });
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> {
                    refreshing = false;
                    JSONObject cached = repository.cached();
                    if (cached != null) {
                        currentSnapshot = cached;
                        renderSnapshot("offline");
                        toast("Sin conexión. Mostrando el último estado.");
                    } else {
                        renderLoading("No pude cargar Prometeo · " + userMessage(error));
                    }
                });
            }
        });
    }

    private void renderSnapshot(String connectionState) {
        if (currentSnapshot == null || renderer == null) return;

        int minVersion = currentSnapshot.optInt("min_app_version_code", 1);
        boolean actionsEnabled = BuildConfig.VERSION_CODE >= minVersion
                && "connected".equals(connectionState);

        renderer.render(
                currentSnapshot,
                connectionState,
                pendingActions.hasPending(),
                actionsEnabled
        );
    }

    private void renderPairing(String error) {
        root.removeAllViews();
        root.setPadding(dp(24), dp(54), dp(24), dp(36));

        TextView title = text("PROMETEO", 34, WHITE, true);
        title.setLetterSpacing(0.09f);
        root.addView(title);

        TextView subtitle = text(
                "Este teléfono todavía no está vinculado.",
                17,
                WHITE,
                true
        );
        LinearLayout.LayoutParams subtitleLp = normal();
        subtitleLp.setMargins(0, dp(24), 0, dp(8));
        root.addView(subtitle, subtitleLp);

        TextView explanation = text(
                "El emparejamiento se hace una sola vez. "
                        + "La clave privada queda dentro de Android Keystore y no se envía a Prometeo.",
                13,
                MUTED,
                false
        );
        explanation.setLineSpacing(0f, 1.18f);
        root.addView(explanation, normal());

        if (!identity.isDeviceSecure()) {
            TextView secure = text(
                    "Para habilitar acciones necesitás PIN, patrón, contraseña o biometría configurada.",
                    13,
                    WHITE,
                    true
            );
            LinearLayout.LayoutParams lp = normal();
            lp.setMargins(0, dp(18), 0, 0);
            root.addView(secure, lp);
        }

        EditText code = new EditText(this);
        code.setHint("Código de emparejamiento");
        code.setHintTextColor(Color.rgb(90, 90, 90));
        code.setTextColor(WHITE);
        code.setSingleLine(true);
        code.setInputType(
                InputType.TYPE_CLASS_TEXT
                        | InputType.TYPE_TEXT_VARIATION_PASSWORD
        );
        code.setBackgroundTintList(ColorStateList.valueOf(WHITE));
        LinearLayout.LayoutParams codeLp = normal();
        codeLp.setMargins(0, dp(30), 0, dp(14));
        root.addView(code, codeLp);

        Button pair = primaryButton("VINCULAR ESTE TELÉFONO");
        pair.setEnabled(identity.isDeviceSecure());
        root.addView(pair, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(58)
        ));

        TextView status = text(error == null ? "" : error, 12, WHITE, false);
        LinearLayout.LayoutParams statusLp = normal();
        statusLp.setMargins(0, dp(14), 0, 0);
        root.addView(status, statusLp);

        pair.setOnClickListener(v -> {
            String pairCode = code.getText().toString().trim();
            if (pairCode.length() < 32) {
                status.setText("El código no es válido.");
                return;
            }

            pair.setEnabled(false);
            code.setEnabled(false);
            status.setText("Vinculando de forma segura…");

            io.execute(() -> {
                try {
                    gateway.pair(pairCode);
                    snapshots.clear();
                    pendingActions.clear();
                    runOnUiThread(() -> {
                        code.setText("");
                        toast("Teléfono vinculado.");
                        showCachedAndRefresh();
                    });
                } catch (Exception e) {
                    runOnUiThread(() -> {
                        pair.setEnabled(true);
                        code.setEnabled(true);
                        status.setText(userMessage(e));
                    });
                }
            });
        });
    }

    private void renderLoading(String message) {
        root.removeAllViews();
        root.setPadding(dp(24), dp(54), dp(24), dp(36));
        TextView title = text("PROMETEO", 34, WHITE, true);
        title.setLetterSpacing(0.09f);
        root.addView(title);

        TextView state = text(message, 14, MUTED, false);
        LinearLayout.LayoutParams lp = normal();
        lp.setMargins(0, dp(26), 0, 0);
        root.addView(state, lp);

        if (sessions != null && sessions.isPaired()) {
            Button retry = primaryButton("REINTENTAR");
            retry.setOnClickListener(v -> refresh());
            LinearLayout.LayoutParams retryLp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    dp(56)
            );
            retryLp.setMargins(0, dp(24), 0, 0);
            root.addView(retry, retryLp);
        }
    }

    private void renderFatal(String message) {
        root.removeAllViews();
        root.setPadding(dp(24), dp(54), dp(24), dp(36));
        root.addView(text("PROMETEO", 34, WHITE, true));
        TextView error = text(message, 14, WHITE, false);
        LinearLayout.LayoutParams lp = normal();
        lp.setMargins(0, dp(24), 0, 0);
        root.addView(error, lp);
    }

    @Override
    public void onRefresh() {
        refresh();
    }

    @Override
    public void onPlayVoice(JSONObject voice) {
        String messageId = voice.optString("message_id", "");
        int partCount = Math.max(1, voice.optInt("part_count", 1));
        String headline = voice.optString("headline", "Estado actual");

        if (messageId.isEmpty()) {
            toast("Todavía no hay voz disponible.");
            return;
        }

        Intent intent = new Intent(this, PlaybackService.class);
        intent.setAction(PlaybackService.ACTION_PLAY_VOICE);
        intent.putExtra(PlaybackService.EXTRA_MESSAGE_ID, messageId);
        intent.putExtra(PlaybackService.EXTRA_PART_COUNT, partCount);
        intent.putExtra(PlaybackService.EXTRA_HEADLINE, headline);

        startForegroundService(intent);
        toast("Preparando voz. Ya podés bloquear la pantalla.");
    }

    @Override
    public void onApplyStrategic(String epochId, List<String> optionIds) {
        if (pendingActions.hasPending()) {
            toast("Primero resolvé la acción pendiente.");
            renderSnapshot("connected");
            return;
        }
        if (epochId == null || epochId.isEmpty() || optionIds == null || optionIds.isEmpty()) {
            return;
        }

        try {
            JSONObject body = new JSONObject();
            body.put("op", "action");
            body.put("action", "strategic_select");
            body.put("actionId", UUID.randomUUID().toString());
            body.put("epochId", epochId);

            JSONArray selected = new JSONArray();
            for (String optionId : optionIds) selected.put(optionId);
            body.put("optionIds", selected);

            pendingActions.save(body.toString());
            renderSnapshot("connected");
            authorizePendingAction();
        } catch (Exception e) {
            toast("No pude preparar la acción.");
        }
    }

    @Override
    public void onRetryPendingAction() {
        authorizePendingAction();
    }

    @Override
    public void onOpenUpdate(JSONObject update) {
        String raw = update == null ? "" : update.optString("update_url", "");
        Uri uri;
        try {
            uri = Uri.parse(raw);
        } catch (Exception e) {
            toast("La dirección de actualización no es válida.");
            return;
        }

        String scheme = uri.getScheme();
        String host = uri.getHost();
        boolean allowed = "https".equalsIgnoreCase(scheme)
                && host != null
                && (
                    "github.com".equalsIgnoreCase(host)
                    || "play.google.com".equalsIgnoreCase(host)
                );

        if (!allowed) {
            toast("Prometeo rechazó un destino de actualización no permitido.");
            return;
        }

        startActivity(new Intent(Intent.ACTION_VIEW, uri));
    }

    private void authorizePendingAction() {
        String pending = pendingActions.load();
        if (pending == null || pending.isEmpty()) {
            pendingActions.clear();
            if (currentSnapshot != null) renderSnapshot("connected");
            return;
        }

        if (approvalCancellation != null) approvalCancellation.cancel();
        approvalCancellation = ApprovalAuthenticator.authenticate(
                this,
                new ApprovalAuthenticator.Callback() {
                    @Override
                    public void onAuthenticated() {
                        sendPendingAction(pending);
                    }

                    @Override
                    public void onError(String message) {
                        toast(message);
                    }
                }
        );
    }

    private void sendPendingAction(String exactBody) {
        io.execute(() -> {
            try {
                MobileGatewayClient.PreparedRequest prepared =
                        gateway.prepareSigned(exactBody);
                String approvalSignature = identity.signApproval(
                        prepared.canonical + "\nAPPROVE"
                );
                gateway.executeJson(prepared, approvalSignature);
                pendingActions.clear();

                runOnUiThread(() -> {
                    toast("Acción aceptada por Prometeo.");
                    refresh();
                });
            } catch (Exception e) {
                if (isDefinitiveActionFailure(e)) {
                    pendingActions.clear();
                }
                runOnUiThread(() -> {
                    toast(userMessage(e));
                    if (currentSnapshot != null) {
                        renderSnapshot(hasNetworkSnapshot ? "connected" : "local");
                    }
                    if (isDefinitiveActionFailure(e)) refresh();
                });
            }
        });
    }

    private boolean isDefinitiveActionFailure(Exception error) {
        if (!(error instanceof MobileGatewayClient.GatewayException)) return false;
        String code = ((MobileGatewayClient.GatewayException) error).code;
        return "STRATEGIC_EPOCH_STALE".equals(code)
                || "OPTION_INVALID".equals(code)
                || "ACTION_ID_INVALID".equals(code);
    }

    private String userMessage(Exception error) {
        if (error instanceof MobileGatewayClient.GatewayException) {
            String code = ((MobileGatewayClient.GatewayException) error).code;
            switch (code) {
                case "PAIR_INVALID_OR_EXPIRED":
                    return "El código de emparejamiento venció o ya fue usado.";
                case "OWNER_NOT_READY":
                    return "El propietario de Prometeo todavía no está preparado para vincular dispositivos.";
                case "DEVICE_EXPIRED":
                case "SIGNATURE_INVALID":
                    return "El vínculo de este teléfono ya no es válido.";
                case "REPLAY":
                    return "La petición ya fue recibida. Actualizando estado.";
                case "STRATEGIC_EPOCH_STALE":
                    return "La decisión cambió mientras estabas confirmando. Actualicé el estado.";
                case "OPTION_INVALID":
                    return "Una opción ya no está disponible.";
                case "APPROVAL_REQUIRED":
                    return "La acción necesita autorización del teléfono.";
                default:
                    return "Prometeo respondió: " + code;
            }
        }

        String message = error.getMessage();
        if (message == null || message.trim().isEmpty()) {
            return "No se pudo completar la operación.";
        }
        return message.length() > 120
                ? message.substring(0, 120)
                : message;
    }

    private Button primaryButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextColor(Color.BLACK);
        button.setTextSize(14);
        button.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        button.setBackgroundTintList(ColorStateList.valueOf(WHITE));
        return button;
    }

    private TextView text(
            String value,
            int size,
            int color,
            boolean bold
    ) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        return view;
    }

    private LinearLayout.LayoutParams normal() {
        return new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onDestroy() {
        if (approvalCancellation != null) approvalCancellation.cancel();
        if (repository != null) repository.shutdown();
        io.shutdownNow();
        super.onDestroy();
    }
}
