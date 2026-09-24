package com.prometeo.voice;

import android.content.Intent;
import android.net.Uri;

import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

import java.util.ArrayList;
import java.util.List;

public final class PlaybackService extends MediaSessionService {
    public static final String ACTION_PLAY = "com.prometeo.voice.PLAY";
    public static final String ACTION_TOGGLE = "com.prometeo.voice.TOGGLE";
    public static final String EXTRA_URIS = "uris";
    public static final String EXTRA_TITLE = "title";

    private ExoPlayer player;
    private MediaSession mediaSession;

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

        mediaSession = new MediaSession.Builder(this, player).build();
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        int result = super.onStartCommand(intent, flags, startId);
        if (intent == null || intent.getAction() == null) return result;

        if (ACTION_PLAY.equals(intent.getAction())) {
            ArrayList<String> uris = intent.getStringArrayListExtra(EXTRA_URIS);
            String title = intent.getStringExtra(EXTRA_TITLE);
            if (title == null || title.isBlank()) title = "Estado actual";
            if (uris != null && !uris.isEmpty()) playUris(uris, title);
        } else if (ACTION_TOGGLE.equals(intent.getAction())) {
            if (player.isPlaying()) player.pause();
            else if (player.getMediaItemCount() > 0) player.play();
        }
        return result;
    }

    private void playUris(List<String> uris, String title) {
        ArrayList<MediaItem> items = new ArrayList<>();
        MediaMetadata metadata = new MediaMetadata.Builder()
                .setTitle("Prometeo · Voz")
                .setArtist(title)
                .build();

        for (int i = 0; i < uris.size(); i++) {
            MediaItem item = new MediaItem.Builder()
                    .setMediaId("prometeo-voice-" + i)
                    .setUri(Uri.parse(uris.get(i)))
                    .setMediaMetadata(metadata)
                    .build();
            items.add(item);
        }

        player.setMediaItems(items);
        player.prepare();
        player.play();
    }

    @Override
    public @Nullable MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onDestroy() {
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
