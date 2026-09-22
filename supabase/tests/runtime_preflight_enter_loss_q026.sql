-- Q026 reproducible checks for PREFLIGHT_ENTER_LOSS.
begin;

select
  public.prometeo_preflight_enter_loss_due(
    timestamptz '2026-09-22 00:00:00+00',
    null,
    timestamptz '2026-09-22 00:02:01+00',
    120
  ) is true as due_after_timeout;

select
  public.prometeo_preflight_enter_loss_due(
    timestamptz '2026-09-22 00:00:00+00',
    null,
    timestamptz '2026-09-22 00:01:59+00',
    120
  ) is false as not_due_before_timeout;

select
  public.prometeo_preflight_enter_loss_due(
    timestamptz '2026-09-22 00:00:00+00',
    timestamptz '2026-09-22 00:00:30+00',
    timestamptz '2026-09-22 00:10:00+00',
    120
  ) is false as enter_prevents_loss;

select
  (public.prometeo_detect_preflight_enter_losses(120)->>'classification')
    = 'PREFLIGHT_ENTER_LOSS' as detector_classification_ok;

select
  not exists (
    select 1
    from public.prometeo_worker_deaths
    where reason='PREFLIGHT_ENTER_LOSS'
       or reason like 'PREFLIGHT_ENTER_LOSS:%'
  ) as separate_from_worker_deaths;

select
  to_regprocedure('public.prometeo_morgue_context(text)') is not null
  and to_regprocedure('public.prometeo_morgue_context_legacy_q026(text)') is not null
  as morgue_wrapper_installed;

select
  count(*) >= 0 as control_projection_queryable
from public.prometeo_control_preflight_enter_loss;

rollback;
