package ar.prometeo.kindlebridge;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import com.jcraft.jsch.ChannelExec;
import com.jcraft.jsch.ChannelSftp;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.KeyPair;
import com.jcraft.jsch.Session;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Properties;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class MainActivity extends Activity {
    private static final int SSH_PORT = 2222;
    private static final String REMOTE_INSTALLER = "/mnt/us/documents/PROMETEO_KINDLE_INSTALL.sh";
    private static final String VERIFY_MARKER = "__PROMETEO_KINDLE__";

    private TextView state;
    private TextView detail;
    private Button action;
    private volatile boolean busy = false;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        setContentView(buildUi());
    }

    private View buildUi() {
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.WHITE);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int p = dp(24);
        root.setPadding(p, dp(30), p, dp(30));
        scroll.addView(root, new ScrollView.LayoutParams(-1, -1));

        TextView eyebrow = text("PROMETEO / BRIDGE", 12, Typeface.BOLD);
        eyebrow.setLetterSpacing(.16f);
        root.addView(eyebrow);

        TextView title = text("Un botón.\nEl Kindle queda listo.", 40, Typeface.BOLD);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(-1, -2);
        titleLp.topMargin = dp(34);
        root.addView(title, titleLp);

        TextView intro = text("No necesitás IP, SFTP, rutas ni comandos. Bridge encuentra KOReader por Wi‑Fi, instala Prometeo, verifica el resultado y prepara una clave segura para futuras conexiones.", 16, Typeface.NORMAL);
        intro.setLineSpacing(0, 1.25f);
        LinearLayout.LayoutParams introLp = new LinearLayout.LayoutParams(-1, -2);
        introLp.topMargin = dp(18);
        root.addView(intro, introLp);

        View line = new View(this);
        line.setBackgroundColor(Color.BLACK);
        LinearLayout.LayoutParams lineLp = new LinearLayout.LayoutParams(-1, dp(2));
        lineLp.topMargin = dp(34);
        root.addView(line, lineLp);

        state = text("LISTO PARA BUSCAR", 13, Typeface.BOLD);
        LinearLayout.LayoutParams stateLp = new LinearLayout.LayoutParams(-1, -2);
        stateLp.topMargin = dp(20);
        root.addView(state, stateLp);

        detail = text("Kindle: Wi‑Fi + KOReader → SSH server → Login without password. Después, tocá el botón.", 14, Typeface.NORMAL);
        detail.setLineSpacing(0, 1.25f);
        LinearLayout.LayoutParams detailLp = new LinearLayout.LayoutParams(-1, -2);
        detailLp.topMargin = dp(10);
        root.addView(detail, detailLp);

        action = new Button(this);
        action.setText("ENCONTRAR E INSTALAR");
        action.setTextSize(15);
        action.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        action.setTextColor(Color.WHITE);
        action.setBackgroundColor(Color.BLACK);
        action.setAllCaps(false);
        action.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(-1, dp(62));
        btnLp.topMargin = dp(26);
        root.addView(action, btnLp);
        action.setOnClickListener(v -> startInstall());

        TextView foot = text("La app no usa Internet para instalar el paquete: el instalador viene adentro del APK. Sólo usa tu red local para hablar con el Kindle.", 12, Typeface.NORMAL);
        foot.setAlpha(.58f);
        foot.setLineSpacing(0, 1.2f);
        LinearLayout.LayoutParams footLp = new LinearLayout.LayoutParams(-1, -2);
        footLp.topMargin = dp(28);
        root.addView(foot, footLp);
        return scroll;
    }

    private TextView text(String value, int sp, int style) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextColor(Color.BLACK);
        t.setTextSize(sp);
        t.setTypeface(Typeface.create("sans", style));
        return t;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void startInstall() {
        if (busy) return;
        busy = true;
        action.setEnabled(false);
        worker.execute(() -> {
            try {
                ui("BUSCANDO KINDLE", "Escaneando la red local. No tenés que buscar ninguna IP.");
                String prefix = localPrefix();
                if (prefix == null) throw new Exception("No encontré una red Wi‑Fi activa. Conectá celular y Kindle a la misma Wi‑Fi.");

                List<String> hosts = scan(prefix);
                if (hosts.isEmpty()) throw new Exception("No apareció ningún SSH de KOReader. En el Kindle activá SSH server + Login without password.");

                Session session = null;
                for (String candidate : hosts) {
                    Session s = null;
                    try {
                        s = connect(candidate);
                        ExecResult r = exec(s, "if [ -d /mnt/us/documents ] && [ -d /mnt/us/koreader ]; then echo " + VERIFY_MARKER + "; uname -m; fi");
                        if (r.output.contains(VERIFY_MARKER)) {
                            session = s;
                            break;
                        }
                    } catch (Exception ignored) {
                    }
                    if (s != null) s.disconnect();
                }
                if (session == null) throw new Exception("Encontré SSH, pero no un Kindle con KOReader. Revisá que el servidor SSH de KOReader esté encendido.");

                ui("KINDLE ENCONTRADO", "Conectado. Instalando y verificando automáticamente…");
                byte[] installer = readAsset("PROMETEO_KINDLE_INSTALL.sh");
                upload(session, installer, REMOTE_INSTALLER);

                String localHash = sha256(installer);
                ExecResult remoteHash = exec(session, "if command -v sha256sum >/dev/null 2>&1; then sha256sum " + REMOTE_INSTALLER + " | awk '{print $1}'; else wc -c < " + REMOTE_INSTALLER + "; fi");
                if (remoteHash.output.trim().length() == 64 && !remoteHash.output.trim().equalsIgnoreCase(localHash)) {
                    throw new Exception("La verificación del instalador no coincidió. No ejecuté nada.");
                }

                ExecResult install = exec(session, "PROMETEO_BRIDGE=1 /bin/sh " + REMOTE_INSTALLER + " 2>&1; rc=$?; echo __PROMETEO_RC__=$rc");
                if (!install.output.contains("__PROMETEO_RC__=0")) {
                    throw new Exception("El instalador devolvió error. " + compact(install.output));
                }

                ExecResult verify = exec(session, "if [ -x /mnt/us/documents/PROMETEO.sh ] && [ -f /mnt/us/documents/PROMETEO_APP/install.ok ]; then printf '__PROMETEO_OK__ '; cat /mnt/us/documents/PROMETEO_APP/VERSION; fi");
                if (!verify.output.contains("__PROMETEO_OK__")) throw new Exception("La instalación terminó, pero la verificación final no pasó.");

                try {
                    provisionKey(session);
                } catch (Exception keyError) {
                    // Installation is complete even if future key provisioning fails.
                }

                ui("INSTALADO", "Prometeo quedó instalado y verificado. Estoy abriéndolo en el Kindle…");
                try {
                    exec(session, "(sleep 1; /mnt/us/documents/PROMETEO.sh >/dev/null 2>&1 </dev/null &) >/dev/null 2>&1; echo launched");
                } catch (Exception ignored) {
                }
                session.disconnect();

                final String successDetail = "Listo. Ya no necesitás IP, archivos ni comandos. Si querés cerrar el bootstrap de forma segura, podés apagar ‘Login without password’ en KOReader; Bridge ya dejó una clave local preparada para futuras conexiones.";
                runOnUiThread(() -> {
                    state.setText("✓ PROMETEO LISTO");
                    detail.setText(successDetail);
                    action.setText("INSTALADO");
                    action.setEnabled(false);
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    state.setText("NO PUDE TERMINAR");
                    detail.setText(e.getMessage());
                    action.setText("REINTENTAR");
                    action.setEnabled(true);
                });
            } finally {
                busy = false;
            }
        });
    }

    private void ui(String s, String d) {
        runOnUiThread(() -> { state.setText(s); detail.setText(d); });
    }

    private String localPrefix() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        Network active = cm.getActiveNetwork();
        if (active != null) {
            LinkProperties props = cm.getLinkProperties(active);
            if (props != null) {
                for (LinkAddress la : props.getLinkAddresses()) {
                    InetAddress a = la.getAddress();
                    if (a instanceof Inet4Address && !a.isLoopbackAddress()) {
                        byte[] b = a.getAddress();
                        int first = b[0] & 255;
                        if (first == 10 || first == 192 || (first == 172 && (b[1] & 255) >= 16 && (b[1] & 255) <= 31)) {
                            return (b[0] & 255) + "." + (b[1] & 255) + "." + (b[2] & 255) + ".";
                        }
                    }
                }
            }
        }
        return null;
    }

    private List<String> scan(String prefix) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(48);
        CountDownLatch latch = new CountDownLatch(254);
        ConcurrentLinkedQueue<String> found = new ConcurrentLinkedQueue<>();
        for (int i = 1; i <= 254; i++) {
            final String host = prefix + i;
            pool.execute(() -> {
                try (Socket socket = new Socket()) {
                    socket.connect(new InetSocketAddress(host, SSH_PORT), 320);
                    found.add(host);
                } catch (Exception ignored) {
                } finally {
                    latch.countDown();
                }
            });
        }
        latch.await(5, TimeUnit.SECONDS);
        pool.shutdownNow();
        return new ArrayList<>(found);
    }

    private Session connect(String host) throws Exception {
        JSch jsch = new JSch();
        File key = new File(getFilesDir(), "prometeo_bridge_ecdsa");
        if (key.isFile()) {
            try { jsch.addIdentity(key.getAbsolutePath()); } catch (Exception ignored) { }
        }
        Session session = jsch.getSession("root", host, SSH_PORT);
        session.setPassword("prometeo");
        Properties cfg = new Properties();
        cfg.put("StrictHostKeyChecking", "no");
        cfg.put("PreferredAuthentications", "publickey,password,none");
        cfg.put("server_host_key", "ssh-ed25519,ecdsa-sha2-nistp256,rsa-sha2-512,rsa-sha2-256,ssh-rsa");
        session.setConfig(cfg);
        session.connect(3200);
        return session;
    }

    private void upload(Session session, byte[] bytes, String remote) throws Exception {
        try {
            ChannelSftp sftp = (ChannelSftp) session.openChannel("sftp");
            sftp.connect(3000);
            sftp.put(new ByteArrayInputStream(bytes), remote);
            try { sftp.chmod(0755, remote); } catch (Exception ignored) { }
            sftp.disconnect();
            return;
        } catch (Exception ignored) {
            // Some Dropbear builds omit SFTP. Fall back to streaming over an exec channel.
        }
        ExecResult r = execWithInput(session, "cat > " + remote + " && chmod 755 " + remote, bytes);
        if (r.exitCode != 0) throw new Exception("No pude transferir el instalador al Kindle.");
    }

    private void provisionKey(Session session) throws Exception {
        File privateKey = new File(getFilesDir(), "prometeo_bridge_ecdsa");
        ByteArrayOutputStream pub = new ByteArrayOutputStream();
        if (!privateKey.isFile()) {
            JSch jsch = new JSch();
            KeyPair kp = KeyPair.genKeyPair(jsch, KeyPair.ECDSA, 256);
            try (FileOutputStream out = new FileOutputStream(privateKey)) {
                kp.writePrivateKey(out);
            }
            kp.writePublicKey(pub, "prometeo-bridge");
            kp.dispose();
        } else {
            JSch jsch = new JSch();
            KeyPair kp = KeyPair.load(jsch, privateKey.getAbsolutePath());
            kp.writePublicKey(pub, "prometeo-bridge");
            kp.dispose();
        }
        byte[] publicKey = pub.toByteArray();
        String dir = "/mnt/us/koreader/settings/SSH";
        String path = dir + "/authorized_keys";
        exec(session, "mkdir -p " + dir + "; touch " + path + "; grep -v 'prometeo-bridge' " + path + " > " + path + ".prometeo 2>/dev/null || true; mv " + path + ".prometeo " + path + "; chmod 600 " + path);
        ExecResult append = execWithInput(session, "cat >> " + path + "; chmod 600 " + path, publicKey);
        if (append.exitCode != 0) throw new Exception("No pude preparar la clave futura.");
    }

    private byte[] readAsset(String name) throws Exception {
        try (InputStream in = getAssets().open(name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) >= 0) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }

    private ExecResult exec(Session session, String command) throws Exception {
        ChannelExec ch = (ChannelExec) session.openChannel("exec");
        ch.setCommand(command);
        ch.setInputStream(null);
        ByteArrayOutputStream err = new ByteArrayOutputStream();
        ch.setErrStream(err);
        InputStream in = ch.getInputStream();
        ch.connect(3000);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        long deadline = System.currentTimeMillis() + 25000;
        while (true) {
            while (in.available() > 0) {
                int n = in.read(buf);
                if (n < 0) break;
                out.write(buf, 0, n);
            }
            if (ch.isClosed()) break;
            if (System.currentTimeMillis() > deadline) { ch.disconnect(); throw new Exception("El Kindle tardó demasiado en responder."); }
            Thread.sleep(35);
        }
        int code = ch.getExitStatus();
        ch.disconnect();
        String all = out.toString("UTF-8") + err.toString("UTF-8");
        return new ExecResult(code, all);
    }

    private ExecResult execWithInput(Session session, String command, byte[] input) throws Exception {
        ChannelExec ch = (ChannelExec) session.openChannel("exec");
        ch.setCommand(command);
        ch.setInputStream(new ByteArrayInputStream(input));
        ByteArrayOutputStream err = new ByteArrayOutputStream();
        ch.setErrStream(err);
        InputStream in = ch.getInputStream();
        ch.connect(3000);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        long deadline = System.currentTimeMillis() + 25000;
        while (true) {
            while (in.available() > 0) {
                int n = in.read(buf);
                if (n < 0) break;
                out.write(buf, 0, n);
            }
            if (ch.isClosed()) break;
            if (System.currentTimeMillis() > deadline) { ch.disconnect(); throw new Exception("La transferencia tardó demasiado."); }
            Thread.sleep(35);
        }
        int code = ch.getExitStatus();
        ch.disconnect();
        return new ExecResult(code, out.toString("UTF-8") + err.toString("UTF-8"));
    }

    private String sha256(byte[] bytes) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format(Locale.US, "%02x", b & 255));
        return sb.toString();
    }

    private String compact(String input) {
        if (input == null) return "";
        String s = input.replace('\n', ' ').replace('\r', ' ').trim();
        return s.length() > 180 ? s.substring(0, 180) + "…" : s;
    }

    @Override
    protected void onDestroy() {
        worker.shutdownNow();
        super.onDestroy();
    }

    private static class ExecResult {
        final int exitCode;
        final String output;
        ExecResult(int exitCode, String output) { this.exitCode = exitCode; this.output = output; }
    }
}
