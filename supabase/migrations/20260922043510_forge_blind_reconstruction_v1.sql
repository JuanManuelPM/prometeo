create table if not exists public.forge_blind_reconstruction_runs (
  run_id uuid primary key default gen_random_uuid(),
  status text not null default 'PENDING_DESCRIPTION'
    check (status in ('PENDING_DESCRIPTION','PENDING_RECONSTRUCTION','PENDING_EVALUATION','EVALUATED','CANCELLED')),
  source_ref text not null,
  reference_payload jsonb not null,
  evaluation_atoms jsonb not null check (jsonb_typeof(evaluation_atoms)='array' and jsonb_array_length(evaluation_atoms)>0),
  describer_worker text,
  description_text text,
  described_at timestamptz,
  reconstructor_worker text,
  reconstruction_text text,
  reconstructed_at timestamptz,
  evaluator_worker text,
  recovered_atom_ids jsonb check (recovered_atom_ids is null or jsonb_typeof(recovered_atom_ids)='array'),
  recovered_atoms integer,
  total_atoms integer,
  loss_ratio numeric check (loss_ratio is null or (loss_ratio>=0 and loss_ratio<=1)),
  evaluation_notes text,
  evaluated_at timestamptz,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance)='object'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create index if not exists forge_blind_reconstruction_status_idx
  on public.forge_blind_reconstruction_runs(status,created_at);

alter table public.forge_blind_reconstruction_runs enable row level security;
revoke all on table public.forge_blind_reconstruction_runs from anon, authenticated;

create or replace function public.forge_blind_reconstruction_create(
  p_source_ref text,
  p_reference_payload jsonb,
  p_evaluation_atoms jsonb,
  p_provenance jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_run uuid;
  v_total integer;
  v_distinct integer;
begin
  if nullif(btrim(p_source_ref),'') is null
     or p_reference_payload is null
     or jsonb_typeof(coalesce(p_evaluation_atoms,'null'::jsonb))<>'array'
     or jsonb_array_length(p_evaluation_atoms)=0
     or jsonb_typeof(coalesce(p_provenance,'{}'::jsonb))<>'object'
  then
    return jsonb_build_object('ok',false,'state','INVALID_CREATE_INPUT');
  end if;

  if exists(
    select 1 from jsonb_array_elements(p_evaluation_atoms) a
    where jsonb_typeof(a)<>'object' or nullif(btrim(a->>'id'),'') is null
  ) then
    return jsonb_build_object('ok',false,'state','INVALID_EVALUATION_ATOMS');
  end if;

  select count(*),count(distinct a->>'id')
  into v_total,v_distinct
  from jsonb_array_elements(p_evaluation_atoms) a;

  if v_total<>v_distinct then
    return jsonb_build_object('ok',false,'state','DUPLICATE_EVALUATION_ATOM');
  end if;

  insert into public.forge_blind_reconstruction_runs(
    source_ref,reference_payload,evaluation_atoms,provenance
  ) values (
    btrim(p_source_ref),p_reference_payload,p_evaluation_atoms,coalesce(p_provenance,'{}'::jsonb)
  )
  returning run_id into v_run;

  return jsonb_build_object('ok',true,'state','BLIND_RUN_CREATED','run_id',v_run,'total_atoms',v_total);
end;
$$;

create or replace function public.forge_blind_reconstruction_describer_packet(p_run_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select coalesce((
    select jsonb_build_object(
      'ok',true,
      'state',case when status='PENDING_DESCRIPTION' then 'DESCRIBER_PACKET' else 'RUN_NOT_READY_FOR_DESCRIPTION' end,
      'run_id',run_id,
      'source_ref',source_ref,
      'reference_payload',reference_payload
    )
    from public.forge_blind_reconstruction_runs
    where run_id=p_run_id
  ),jsonb_build_object('ok',false,'state','RUN_NOT_FOUND'));
$$;

create or replace function public.forge_blind_reconstruction_submit_description(
  p_run_id uuid,
  p_worker_code text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v public.forge_blind_reconstruction_runs%rowtype;
begin
  if nullif(btrim(p_worker_code),'') is null or nullif(btrim(p_description),'') is null then
    return jsonb_build_object('ok',false,'state','INVALID_DESCRIPTION_INPUT');
  end if;

  select * into v
  from public.forge_blind_reconstruction_runs
  where run_id=p_run_id
  for update;

  if not found then return jsonb_build_object('ok',false,'state','RUN_NOT_FOUND'); end if;
  if v.status<>'PENDING_DESCRIPTION' then
    return jsonb_build_object('ok',false,'state','INVALID_RUN_STATE','current_status',v.status);
  end if;

  update public.forge_blind_reconstruction_runs
  set describer_worker=btrim(p_worker_code),
      description_text=p_description,
      described_at=clock_timestamp(),
      status='PENDING_RECONSTRUCTION',
      updated_at=clock_timestamp()
  where run_id=p_run_id;

  return jsonb_build_object('ok',true,'state','DESCRIPTION_ACCEPTED','run_id',p_run_id);
end;
$$;

create or replace function public.forge_blind_reconstruction_reconstructor_packet(p_run_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select coalesce((
    select jsonb_build_object(
      'ok',true,
      'state',case when status='PENDING_RECONSTRUCTION' then 'RECONSTRUCTOR_PACKET' else 'RUN_NOT_READY_FOR_RECONSTRUCTION' end,
      'run_id',run_id,
      'description_text',description_text
    )
    from public.forge_blind_reconstruction_runs
    where run_id=p_run_id
  ),jsonb_build_object('ok',false,'state','RUN_NOT_FOUND'));
$$;

create or replace function public.forge_blind_reconstruction_submit_reconstruction(
  p_run_id uuid,
  p_worker_code text,
  p_reconstruction text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v public.forge_blind_reconstruction_runs%rowtype;
begin
  if nullif(btrim(p_worker_code),'') is null or nullif(btrim(p_reconstruction),'') is null then
    return jsonb_build_object('ok',false,'state','INVALID_RECONSTRUCTION_INPUT');
  end if;

  select * into v
  from public.forge_blind_reconstruction_runs
  where run_id=p_run_id
  for update;

  if not found then return jsonb_build_object('ok',false,'state','RUN_NOT_FOUND'); end if;
  if v.status<>'PENDING_RECONSTRUCTION' then
    return jsonb_build_object('ok',false,'state','INVALID_RUN_STATE','current_status',v.status);
  end if;
  if btrim(p_worker_code)=v.describer_worker then
    return jsonb_build_object('ok',false,'state','ROLE_COLLISION');
  end if;

  update public.forge_blind_reconstruction_runs
  set reconstructor_worker=btrim(p_worker_code),
      reconstruction_text=p_reconstruction,
      reconstructed_at=clock_timestamp(),
      status='PENDING_EVALUATION',
      updated_at=clock_timestamp()
  where run_id=p_run_id;

  return jsonb_build_object('ok',true,'state','RECONSTRUCTION_ACCEPTED','run_id',p_run_id);
end;
$$;

create or replace function public.forge_blind_reconstruction_evaluator_packet(p_run_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select coalesce((
    select jsonb_build_object(
      'ok',true,
      'state',case when status='PENDING_EVALUATION' then 'EVALUATOR_PACKET' else 'RUN_NOT_READY_FOR_EVALUATION' end,
      'run_id',run_id,
      'source_ref',source_ref,
      'reference_payload',reference_payload,
      'evaluation_atoms',evaluation_atoms,
      'description_text',description_text,
      'reconstruction_text',reconstruction_text,
      'describer_worker',describer_worker,
      'reconstructor_worker',reconstructor_worker
    )
    from public.forge_blind_reconstruction_runs
    where run_id=p_run_id
  ),jsonb_build_object('ok',false,'state','RUN_NOT_FOUND'));
$$;

create or replace function public.forge_blind_reconstruction_evaluate(
  p_run_id uuid,
  p_worker_code text,
  p_recovered_atom_ids jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v public.forge_blind_reconstruction_runs%rowtype;
  v_total integer;
  v_recovered integer;
  v_distinct integer;
  v_loss numeric;
begin
  if nullif(btrim(p_worker_code),'') is null
     or jsonb_typeof(coalesce(p_recovered_atom_ids,'null'::jsonb))<>'array'
  then
    return jsonb_build_object('ok',false,'state','INVALID_EVALUATION_INPUT');
  end if;

  select * into v
  from public.forge_blind_reconstruction_runs
  where run_id=p_run_id
  for update;

  if not found then return jsonb_build_object('ok',false,'state','RUN_NOT_FOUND'); end if;
  if v.status<>'PENDING_EVALUATION' then
    return jsonb_build_object('ok',false,'state','INVALID_RUN_STATE','current_status',v.status);
  end if;
  if btrim(p_worker_code)=v.reconstructor_worker then
    return jsonb_build_object('ok',false,'state','ROLE_COLLISION');
  end if;
  if exists(
    select 1 from jsonb_array_elements_text(p_recovered_atom_ids) rid
    where not exists(
      select 1 from jsonb_array_elements(v.evaluation_atoms) atom
      where atom->>'id'=rid
    )
  ) then
    return jsonb_build_object('ok',false,'state','UNKNOWN_RECOVERED_ATOM');
  end if;

  select count(*),count(distinct x)
  into v_recovered,v_distinct
  from jsonb_array_elements_text(p_recovered_atom_ids) x;

  if v_recovered<>v_distinct then
    return jsonb_build_object('ok',false,'state','DUPLICATE_RECOVERED_ATOM');
  end if;

  v_total:=jsonb_array_length(v.evaluation_atoms);
  v_loss:=round((1-(v_recovered::numeric/v_total::numeric))::numeric,6);

  update public.forge_blind_reconstruction_runs
  set evaluator_worker=btrim(p_worker_code),
      recovered_atom_ids=p_recovered_atom_ids,
      recovered_atoms=v_recovered,
      total_atoms=v_total,
      loss_ratio=v_loss,
      evaluation_notes=p_notes,
      evaluated_at=clock_timestamp(),
      status='EVALUATED',
      updated_at=clock_timestamp()
  where run_id=p_run_id;

  return jsonb_build_object(
    'ok',true,
    'state','BLIND_RECONSTRUCTION_EVALUATED',
    'run_id',p_run_id,
    'recovered_atoms',v_recovered,
    'total_atoms',v_total,
    'loss_ratio',v_loss
  );
end;
$$;

create or replace function public.forge_blind_reconstruction_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_create jsonb;
  v_run uuid;
  v_recon_packet jsonb;
  v_collision jsonb;
  v_eval jsonb;
  v_hidden boolean;
  v_loss_ok boolean;
begin
  v_create:=public.forge_blind_reconstruction_create(
    'smoke://blind-20',
    '{"secret":"ORIGINAL","shape":"square"}'::jsonb,
    '[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"}]'::jsonb,
    '{"fixture":true}'::jsonb
  );
  v_run:=(v_create->>'run_id')::uuid;

  perform public.forge_blind_reconstruction_submit_description(v_run,'K-DESC','Una descripción deliberadamente parcial.');
  v_recon_packet:=public.forge_blind_reconstruction_reconstructor_packet(v_run);

  v_hidden:=not (v_recon_packet ? 'source_ref')
            and not (v_recon_packet ? 'reference_payload')
            and not (v_recon_packet ? 'evaluation_atoms')
            and (v_recon_packet ? 'description_text');

  v_collision:=public.forge_blind_reconstruction_submit_reconstruction(v_run,'K-DESC','No debe aceptarse.');
  perform public.forge_blind_reconstruction_submit_reconstruction(v_run,'K-RECON','Reconstrucción desde descripción solamente.');
  v_eval:=public.forge_blind_reconstruction_evaluate(v_run,'K-DESC','["A","C"]'::jsonb,'fixture');
  v_loss_ok:=abs(((v_eval->>'loss_ratio')::numeric)-0.5)<0.000001;

  delete from public.forge_blind_reconstruction_runs where run_id=v_run;

  return jsonb_build_object(
    'ok',v_hidden and v_collision->>'state'='ROLE_COLLISION' and v_loss_ok,
    'state',case when v_hidden and v_collision->>'state'='ROLE_COLLISION' and v_loss_ok
      then 'BLIND_RECONSTRUCTION_SMOKE_OK' else 'BLIND_RECONSTRUCTION_SMOKE_FAILED' end,
    'blind_packet',case when v_hidden then 'PASS' else 'FAIL' end,
    'role_separation',case when v_collision->>'state'='ROLE_COLLISION' then 'PASS' else 'FAIL' end,
    'loss_measurement',case when v_loss_ok then 'PASS' else 'FAIL' end,
    'expected_loss_ratio',0.5,
    'fixture_cleaned',true
  );
exception when others then
  if v_run is not null then delete from public.forge_blind_reconstruction_runs where run_id=v_run; end if;
  return jsonb_build_object('ok',false,'state','BLIND_RECONSTRUCTION_SMOKE_ERROR','error',sqlerrm,'fixture_cleaned',true);
end;
$$;

revoke execute on function public.forge_blind_reconstruction_create(text,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke execute on function public.forge_blind_reconstruction_describer_packet(uuid) from public,anon,authenticated;
revoke execute on function public.forge_blind_reconstruction_submit_description(uuid,text,text) from public,anon,authenticated;
revoke execute on function public.forge_blind_reconstruction_reconstructor_packet(uuid) from public,anon,authenticated;
revoke execute on function public.forge_blind_reconstruction_submit_reconstruction(uuid,text,text) from public,anon,authenticated;
revoke execute on function public.forge_blind_reconstruction_evaluator_packet(uuid) from public,anon,authenticated;
revoke execute on function public.forge_blind_reconstruction_evaluate(uuid,text,jsonb,text) from public,anon,authenticated;
revoke execute on function public.forge_blind_reconstruction_smoke_test() from public,anon,authenticated;

comment on table public.forge_blind_reconstruction_runs is
'BACKLOG-20 durable blind reconstruction: describer sees source, reconstructor receives description only, evaluator measures atom loss.';
