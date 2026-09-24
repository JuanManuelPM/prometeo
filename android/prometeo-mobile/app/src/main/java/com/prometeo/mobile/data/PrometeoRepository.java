package com.prometeo.mobile.data;

import com.prometeo.mobile.net.MobileGatewayClient;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class PrometeoRepository {
    private final MobileGatewayClient gateway;
    private final SnapshotStore store;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public interface Callback {
        void onSuccess(JSONObject snapshot);
        void onError(Exception error);
    }

    public PrometeoRepository(
            MobileGatewayClient gateway,
            SnapshotStore store
    ) {
        this.gateway = gateway;
        this.store = store;
    }

    public JSONObject cached() {
        return store.load();
    }

    public boolean isCacheFresh(int ttlSeconds) {
        return store.isFresh(ttlSeconds);
    }

    public void refresh(Callback callback) {
        executor.execute(() -> {
            try {
                JSONObject snapshot = gateway.bootstrap();
                if (!MobileGatewayClient.CONTRACT.equals(
                        snapshot.optString("schema", "")
                )) {
                    throw new IllegalStateException("Contrato móvil inesperado");
                }
                store.save(snapshot);
                callback.onSuccess(snapshot);
            } catch (Exception e) {
                callback.onError(e);
            }
        });
    }

    public void shutdown() {
        executor.shutdownNow();
    }
}
