import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(URL, SERVICE, { auth: { persistSession: false } });
const CALLBACK = `${URL}/functions/v1/creator-google-oauth/callback`;

function redirect(to: string, key: string, value: string) {
  const u = new URL(to || "https://juanmanuelpm.github.io/prometeo/pages/lab/channels/");
  u.searchParams.set(key, value);
  return Response.redirect(u.toString(), 302);
}
async function vaultRead(id: string) {
  const { data, error } = await db.rpc("creator_vault_read", { p_secret_id: id });
  if (error) throw error; return data as string;
}
async function vaultStore(owner: string, kind: string, secret: string) {
  const { data, error } = await db.rpc("creator_vault_store", { p_owner: owner, p_kind: kind, p_secret: secret });
  if (error) throw error; return data as string;
}
async function upsert(owner: string, kind: string, provider: string, patch: Record<string, unknown>) {
  const { error } = await db.from("creator_provider_connections").upsert({ owner_id: owner, kind, provider, ...patch, updated_at: new Date().toISOString() }, { onConflict: "owner_id,kind,provider" });
  if (error) throw error;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (!url.pathname.endsWith("/callback")) return new Response(JSON.stringify({ ok: true, function: "creator-google-oauth", callback: CALLBACK }), { headers: { "Content-Type": "application/json" } });
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  const oauthError = url.searchParams.get("error") || "";
  let returnTo = "https://juanmanuelpm.github.io/prometeo/pages/lab/channels/";
  try {
    const { data: st, error } = await db.from("creator_oauth_states").select("*").eq("state", state).eq("provider", "google").maybeSingle();
    if (error || !st) return redirect(returnTo, "oauth_error", "state_invalid");
    returnTo = st.return_to || returnTo;
    if (st.consumed_at || new Date(st.expires_at).getTime() < Date.now()) return redirect(returnTo, "oauth_error", "state_expired");
    if (oauthError) return redirect(returnTo, "oauth_error", oauthError);
    if (!code) return redirect(returnTo, "oauth_error", "code_missing");

    const { data: claimed, error: claimError } = await db.from("creator_oauth_states").update({ consumed_at: new Date().toISOString() }).eq("state", state).is("consumed_at", null).select().maybeSingle();
    if (claimError || !claimed) return redirect(returnTo, "oauth_error", "state_replayed");

    const owner = claimed.owner_id;
    const { data: cfg, error: ce } = await db.from("creator_provider_connections").select("*").eq("owner_id", owner).eq("kind", "oauth_client").eq("provider", "google").single();
    if (ce || !cfg?.vault_secret_id || !cfg?.metadata?.client_id) return redirect(returnTo, "oauth_error", "client_not_configured");
    const clientSecret = await vaultRead(cfg.vault_secret_id);

    const form = new URLSearchParams({
      code,
      client_id: String(cfg.metadata.client_id),
      client_secret: clientSecret,
      redirect_uri: CALLBACK,
      grant_type: "authorization_code",
      code_verifier: claimed.code_verifier || "",
    });
    const tr = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    const token: any = await tr.json();
    if (!tr.ok || !token.access_token) {
      await upsert(owner, "oauth", "google", { mode: "BLOCKED", last_error: { status: tr.status, payload: token }, last_probe: { at: new Date().toISOString() } });
      return redirect(returnTo, "oauth_error", "token_exchange_failed");
    }

    let refreshId: string | null = null;
    if (token.refresh_token) refreshId = await vaultStore(owner, "google_refresh_token", token.refresh_token);
    else {
      const existing = await db.from("creator_provider_connections").select("vault_secret_id").eq("owner_id", owner).eq("kind", "oauth").eq("provider", "google").maybeSingle();
      refreshId = existing.data?.vault_secret_id || null;
    }
    if (!refreshId) {
      await upsert(owner, "oauth", "google", { mode: "BLOCKED", last_error: { error: "NO_REFRESH_TOKEN" }, last_probe: { token_exchange: true } });
      return redirect(returnTo, "oauth_error", "refresh_token_missing");
    }

    const authHeaders = { Authorization: `Bearer ${token.access_token}` };
    const [userInfoResponse, channelsResponse] = await Promise.all([
      fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: authHeaders }),
      fetch("https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true&maxResults=50", { headers: authHeaders }),
    ]);
    const userInfo: any = userInfoResponse.ok ? await userInfoResponse.json() : {};
    const channelsPayload: any = channelsResponse.ok ? await channelsResponse.json() : {};
    const channels = Array.isArray(channelsPayload.items) ? channelsPayload.items.map((x: any) => ({ id: x.id, title: x.snippet?.title || x.id })) : [];

    const scopes = String(token.scope || "").split(" ").filter(Boolean);
    await upsert(owner, "oauth", "google", {
      mode: "VERIFIED_REAL",
      vault_secret_id: refreshId,
      external_account_id: userInfo.sub || null,
      scopes,
      verified_at: new Date().toISOString(),
      expires_at: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : null,
      last_probe: { token_exchange: true, userinfo: userInfoResponse.ok, email: userInfo.email || null },
      last_error: null,
      metadata: { client_id: cfg.metadata.client_id, email: userInfo.email || null },
    });

    await upsert(owner, "youtube", "google", {
      mode: channelsResponse.ok ? "CONFIGURED" : "BLOCKED",
      vault_secret_id: refreshId,
      scopes,
      last_probe: { channels_list_status: channelsResponse.status, channels },
      last_error: channelsResponse.ok ? null : channelsPayload,
      metadata: { client_id: cfg.metadata.client_id, channels, read_verified: channelsResponse.ok },
    });

    let analyticsProbe: any = { ok: false, skipped: true };
    if (channelsResponse.ok && channels.length) {
      const end = new Date(); end.setUTCDate(end.getUTCDate() - 1);
      const start = new Date(end); start.setUTCDate(start.getUTCDate() - 1);
      const d = (x: Date) => x.toISOString().slice(0, 10);
      const q = new URLSearchParams({ ids: "channel==MINE", startDate: d(start), endDate: d(end), metrics: "views" });
      const ar = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${q}`, { headers: authHeaders });
      const payload = await ar.text();
      analyticsProbe = { ok: ar.ok, status: ar.status, sample: payload.slice(0, 240) };
      await upsert(owner, "analytics", "youtube", { mode: ar.ok ? "VERIFIED_REAL" : "BLOCKED", vault_secret_id: refreshId, scopes, verified_at: ar.ok ? new Date().toISOString() : null, last_probe: analyticsProbe, last_error: ar.ok ? null : analyticsProbe });
    }

    for (const c of channels) {
      const slug = String(c.title).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || c.id.toLowerCase();
      await db.from("creator_channels").upsert({ owner_id: owner, slug, title: c.title, youtube_channel_id: c.id, settings: { source: "youtube" } }, { onConflict: "owner_id,youtube_channel_id" });
    }

    if (channelsResponse.ok) {
      await db.from("creator_jobs").update({ status: "QUEUED", available_at: new Date().toISOString(), error: null }).eq("owner_id", owner).eq("kind", "PUBLISH_YOUTUBE").eq("status", "WAITING_AUTH");
      await db.from("creator_publications").update({ status: "PREPARED" }).eq("owner_id", owner).eq("status", "WAITING_AUTH");
    }

    const done = new URL(returnTo);
    done.searchParams.set("connected", "1");
    done.searchParams.set("channels", String(channels.length));
    done.searchParams.set("analytics", analyticsProbe.ok ? "1" : "0");
    return Response.redirect(done.toString(), 302);
  } catch (e) {
    console.error("creator_google_oauth", e);
    return redirect(returnTo, "oauth_error", "unexpected");
  }
});
