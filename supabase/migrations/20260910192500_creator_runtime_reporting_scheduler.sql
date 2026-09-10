-- Creator Runtime v9: collect YouTube Reporting reach/thumbnail CTR every six hours.
create or replace function public.creator_kick_reporting()
returns bigint
language plpgsql security definer set search_path='' as $$
declare secret_value text; request_id bigint;
begin
  select decrypted_secret into secret_value from vault.decrypted_secrets where name='creator:worker:cron' limit 1;
  if secret_value is null then raise exception 'CREATOR_WORKER_SECRET_MISSING'; end if;
  select net.http_post(url:='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/creator-reporting',headers:=jsonb_build_object('Content-Type','application/json','x-creator-worker-secret',secret_value),body:='{}'::jsonb) into request_id;
  return request_id;
end $$;
revoke all on function public.creator_kick_reporting() from public, anon, authenticated;
grant execute on function public.creator_kick_reporting() to service_role;
do $$ declare jid bigint; begin
  select jobid into jid from cron.job where jobname='creator-reporting-6h' limit 1;
  if jid is not null then perform cron.unschedule(jid); end if;
  perform cron.schedule('creator-reporting-6h','17 */6 * * *','select public.creator_kick_reporting();');
end $$;