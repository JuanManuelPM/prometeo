-- Durable scheduler: wakes creator-worker every minute without exposing the machine secret.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.creator_kick_worker(p_limit integer default 12)
returns bigint
language plpgsql security definer set search_path='' as $$
declare
  secret_value text;
  request_id bigint;
begin
  select decrypted_secret into secret_value
  from vault.decrypted_secrets
  where name='creator:worker:cron'
  limit 1;
  if secret_value is null then raise exception 'CREATOR_WORKER_SECRET_MISSING'; end if;

  select net.http_post(
    url := 'https://catnohyouxqjjtseaueb.supabase.co/functions/v1/creator-worker',
    headers := jsonb_build_object('Content-Type','application/json','x-creator-worker-secret',secret_value),
    body := jsonb_build_object('limit',greatest(1,least(coalesce(p_limit,12),20)))
  ) into request_id;
  return request_id;
end $$;
revoke all on function public.creator_kick_worker(integer) from public, anon, authenticated;
grant execute on function public.creator_kick_worker(integer) to service_role;

-- Idempotently replace our own schedule only.
do $$ declare jid bigint; begin
  select jobid into jid from cron.job where jobname='creator-worker-minute' limit 1;
  if jid is not null then perform cron.unschedule(jid); end if;
  perform cron.schedule('creator-worker-minute','* * * * *','select public.creator_kick_worker(12);');
end $$;
