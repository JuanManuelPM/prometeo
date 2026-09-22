-- BACKLOG-233: canonical durable backlog state catalog.
-- Keeps lifecycle vocabulary outside chat text so future backlog objects can reference one source of truth.

create table if not exists public.prometeo_backlog_states (
  state text primary key,
  ordinal smallint not null unique,
  is_terminal boolean not null,
  description text not null,
  constraint prometeo_backlog_states_exact_state_check
    check (state in ('IDEA','DESIGNED','READY','WORKING','VALIDATING','DONE','SUPERSEDED')),
  constraint prometeo_backlog_states_ordinal_check
    check (ordinal between 1 and 7)
);

insert into public.prometeo_backlog_states (state, ordinal, is_terminal, description)
values
  ('IDEA', 1, false, 'Captured but not yet designed.'),
  ('DESIGNED', 2, false, 'Scope and intended solution are defined.'),
  ('READY', 3, false, 'Executable without unresolved prerequisites.'),
  ('WORKING', 4, false, 'Actively being executed.'),
  ('VALIDATING', 5, false, 'Implementation exists and is under verification.'),
  ('DONE', 6, true, 'Verified durable outcome is complete.'),
  ('SUPERSEDED', 7, true, 'Retained for history but replaced by a newer item or decision.')
on conflict (state) do update
set ordinal = excluded.ordinal,
    is_terminal = excluded.is_terminal,
    description = excluded.description;

create or replace function public.prometeo_backlog_state_catalog_smoke_test()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'ok',
      count(*) = 7
      and array_agg(state order by ordinal) =
        array['IDEA','DESIGNED','READY','WORKING','VALIDATING','DONE','SUPERSEDED']::text[]
      and count(*) filter (where is_terminal) = 2,
    'states', array_agg(state order by ordinal),
    'terminal_states', array_agg(state order by ordinal) filter (where is_terminal)
  )
  from public.prometeo_backlog_states;
$$;

comment on table public.prometeo_backlog_states is
'BACKLOG-233 canonical backlog lifecycle states. Future durable backlog items should reference this catalog rather than inventing status strings.';

comment on function public.prometeo_backlog_state_catalog_smoke_test() is
'BACKLOG-233 deterministic verification that the canonical seven-state backlog lifecycle is present and ordered.';
