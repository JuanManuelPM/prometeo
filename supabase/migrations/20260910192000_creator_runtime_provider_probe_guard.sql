-- Creator Runtime v8: a generic built-in declaration must not overwrite a failed real probe.
create or replace function public.creator_provider_preserve_probe_state()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if old.kind='voice' and old.provider='edge-neural' and old.mode='BLOCKED'
     and new.kind='voice' and new.provider='edge-neural'
     and coalesce(new.last_probe->>'source','')='existing casa-tts deployment' then
    new.mode:=old.mode;
    new.verified_at:=old.verified_at;
    new.last_probe:=old.last_probe;
    new.last_error:=old.last_error;
  end if;
  return new;
end $$;
drop trigger if exists creator_provider_preserve_probe_state_trg on public.creator_provider_connections;
create trigger creator_provider_preserve_probe_state_trg before update on public.creator_provider_connections for each row execute function public.creator_provider_preserve_probe_state();