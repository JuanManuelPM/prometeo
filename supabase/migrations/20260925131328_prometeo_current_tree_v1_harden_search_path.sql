-- Harden the read-only Current Tree projection against mutable search_path resolution.
alter function public.prometeo_current_tree_v1()
set search_path = public, pg_temp;
