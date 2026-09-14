import { withSupabase } from "npm:@supabase/server";

const DEMO_PROFILE_ID = "00000000-0000-4000-8000-000000000001";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function nextDay(iso: string) {
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0,10);
}

function localDate(occurredAt: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date(occurredAt));
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req: Request, ctx: any) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (!["GET","POST"].includes(req.method)) return json({ error: "method_not_allowed" }, 405);

    try {
      const url = new URL(req.url);
      let input: Record<string,string> = {};
      if (req.method === "POST") {
        try { input = await req.json(); } catch { input = {}; }
      }
      const view = String(input.view || url.searchParams.get("view") || "status");
      const from = String(input.from || url.searchParams.get("from") || "2026-09-01");
      const to = String(input.to || url.searchParams.get("to") || from);

      if (view === "status") {
        const { data, error } = await ctx.supabaseAdmin.from("finance_sync_state")
          .select("provider,status,last_success_at,last_attempt_at")
          .eq("profile_id", DEMO_PROFILE_ID)
          .eq("provider","synthetic")
          .maybeSingle();
        if (error) throw error;
        return json({ schema:"prometeo.finance.status.v1", mode:"demo", connection:data });
      }

      const start = `${from}T00:00:00-03:00`;
      const end = `${nextDay(to)}T00:00:00-03:00`;
      const { data: rows, error } = await ctx.supabaseAdmin.from("finance_transactions")
        .select("id,source,external_id,occurred_at,amount,currency,direction,merchant,description,category,status")
        .eq("profile_id", DEMO_PROFILE_ID)
        .gte("occurred_at", start)
        .lt("occurred_at", end)
        .order("occurred_at", { ascending: true });
      if (error) throw error;

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
        return json({
          schema:"prometeo.finance.day.v1", mode:"demo", date:from,
          totals:{income,expense,net:income-expense}, transactions
        });
      }

      return json({
        schema:"prometeo.finance.range.v1", mode:"demo", from, to,
        totals:{income,expense,net:income-expense}, days,
        updatedAt:new Date().toISOString()
      });
    } catch (err) {
      console.error("finance-demo-v1 failed", err instanceof Error ? err.message : "unknown");
      return json({ error:"finance_demo_failed" }, 500);
    }
  })
};
