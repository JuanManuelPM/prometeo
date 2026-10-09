-- CANDIDATE ONLY. Convert to a CLI-created migration after verifying real table
-- types/constraints. Not applied: private SQL connection refused in this run.
-- The existing P4 owner publishes a packet and its source transition atomically.
create or replace function public.prometeo_one_turn_publish_packet_v1(
  p_workspace_id uuid, p_page_id text, p_input_receipt jsonb, p_packet jsonb
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_thread public.prometeo_change_threads%rowtype;
  v_capture public.prometeo_captures%rowtype;
  v_revision public.prometeo_capture_revisions%rowtype;
  v_existing public.prometeo_execution_packets%rowtype;
  v_ref text := p_input_receipt->>'revision_ref';
  v_work text := p_packet->>'work_item_id';
  v_count integer;
begin
  if p_input_receipt->>'workspace_id' is distinct from p_workspace_id::text
     or p_input_receipt->>'page_id' is distinct from p_page_id
     or p_input_receipt->>'schema' is distinct from 'prometeo.capture-ack/v1'
     or p_input_receipt->>'durable' is distinct from 'true'
     or p_input_receipt->>'revision' is distinct from '1'
     or p_packet->>'page_id' is distinct from p_page_id
     or p_packet->>'workspace_id' is distinct from p_workspace_id::text
     or p_packet->>'status' is distinct from 'READY'
     or p_packet->'selected_revision_refs' is distinct from jsonb_build_array(v_ref)
     or p_packet->'selected_attachment_ids' is distinct from '[]'::jsonb
     or p_packet->'snapshot'->'intent'->'input_receipt' is distinct from p_input_receipt
     or p_packet->'snapshot'->'authorization'->>'delivery_mode' is distinct from 'WORKER_POOL'
  then raise exception 'ONE_TURN_PACKET_SCOPE_INVALID'; end if;

  select * into v_thread from public.prometeo_change_threads
    where workspace_id=p_workspace_id and page_id=p_page_id
      and id=(p_packet->>'thread_id')::uuid for update;
  if not found then raise exception 'THREAD_NOT_FOUND'; end if;
  select * into v_capture from public.prometeo_captures
    where workspace_id=p_workspace_id and page_id=p_page_id
      and id=p_input_receipt->>'capture_id' for share;
  if not found or v_capture.archive_state<>'ACTIVE' or v_capture.privacy<>'PROJECT'
     or v_capture.transcript_revision<>1
     or v_capture.metadata->>'one_turn_execution' is distinct from 'true'
     or v_capture.transcript_digest is distinct from p_input_receipt->>'digest'
     or v_capture.metadata->>'one_turn_request_id' is distinct from p_input_receipt->>'request_id'
  then raise exception 'CAPTURE_ACK_INVALID'; end if;
  select * into v_revision from public.prometeo_capture_revisions
    where workspace_id=p_workspace_id and capture_id=v_capture.id and revision=1 for share;
  if not found or v_revision.transcript is distinct from v_capture.transcript
     or v_revision.transcript_digest is distinct from v_capture.transcript_digest
     or v_revision.privacy<>'PROJECT'
     or v_ref is distinct from ('capture:'||v_capture.id||':rev:1')
  then raise exception 'CAPTURE_ACK_INVALID'; end if;

  select * into v_existing from public.prometeo_execution_packets where work_item_id=v_work;
  if found then
    if v_existing.workspace_id<>p_workspace_id or v_existing.page_id<>p_page_id
       or to_jsonb(v_existing.selected_revision_refs) is distinct from jsonb_build_array(v_ref)
    then raise exception 'REQUEST_CONFLICT'; end if;
    return jsonb_build_object('id',v_existing.id,'work_item_id',v_work,'replayed',true);
  end if;

  insert into public.prometeo_change_thread_captures(
    workspace_id,thread_id,capture_id,revision,revision_ref,digest,state,created_at
  ) values (p_workspace_id,v_thread.id,v_capture.id,1,v_ref,v_capture.transcript_digest,'PENDING',v_capture.created_at)
  on conflict do nothing;

  insert into public.prometeo_execution_packets(
    workspace_id,thread_id,page_id,work_item_id,packet_token_hash,return_token_hash,
    selected_revision_refs,selected_attachment_ids,snapshot,snapshot_hash,return_path,status,expires_at
  ) values (
    p_workspace_id,v_thread.id,p_page_id,v_work,p_packet->>'packet_token_hash',p_packet->>'return_token_hash',
    array[v_ref],array[]::uuid[],p_packet->'snapshot',p_packet->>'snapshot_hash',p_packet->>'return_path',
    'READY',(p_packet->>'expires_at')::timestamptz
  );
  update public.prometeo_change_thread_captures set state='SUBMITTED',submitted_at=now()
    where workspace_id=p_workspace_id and thread_id=v_thread.id and revision_ref=v_ref and state='PENDING';
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'CAPTURE_ALREADY_ASSIGNED'; end if;
  update public.prometeo_change_threads set last_execution_at=now(),updated_at=now() where id=v_thread.id;
  return jsonb_build_object('work_item_id',v_work,'replayed',false);
end $$;
revoke all on function public.prometeo_one_turn_publish_packet_v1(uuid,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.prometeo_one_turn_publish_packet_v1(uuid,text,jsonb,jsonb) to service_role;
