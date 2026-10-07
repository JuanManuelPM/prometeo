import { withSupabase } from "npm:@supabase/server";

const ALLOWED_ORIGINS = new Set([
  "https://juanmanuelpm.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://juanmanuelpm.github.io",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store"
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}

function nextDay(iso: string) {
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

function localDate(occurredAt: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date(occurredAt));
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req: Request, ctx: any) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
    if (!["GET", "POST"].includes(req.method)) return json(req, { error: "method_not_allowed" }, 405);

    const userId = ctx.userClaims?.id || ctx.jwtClaims?.sub;
    if (!userId) return json(req, { error: "user_identity_missing" }, 401);

    const { data: profile, error: profileError } = await ctx.supabaseAdmin
      .from("finance_profiles")
      .select("id,mode")
      .eq("auth_user_id", userId)
      .eq("mode", "live")
      .maybeSingle();

    if (profileError) {
      console.error("finance-v1 profile lookup failed", profileError.code || "unknown");
      return json(req, { error: "finance_profile_lookup_failed" }, 500);
    }
    if (!profile) return json(req, { error: "finance_profile_not_enabled" }, 403);

    const url = new URL(req.url);
    let input: Record<string,string> = {};
    if (req.method === "POST") {
      try { input = await req.json(); } catch { input = {}; }
    }
    const view = String(input.view || url.searchParams.get("view") || "status");
    const from = String(input.from || url.searchParams.get("from") || new Date().toISOString().slice(0,10));
    const to = String(input.to || url.searchParams.get("to") || from);

    if (view === "status") {
      const { data, error } = await ctx.supabaseAdmin.from("finance_sync_state")
        .select("provider,status,last_success_at,last_attempt_at,last_error_code")
        .eq("profile_id", profile.id)
        .order("updated_at", { ascending: false });
      if (error) return json(req, { error: "finance_status_failed" }, 500);
      return json(req, { schema:"prometeo.finance.status.v1", mode:"live", connections:data || [] });
    }

    const start = `${from}T00:00:00-03:00`;
    const end = `${nextDay(to)}T00:00:00-03:00`;
    const { data: rows, error } = await ctx.supabaseAdmin.from("finance_transactions")
      .select("id,source,external_id,occurred_at,amount,currency,direction,merchant,description,category,status")
      .eq("profile_id", profile.id)
      .gte("occurred_at", start)
      .lt("occurred_at", end)
      .order("occurred_at", { ascending: true });
    if (error) return json(req, { error: "finance_range_failed" }, 500);

    const transactions = (rows || []).map((r:any) => ({
      id:r.id, source:r.source, externalId:r.external_id, occurredAt:r.occurred_at,
      amount:Number(r.amount), currency:r.currency, direction:r.direction,
      merchant:r.merchant, description:r.description, category:r.category, status:r.status
    }));

    const days: Record<string,{income:number,expense:number,net:number,count:number}> = {};
    let income = 0, expense = 0;
    for (const tx of transactions) {
      const date = localDate(tx.occurredAt);
      if (!days[date]) days[date] = { income:0, expense:0, net:0, count:0 };
      if (tx.direction === "income") { income += tx.amount; days[date].income += tx.amount; }
      else { expense += tx.amount; days[date].expense += tx.amount; }
      days[date].net = days[date].income - days[date].expense;
      days[date].count += 1;
    }

    if (view === "day") {
      return json(req, {
        schema:"prometeo.finance.day.v1", mode:"live", date:from,
        totals:{income,expense,net:income-expense}, transactions
      });
    }

    return json(req, {
      schema:"prometeo.finance.range.v1", mode:"live", from, to,
      totals:{income,expense,net:income-expense}, days,
      updatedAt:new Date().toISOString()
    });
  })
};
