package com.prometeo.mobile.ui;

import android.app.Activity;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Space;
import android.widget.TextView;

import com.prometeo.mobile.BuildConfig;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public final class BlockRenderer {
    private static final int WHITE = Color.rgb(245, 245, 245);
    private static final int MUTED = Color.rgb(155, 155, 155);
    private static final int DIM = Color.rgb(95, 95, 95);
    private static final int LINE = Color.rgb(42, 42, 42);

    public interface Host {
        void onRefresh();
        void onPlayVoice(JSONObject voice);
        void onApplyStrategic(String epochId, List<String> optionIds);
        void onRetryPendingAction();
    }

    private final Activity activity;
    private final LinearLayout root;
    private final Host host;

    public BlockRenderer(Activity activity, LinearLayout root, Host host) {
        this.activity = activity;
        this.root = root;
        this.host = host;
    }

    public void render(
            JSONObject snapshot,
            String connectionState,
            boolean pendingAction,
            boolean actionsEnabled
    ) {
        root.removeAllViews();
        root.setPadding(dp(20), dp(18), dp(20), dp(40));
        root.setBackgroundColor(Color.BLACK);

        renderHeader(snapshot, connectionState);

        if (pendingAction) {
            sectionLabel("ACCIÓN PENDIENTE");
            TextView pending = body(
                    "Hay una acción ya identificada que todavía no tiene recibo local. "
                            + "Reintentar usa el mismo ID y no la duplica."
            );
            root.addView(pending);
            Button retry = actionButton("AUTORIZAR Y REINTENTAR");
            retry.setOnClickListener(v -> host.onRetryPendingAction());
            root.addView(retry, buttonParams());
            separator();
        }

        int minVersion = snapshot.optInt("min_app_version_code", 1);
        if (BuildConfig.VERSION_CODE < minVersion) {
            sectionLabel("ACTUALIZACIÓN REQUERIDA");
            root.addView(body(
                    "Esta versión puede mostrar el último estado local, "
                            + "pero las acciones están deshabilitadas hasta actualizar."
            ));
            separator();
        }

        JSONObject home = snapshot.optJSONObject("home");
        JSONArray blocks = snapshot.optJSONArray("blocks");
        if (home == null || blocks == null) {
            root.addView(body("El snapshot no contiene una superficie compatible."));
            renderFooter(snapshot);
            return;
        }

        for (int i = 0; i < blocks.length(); i++) {
            JSONObject block = blocks.optJSONObject(i);
            if (block == null) continue;
            String type = block.optString("type", "");

            switch (type) {
                case "voice":
                    renderVoice(home.optJSONObject("voice"));
                    break;
                case "run_status":
                    renderRun(home.optJSONObject("world"));
                    break;
                case "strategic_choices":
                    renderStrategic(home.optJSONObject("strategic"), actionsEnabled);
                    break;
                default:
                    // Forward compatibility: unknown native blocks are ignored safely.
                    break;
            }
        }

        renderFooter(snapshot);
    }

    private void renderHeader(JSONObject snapshot, String connectionState) {
        LinearLayout row = new LinearLayout(activity);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = text("PROMETEO", 28, WHITE, true);
        title.setLetterSpacing(0.08f);
        row.addView(title, new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f
        ));

        Button refresh = compactButton("↻");
        refresh.setContentDescription("Actualizar");
        refresh.setOnClickListener(v -> host.onRefresh());
        row.addView(refresh, new LinearLayout.LayoutParams(dp(52), dp(46)));

        root.addView(row);

        String generated = snapshot.optString("generated_at", "");
        String stateText;
        int stateColor = MUTED;
        if ("offline".equals(connectionState)) {
            stateText = "OFFLINE · ÚLTIMO ESTADO";
            stateColor = WHITE;
        } else if ("local".equals(connectionState)) {
            stateText = "LOCAL · ACTUALIZANDO";
        } else if ("refreshing".equals(connectionState)) {
            stateText = "CONECTADO · ACTUALIZANDO";
        } else {
            stateText = "CONECTADO · " + shortTime(generated);
        }
        TextView state = text(stateText, 11, stateColor, true);
        state.setLetterSpacing(0.08f);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        sp.setMargins(0, dp(5), 0, dp(26));
        root.addView(state, sp);
    }

    private void renderVoice(JSONObject voice) {
        if (voice == null) return;
        sectionLabel("VOZ");

        TextView headline = text(
                voice.optString("headline", "Estado actual"),
                22,
                WHITE,
                true
        );
        root.addView(headline);

        int parts = Math.max(1, voice.optInt("part_count", 1));
        TextView meta = text(
                parts == 1 ? "1 PARTE" : parts + " PARTES",
                10,
                MUTED,
                true
        );
        LinearLayout.LayoutParams metaLp = normalParams();
        metaLp.setMargins(0, dp(7), 0, dp(12));
        root.addView(meta, metaLp);

        Button play = actionButton("▶  ESCUCHAR");
        play.setOnClickListener(v -> host.onPlayVoice(voice));
        root.addView(play, buttonParams());

        String fullText = voice.optString("text", "");
        if (!fullText.isEmpty()) {
            TextView copy = body(fullText);
            copy.setMaxLines(5);
            copy.setEllipsize(TextUtils.TruncateAt.END);

            LinearLayout.LayoutParams copyLp = normalParams();
            copyLp.setMargins(0, dp(16), 0, 0);
            root.addView(copy, copyLp);

            Button expand = textButton("VER TEXTO");
            expand.setOnClickListener(v -> {
                boolean collapsed = copy.getMaxLines() == 5;
                copy.setMaxLines(collapsed ? Integer.MAX_VALUE : 5);
                copy.setEllipsize(collapsed ? null : TextUtils.TruncateAt.END);
                expand.setText(collapsed ? "OCULTAR TEXTO" : "VER TEXTO");
            });
            root.addView(expand, new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    dp(42)
            ));
        }
        separator();
    }

    private void renderRun(JSONObject world) {
        if (world == null) return;
        JSONObject run = world.optJSONObject("run");
        if (run == null) return;

        sectionLabel("TRABAJO ACTUAL");

        String id = run.optString("id", "");
        String status = run.optString("status", "");
        root.addView(text(status + (id.isEmpty() ? "" : " · " + id), 12, MUTED, true));

        String objective = run.optString("objective", "");
        if (!objective.isEmpty()) {
            LinearLayout.LayoutParams objectiveLp = normalParams();
            objectiveLp.setMargins(0, dp(10), 0, dp(14));
            root.addView(body(objective), objectiveLp);
        }

        int progress = Math.max(0, Math.min(100, run.optInt("completion_ratio", 0)));
        ProgressBar bar = new ProgressBar(
                activity,
                null,
                android.R.attr.progressBarStyleHorizontal
        );
        bar.setMax(100);
        bar.setProgress(progress);
        bar.setProgressTintList(ColorStateList.valueOf(WHITE));
        bar.setProgressBackgroundTintList(ColorStateList.valueOf(LINE));
        root.addView(bar, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(8)
        ));

        JSONObject counts = run.optJSONObject("counts");
        if (counts != null) {
            String line = progress + "% · "
                    + counts.optInt("done", 0) + "/" + counts.optInt("total", 0)
                    + " DONE · "
                    + counts.optInt("active", 0) + " ACTIVE · "
                    + counts.optInt("blocked", 0) + " BLOCKED";
            LinearLayout.LayoutParams lp = normalParams();
            lp.setMargins(0, dp(8), 0, 0);
            root.addView(text(line, 11, MUTED, true), lp);
        }

        JSONObject product = world.optJSONObject("product");
        if (product != null) {
            JSONObject percentage = product.optJSONObject("percentage");
            if (percentage != null) {
                String display = percentage.optString(
                        "display",
                        Integer.toString(percentage.optInt("display", 0))
                );
                LinearLayout.LayoutParams lp = normalParams();
                lp.setMargins(0, dp(14), 0, 0);
                root.addView(
                        text("PRODUCTO VERIFICADO · " + display + "%", 11, WHITE, true),
                        lp
                );
            }
        }
        separator();
    }

    private void renderStrategic(JSONObject strategic, boolean actionsEnabled) {
        if (strategic == null) return;
        sectionLabel("DECISIONES");

        String headline = strategic.optString("headline", "");
        if (!headline.isEmpty()) root.addView(text(headline, 19, WHITE, true));

        String brief = strategic.optString("brief", "");
        if (!brief.isEmpty()) {
            LinearLayout.LayoutParams lp = normalParams();
            lp.setMargins(0, dp(10), 0, dp(15));
            root.addView(body(brief), lp);
        }

        JSONArray options = strategic.optJSONArray("options");
        if (options == null || options.length() == 0) return;

        List<CheckBox> checks = new ArrayList<>();
        List<String> ids = new ArrayList<>();

        for (int i = 0; i < options.length(); i++) {
            JSONObject option = options.optJSONObject(i);
            if (option == null) continue;

            String id = option.optString("id", "");
            if (id.isEmpty()) continue;

            CheckBox check = new CheckBox(activity);
            check.setText(option.optString("label", id));
            check.setTextColor(WHITE);
            check.setTextSize(15);
            check.setButtonTintList(ColorStateList.valueOf(WHITE));
            check.setPadding(0, dp(8), 0, dp(3));
            check.setEnabled(actionsEnabled);
            root.addView(check, normalParams());

            String why = option.optString("why", "");
            if (!why.isEmpty()) {
                TextView whyView = text(why, 12, MUTED, false);
                whyView.setPadding(dp(36), 0, 0, dp(8));
                root.addView(whyView, normalParams());
            }

            checks.add(check);
            ids.add(id);
        }

        Button apply = actionButton(
                actionsEnabled ? "AUTORIZAR Y APLICAR" : "ACTUALIZACIÓN REQUERIDA"
        );
        apply.setEnabled(actionsEnabled);
        apply.setOnClickListener(v -> {
            List<String> selected = new ArrayList<>();
            for (int i = 0; i < checks.size(); i++) {
                if (checks.get(i).isChecked()) selected.add(ids.get(i));
            }
            if (!selected.isEmpty()) {
                host.onApplyStrategic(
                        strategic.optString("epoch_id", ""),
                        selected
                );
            }
        });

        LinearLayout.LayoutParams applyLp = buttonParams();
        applyLp.setMargins(0, dp(10), 0, 0);
        root.addView(apply, applyLp);
        separator();
    }

    private void renderFooter(JSONObject snapshot) {
        Space space = new Space(activity);
        root.addView(space, new LinearLayout.LayoutParams(1, dp(16)));

        String footer = "APP " + BuildConfig.VERSION_NAME
                + " · PROTOCOLO " + snapshot.optInt("contract_version", 0);
        root.addView(text(footer, 10, DIM, true));
    }

    private void sectionLabel(String label) {
        TextView view = text(label, 10, MUTED, true);
        view.setLetterSpacing(0.14f);
        LinearLayout.LayoutParams lp = normalParams();
        lp.setMargins(0, 0, 0, dp(12));
        root.addView(view, lp);
    }

    private void separator() {
        View line = new View(activity);
        line.setBackgroundColor(LINE);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                1
        );
        lp.setMargins(0, dp(24), 0, dp(24));
        root.addView(line, lp);
    }

    private TextView body(String value) {
        TextView view = text(value, 14, WHITE, false);
        view.setLineSpacing(0f, 1.18f);
        return view;
    }

    private TextView text(
            String value,
            int size,
            int color,
            boolean bold
    ) {
        TextView view = new TextView(activity);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) {
            view.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        }
        return view;
    }

    private Button actionButton(String label) {
        Button button = new Button(activity);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextColor(Color.BLACK);
        button.setTextSize(14);
        button.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        button.setBackgroundTintList(ColorStateList.valueOf(WHITE));
        return button;
    }

    private Button compactButton(String label) {
        Button button = new Button(activity);
        button.setText(label);
        button.setTextSize(20);
        button.setTextColor(WHITE);
        button.setBackgroundTintList(ColorStateList.valueOf(Color.BLACK));
        button.setPadding(0, 0, 0, 0);
        return button;
    }

    private Button textButton(String label) {
        Button button = compactButton(label);
        button.setTextSize(10);
        button.setAllCaps(false);
        button.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
        return button;
    }

    private LinearLayout.LayoutParams normalParams() {
        return new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
    }

    private LinearLayout.LayoutParams buttonParams() {
        return new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(56)
        );
    }

    private String shortTime(String raw) {
        if (raw == null || raw.length() < 16) return "ACTUALIZADO";
        try {
            java.time.Instant instant = java.time.Instant.parse(raw);
            return java.time.format.DateTimeFormatter
                    .ofPattern("'ACTUALIZADO' HH:mm")
                    .withZone(java.time.ZoneId.systemDefault())
                    .format(instant);
        } catch (Exception ignored) {
            return "ACTUALIZADO";
        }
    }

    private int dp(int value) {
        return Math.round(
                value * activity.getResources().getDisplayMetrics().density
        );
    }
}
