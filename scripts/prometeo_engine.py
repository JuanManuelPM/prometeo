#!/usr/bin/env python3
import json, os, sys, urllib.parse, urllib.request
from datetime import datetime, timezone

BASE=os.getenv("SUPABASE_URL","https://catnohyouxqjjtseaueb.supabase.co").rstrip("/")+"/rest/v1/"
KEY=os.getenv("SUPABASE_ANON_KEY","sb_publishable_eqh3PngXs4UjLLWiY3pz1w_nhHtf7X-")
OUT=os.getenv("PROMETEO_ENGINE_OUT","state/prometeo-engine.json")

def get(path):
    req=urllib.request.Request(BASE+path,headers={"apikey":KEY,"Authorization":"Bearer "+KEY})
    with urllib.request.urlopen(req,timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))

def safe(path, default):
    try: return get(path)
    except Exception as e:
        return {"_error":type(e).__name__+":"+str(e)[:180],"data":default}

def first(x):
    if isinstance(x,list): return x[0] if x else {}
    if isinstance(x,dict) and "data" in x and isinstance(x["data"],list): return x["data"][0] if x["data"] else {}
    return x if isinstance(x,dict) else {}

minimal=first(safe("prometeo_control_minimal?select=*",[]))
ingress=first(safe("prometeo_control_ingress?select=*",[]))
cohorts=safe("prometeo_control_cohort_timing?select=*&order=cohort_last_seen_at.desc&limit=12",[])
guide=first(safe("prometeo_control_guide_latest?select=*",[]))
deaths=safe("prometeo_worker_deaths?select=death_id,worker_code,reason,detected_at,recovered_at,batch_id&order=detected_at.desc&limit=100",[])
flight=safe("prometeo_worker_flight_recorder?select=*&order=first_observed_at.desc&limit=120",[])
postmortems=safe("prometeo_worker_postmortems?select=death_id,worker_code,protocol_version,launch_batch,terminal_phase,terminal_state,observed_cause,inferred_cause,event_count,checkpoint_count,publish_count,tool_failure_count,observed_ms,productive_ms,work_pct,wait_pct,detected_at,recovered_at&order=death_id.desc&limit=120",[])
learning=first(safe("prometeo_runtime_learning_snapshot?select=*",[]))

if isinstance(cohorts,dict) and "data" in cohorts: cohorts=cohorts["data"]
if not isinstance(cohorts,list): cohorts=[]
if isinstance(deaths,dict) and "data" in deaths: deaths=deaths["data"]
if not isinstance(deaths,list): deaths=[]
if isinstance(flight,dict) and "data" in flight: flight=flight["data"]
if not isinstance(flight,list): flight=[]
if isinstance(postmortems,dict) and "data" in postmortems: postmortems=postmortems["data"]
if not isinstance(postmortems,list): postmortems=[]

invariants=[]
legacy_invariants=[]
for co in cohorts:
    s=int(co.get("sessions") or 0); e=int(co.get("entered") or 0); w=int(co.get("reached_work") or 0); p=int(co.get("published") or 0)
    item={"code":"COHORT_FUNNEL_IMPOSSIBLE","batch":co.get("launch_batch"),"protocol_version":co.get("protocol_version"),"sessions":s,"entered":e,"work":w,"published":p}
    if not (p<=w<=e<=s):
        if str(co.get("protocol_version") or "").upper()=="OBEY-V2":
            invariants.append(item)
        else:
            legacy_invariants.append(item)

for fr in flight:
    pubs=int(fr.get("publish_count") or 0)
    if pubs>0 and not fr.get("first_work_observed_at"):
        invariants.append({"code":"PUBLISH_WITHOUT_WORK_EVIDENCE","worker_code":fr.get("worker_code"),"session_id":fr.get("session_id"),"publish_count":pubs})

admitted_1m=int(ingress.get("admitted_1m") or 0)
ready=int(minimal.get("ready_jobs") or 0)
leased=int(minimal.get("leased_jobs") or 0)
recommended=int(minimal.get("recommended_open") or 0)
work_pct=float(minimal.get("batch_work_pct") or 0)
wait_pct=float(minimal.get("batch_wait_pct") or 0)
silent=int(minimal.get("silent_workers") or 0)

if admitted_1m>=8:
    bottleneck="INGRESS"
elif invariants:
    bottleneck="TELEMETRY"
elif silent>=3:
    bottleneck="LIVENESS"
elif wait_pct>max(15.0,work_pct):
    bottleneck="WAIT"
elif ready<10 and leased<5:
    bottleneck="WORK_SUPPLY"
else:
    bottleneck="EXECUTION"

snapshot={
  "schema_version":1,
  "generated_at":datetime.now(timezone.utc).isoformat(),
  "source":"github-actions-readonly-engine",
  "summary":{
    "recommended_open":recommended,
    "ready_jobs":ready,
    "leased_jobs":leased,
    "working_workers":int(minimal.get("working_workers") or 0),
    "silent_workers":silent,
    "dead_workers":int(minimal.get("dead_workers") or 0),
    "reservoir_ready":int(minimal.get("reservoir_ready") or 0),
    "latest_batch":minimal.get("latest_batch"),
    "work_pct":minimal.get("batch_work_pct"),
    "wait_pct":minimal.get("batch_wait_pct"),
    "ingress_admitted_1m":admitted_1m,
    "bottleneck":bottleneck
  },
  "guide":{
    "cycle_id":guide.get("cycle_id"),
    "status":guide.get("cycle_status"),
    "worker":guide.get("assigned_worker_code"),
    "decision":guide.get("decision"),
    "headline":guide.get("headline")
  },
  "invariants":invariants,
  "legacy_invariants":legacy_invariants,
  "cohorts":cohorts[:12],
  "flight_recorder":flight[:120],
  "postmortems":postmortems[:120],
  "runtime_learning":learning.get("snapshot") if isinstance(learning,dict) else None,
  "recent_deaths":deaths[:100],
  "engine_actions":{
    "requires_cognitive_attention": bool(invariants or bottleneck in {"INGRESS","TELEMETRY","LIVENESS"}),
    "suggested_focus": bottleneck,
    "deterministic_checks":["cohort_funnel","ingress_pressure","ready_supply","liveness","guide_presence"]
  }
}

os.makedirs(os.path.dirname(OUT),exist_ok=True)
tmp=OUT+".tmp"
with open(tmp,"w",encoding="utf-8") as f:
    json.dump(snapshot,f,ensure_ascii=False,indent=2,sort_keys=True)
    f.write("\n")
os.replace(tmp,OUT)
print(json.dumps({"ok":True,"out":OUT,"bottleneck":bottleneck,"invariants":len(invariants),"recommended_open":recommended}))
