const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ code: 'UNAUTHORIZED' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ code: 'SERVER_CONFIG_ERROR' }, 500);

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: anonKey }
  });
  if (!userRes.ok) return json({ code: 'UNAUTHORIZED' }, 401);
  const user = await userRes.json();
  if (!user?.id) return json({ code: 'UNAUTHORIZED' }, 401);

  const ownerRes = await fetch(`${supabaseUrl}/rest/v1/prometeo_owner?select=auth_user_id&singleton=eq.true`, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey }
  });
  if (!ownerRes.ok) return json({ code: 'OWNER_LOOKUP_FAILED' }, 500);
  const ownerRows = await ownerRes.json();
  const ownerId = ownerRows?.[0]?.auth_user_id || null;

  if (ownerId && ownerId === user.id) {
    const profileRes = await fetch(`${supabaseUrl}/rest/v1/finance_profiles?select=id,mode&auth_user_id=eq.${encodeURIComponent(user.id)}`, {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey }
    });
    const profiles = profileRes.ok ? await profileRes.json() : [];
    return json({ ok: true, status: 'ready', financeProfileId: profiles?.[0]?.id || null });
  }
  if (ownerId && ownerId !== user.id) return json({ code: 'NOT_OWNER' }, 403);

  let body: { claimToken?: string } = {};
  try { body = await req.json(); } catch { body = {}; }
  const claimToken = String(body.claimToken || '');
  if (claimToken.length < 32 || claimToken.length > 256) return json({ code: 'CLAIM_REQUIRED' }, 403);
  const tokenHash = await sha256Hex(claimToken);

  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/claim_prometeo_owner`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_auth_user_id: user.id, p_token_hash: tokenHash })
  });

  const text = await rpcRes.text();
  if (!rpcRes.ok) {
    let code = 'BOOTSTRAP_FAILED';
    if (text.includes('owner_already_claimed')) code = 'OWNER_ALREADY_CLAIMED';
    else if (text.includes('bootstrap_expired')) code = 'BOOTSTRAP_EXPIRED';
    else if (text.includes('bootstrap_invalid')) code = 'BOOTSTRAP_INVALID';
    else if (text.includes('bootstrap_already_used')) code = 'BOOTSTRAP_USED';
    return json({ code }, code === 'OWNER_ALREADY_CLAIMED' ? 409 : 403);
  }

  let result: unknown = null;
  try { result = JSON.parse(text); } catch { result = text; }
  return json({ ok: true, status: 'claimed', result });
});
