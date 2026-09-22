-- Q026 rollback. Restores the exact pre-Q026 morgue function name and removes classifier surfaces.
begin;
drop function if exists public.prometeo_morgue_context(text);
do $block$
begin
  if to_regprocedure('public.prometeo_morgue_context_legacy_q026(text)') is not null then
    alter function public.prometeo_morgue_context_legacy_q026(text)
      rename to prometeo_morgue_context;
  end if;
end;
$block$;
drop view if exists public.prometeo_control_preflight_enter_loss;
drop function if exists public.prometeo_detect_preflight_enter_losses(integer);
drop function if exists public.prometeo_preflight_enter_loss_due(timestamptz,timestamptz,timestamptz,integer);
drop table if exists public.prometeo_preflight_enter_losses;
commit;
