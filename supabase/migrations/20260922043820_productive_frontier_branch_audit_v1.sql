-- Growth Guide: raise productive branching without rewarding child-count spam.
-- Applies a bounded branch-audit contract to Productive Frontier roots, current and future.

create or replace function public.prometeo_frontier_branch_audit_contract()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_marker constant text := 'BRANCH_AUDIT_V1';
  v_contract constant text := E'\n\nBRANCH_AUDIT_V1\nAntes de PUBLISH, auditá los descubrimientos hechos durante WORK. Creá child sólo cuando TODAS se cumplan: (a) trabajo necesario para el objetivo o una dependencia descubierta; (b) independiente del cierre que ya hiciste en el padre; (c) tiene output/aceptación verificable; (d) no duplica source/job existente; (e) no es busywork ni una reformulación. Si cumple, delegalo en vez de absorberlo silenciosamente. Máximo 3. En meta.frontier.branch_audit incluí candidates_seen, spawned, closed_in_parent y zero_reason cuando spawned=0. zero_reason debe ser uno de NONE_INDEPENDENT, ALL_CLOSED_IN_PARENT, DUPLICATE, NOT_NECESSARY o BLOCKED. No optimices spawned: calidad y necesidad mandan.';
begin
  if new.project_id='PRODUCTIVE-FRONTIER-01'
     and new.job_key like 'FR-%'
     and position(v_marker in coalesce(new.instruction,''))=0 then
    new.instruction := coalesce(new.instruction,'') || v_contract;
  end if;
  return new;
end;
$$;

drop trigger if exists prometeo_frontier_branch_audit_contract_trg on public.prometeo_jobs;
create trigger prometeo_frontier_branch_audit_contract_trg
before insert or update of instruction on public.prometeo_jobs
for each row
execute function public.prometeo_frontier_branch_audit_contract();

-- Backfill only unstarted Productive Frontier roots. This is behavior-contract metadata,
-- not a lease/status mutation.
update public.prometeo_jobs
set instruction=instruction
where project_id='PRODUCTIVE-FRONTIER-01'
  and job_key like 'FR-%'
  and status='READY'
  and position('BRANCH_AUDIT_V1' in coalesce(instruction,''))=0;

comment on function public.prometeo_frontier_branch_audit_contract() is
  'Growth Guide: bounded, deduped branch audit for Productive Frontier roots. Encourages discovery of necessary independent work without optimizing child count.';
