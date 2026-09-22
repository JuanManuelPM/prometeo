-- Rollback for BACKLOG-228 interpretation boundary v1.
drop function if exists public.forge_interpretation_boundary_v1_smoke_test();
drop function if exists public.forge_interpretation_boundary_v1(jsonb);
