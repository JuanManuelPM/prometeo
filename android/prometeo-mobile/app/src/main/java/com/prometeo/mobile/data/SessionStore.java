package com.prometeo.mobile.data;

import android.content.Context;
import android.content.SharedPreferences;

public final class SessionStore {
    private static final String PREFS = "prometeo_mobile_session_v1";
    private static final String KEY_SESSION_ID = "session_id";

    private final SharedPreferences prefs;

    public SessionStore(Context context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public String sessionId() {
        return prefs.getString(KEY_SESSION_ID, "");
    }

    public boolean isPaired() {
        String id = sessionId();
        return id != null && !id.isEmpty();
    }

    public void saveSessionId(String sessionId) {
        prefs.edit().putString(KEY_SESSION_ID, sessionId).apply();
    }

    public void clear() {
        prefs.edit().clear().apply();
    }
}
