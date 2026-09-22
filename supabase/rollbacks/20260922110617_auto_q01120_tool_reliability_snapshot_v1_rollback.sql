-- Rollback AUTO-Q01120 tool reliability snapshot v1.
drop function if exists public.prometeo_tool_reliability_snapshot_v1_smoke_test();
drop function if exists public.prometeo_tool_reliability_snapshot_v1(integer);
