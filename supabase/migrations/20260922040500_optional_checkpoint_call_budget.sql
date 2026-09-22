-- SECURITY_TOOLING: reduce optional checkpoint retries/tool calls.
-- Checkpoints remain observable and optional; this does not alter authority.

create or replace function public.prometeo_checkpoint_policy()
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  select jsonb_build_object(
    'enabled', true,
    'required', false,
    'allowed_milestones', jsonb_build_array(
      'INPUTS_VALIDATED','SOURCE_LOADED','ACTION_COMPLETED',
      'EVIDENCE_VERIFIED','TOOL_ERROR','RECOVERY_COMPLETED','PRE_PUBLISH'
    ),
    'observable_only', true,
    'max_detail_chars', 4000,
    'optional_call_budget', 1,
    'retry_optional_on_failure', false,
    'skip_if_publish_imminent', true,
    'optional_failure_action', 'SKIP_AND_REPORT_IN_PUBLISH_META',
    'optional_failure_reason_code', 'OPTIONAL_CHECKPOINT_SKIPPED_TOOL_FAILURE',
    'non_retryable_optional_failure_classes', jsonb_build_array(
      'RATE_LIMITED','SECURITY_BLOCKED'
    )
  );
$$;
