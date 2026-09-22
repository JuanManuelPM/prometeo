-- BACKLOG-205 Phase A rollback. Destructive only to the two additive Phase A tables.
drop table if exists public.forge_skill_regression_runs;
drop table if exists public.forge_skill_regression_cases;
