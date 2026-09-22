# Prometeo Global Control Plane

## Stable worker bootstrap

Human prompt:

```
OBEY
https://juanmanuelpm.github.io/prometeo/o/
```

The URL is permanent. Protocol details may evolve behind it without changing the human prompt.

## Core model

A worker is global capacity, not a member of one project.

Lifecycle:

```
ENTER -> WORK -> PUBLISH -> NEXT -> WAIT -> WORK -> ...
```

A worker may move between projects after any completed job. Current work is preserved unless explicitly stopped.

## Worker controls

### Retarget one worker after its current job

```sql
select public.prometeo_retarget_worker('K017','VISUAL-LAB');
```

### Retarget an inclusive worker range

```sql
select public.prometeo_retarget_range(10,25,'VISUAL-LAB');
```

### Change worker rank

Ranks are 0–4.

```sql
select public.prometeo_set_worker_rank('K017',2);
```

### Stop a worker safely after current work

```sql
select public.prometeo_stop_worker('K017',true);
```

## Project controls

Project policy includes:

- priority
- min_parallelism
- desired_parallelism
- max_parallelism
- status: OPEN / RUNNING / PAUSED / DRAINING / DONE / ABORTED

Example:

```sql
select public.prometeo_set_project_policy(
  'VISUAL-LAB',
  100,
  4,
  12,
  20,
  'RUNNING'
);
```

DRAINING prevents new assignments while allowing current leases to finish.

## Create project

```sql
select public.prometeo_create_project(
  'VISUAL-LAB',
  'Visual Lab',
  'Improve Prometeo observability and spatial visualization.',
  80,
  2,
  8,
  20,
  true,
  500,
  false
);
```

## Add job

```sql
select public.prometeo_add_job(
  'VISUAL-LAB',
  'V001',
  'Worker board',
  'Design the first spatial worker board.',
  'Produce a precise implementation specification.',
  '{}'::jsonb,
  10,
  0,
  300,
  800,
  1600,
  '[]'::jsonb
);
```

Dependencies can reference jobs from any global project:

```json
[
  {"project_id":"SKILLS","job_key":"S004"}
]
```

## Scheduling

The scheduler:

1. reaps stale leases;
2. refreshes dependency readiness;
3. honors explicit worker retargets;
4. satisfies projects below minimum parallelism first;
5. then projects below desired parallelism;
6. then priority;
7. never exceeds project max parallelism;
8. prioritizes rescue work;
9. keeps workers resident when no work is currently ready.

There is no global worker-count cap.

## Safety

Public browser access is read-only.
Mutations are performed through protected server functions/tools.
Late results are fenced by lease tokens.
Workers do not choose identity, project, or task.
