package com.prometeo.mobile.audio;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

import com.prometeo.mobile.data.SessionStore;
import com.prometeo.mobile.net.MobileGatewayClient;
import com.prometeo.mobile.security.DeviceIdentity;

import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

public final class PlaybackService extends MediaSessionService {
    public static final String ACTION_PLAY_VOICE =
            "com.prometeo.mobile.PLAY_VOICE";
    public static final String ACTION_TOGGLE =
            "com.prometeo.mobile.TOGGLE";

    public static final String EXTRA_FIRST_URI = "first_uri";
    public static final String EXTRA_MESSAGE_ID = "message_id";
    public static final String EXTRA_PART_COUNT = "part_count";
    public static final String EXTRA_HEADLINE = "headline";

    private ExoPlayer player;
    private MediaSession mediaSession;
    private VoiceAudioRepository audioRepository;
    private final ExecutorService loader = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private final AtomicInteger generation = new AtomicInteger();

    @Override
    public void onCreate() {
        super.onCreate();

        AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_SPEECH)
                .build();

        player = new ExoPlayer.Builder(this)
                .setWakeMode(C.WAKE_MODE_LOCAL)
                .build();
        player.setAudioAttributes(attributes, true);
        player.setHandleAudioBecomingNoisy(true);

        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (playbackState == Player.STATE_ENDED) {
                    int expected = generation.get();
                    main.postDelayed(() -> {
                        if (generation.get() == expected
                                && player != null
                                && player.getPlaybackState() == Player.STATE_ENDED) {
                            stopSelf();
                        }
                    }, 30_000L);
                }
            }
        });

        mediaSession = new MediaSession.Builder(this, player).build();

        try {
            DeviceIdentity identity = new DeviceIdentity(this);
            SessionStore sessions = new SessionStore(this);
            MobileGatewayClient gateway =
                    new MobileGatewayClient(identity, sessions);
            audioRepository = new VoiceAudioRepository(this, gateway);
        } catch (Exception e) {
            audioRepository = null;
        }
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        int result = super.onStartCommand(intent, flags, startId);
        if (intent == null || intent.getAction() == null) return result;

        if (ACTION_TOGGLE.equals(intent.getAction())) {
            if (player.isPlaying()) player.pause();
            else if (player.getMediaItemCount() > 0) player.play();
            return result;
        }

        if (ACTION_PLAY_VOICE.equals(intent.getAction())) {
            String firstUri = intent.getStringExtra(EXTRA_FIRST_URI);
            String messageId = intent.getStringExtra(EXTRA_MESSAGE_ID);
            String headline = intent.getStringExtra(EXTRA_HEADLINE);
            int partCount = Math.max(1, intent.getIntExtra(EXTRA_PART_COUNT, 1));

            if (firstUri != null && messageId != null) {
                playVoice(firstUri, messageId, headline, partCount);
            }
        }
        return result;
    }

    private void playVoice(
            String firstUri,
            String messageId,
            String headline,
            int partCount
    ) {
        int run = generation.incrementAndGet();
        String title = headline == null || headline.isEmpty()
                ? "Estado actual"
                : headline;

        player.setMediaItem(item(Uri.parse(firstUri), title, 0));
        player.prepare();
        player.play();

        if (partCount <= 1 || audioRepository == null) return;

        loader.execute(() -> {
            for (int part = 1; part < partCount; part++) {
                if (generation.get() != run) return;
                try {
                    File file = audioRepository.getOrDownload(messageId, part);
                    int currentPart = part;
                    main.post(() -> {
                        if (generation.get() == run && player != null) {
                            player.addMediaItem(item(
                                    Uri.fromFile(file),
                                    title,
                                    currentPart
                            ));
                        }
                    });
                } catch (Exception ignored) {
                    return;
                }
            }
        });
    }

    private static MediaItem item(Uri uri, String headline, int part) {
        MediaMetadata metadata = new MediaMetadata.Builder()
                .setTitle("Prometeo · Voz")
                .setArtist(headline)
                .setSubtitle("Parte " + (part + 1))
                .build();

        return new MediaItem.Builder()
                .setMediaId("prometeo-voice-part-" + part)
                .setUri(uri)
                .setMediaMetadata(metadata)
                .build();
    }

    @Override
    public @Nullable MediaSession onGetSession(
            MediaSession.ControllerInfo controllerInfo
    ) {
        return mediaSession;
    }

    @Override
    public void onDestroy() {
        generation.incrementAndGet();
        loader.shutdownNow();

        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        if (player != null) {
            player.release();
            player = null;
        }
        super.onDestroy();
    }
}
