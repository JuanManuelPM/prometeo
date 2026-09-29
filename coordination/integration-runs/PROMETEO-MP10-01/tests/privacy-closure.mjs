import assert from "node:assert/strict";
import { exportClosurePack } from "../../../storage-recovery/github-native-v1/export-closure-pack.mjs";

const safe = {
  schema: "prometeo.public-closure-pack/v1",
  closure_id: "PROMETEO-MP10-01:R007",
  project_id: "prometeo-control-room",
  objective_id: "PROMETEO-USABLE-CONTROL-ROOM-V1",
  run_id: "PROMETEO-MP10-01",
  slot_id: "R007",
  status: "CLOSED",
  completion_class: "SUCCESS",
  closed_at: "2026-09-29T03:24:00Z",
  source_refs: ["coordination/integration-runs/PROMETEO-MP10-01/returns/S010.json"],
  result_refs: ["coordination/integration-runs/PROMETEO-MP10-01/reallocation/R007.json"],
  verification_refs: [],
  changed_refs: [],
  boundary_codes: [],
  next_refs: [],
  retention_class: "PUBLIC_COMPACTED_EVIDENCE"
};

const exported = exportClosurePack(safe);
assert.equal(exported.schema, safe.schema);
assert.equal(Object.isFrozen(exported), true);

const rejected = [];
function mustReject(name, candidate) {
  assert.throws(
    () => exportClosurePack(candidate),
    error => {
      rejected.push({name, code:error?.code||"UNKNOWN"});
      return true;
    },
    name
  );
}

mustReject("transcript_key", {...safe, transcript:"PRIVATE"});
mustReject("unknown_free_text", {...safe, summary:"PRIVATE HUMAN TEXT"});
mustReject("signed_query_ref", {...safe, source_refs:["https://example.invalid/x?token=secret"]});
mustReject("nested_ref_object", {...safe, source_refs:[{ref:"coordination/private"}]});
mustReject("authorization_key", {...safe, authorization:"Bearer synthetic"});
mustReject("private_packet_key", {...safe, private_packet:"opaque"});
mustReject("percent_encoded_ref", {...safe, result_refs:["coordination/x%3Ftoken"]});

const privacyFailures = [];

function mustBeForbiddenButIsAccepted(code, candidate, field, expected) {
  let output;
  let threw = false;
  try {
    output = exportClosurePack(candidate);
  } catch {
    threw = true;
  }
  if (!threw && output?.[field] === expected) {
    privacyFailures.push({code, field, accepted_value:expected});
  }
}

mustBeForbiddenButIsAccepted(
  "FORBIDDEN_CLASS_EMAIL_VALUE_ACCEPTED",
  {...safe, project_id:"alice@example.com"},
  "project_id",
  "alice@example.com"
);
mustBeForbiddenButIsAccepted(
  "FORBIDDEN_CLASS_PHONE_VALUE_ACCEPTED",
  {...safe, closure_id:"+14155551212"},
  "closure_id",
  "+14155551212"
);

assert.deepEqual(
  privacyFailures.map(x=>x.code),
  ["FORBIDDEN_CLASS_EMAIL_VALUE_ACCEPTED","FORBIDDEN_CLASS_PHONE_VALUE_ACCEPTED"]
);

process.stdout.write(JSON.stringify({
  schema:"prometeo.multipyramid-r007-adversarial-test/v1",
  harness_result:"PASS",
  audited_candidate_result:"FAIL",
  positive_controls:2,
  fail_closed_controls:rejected,
  privacy_failures:privacyFailures,
  truth_boundary:"The harness passed by reproducing forbidden private-value acceptance; S010 privacy claim is not independently verified."
})+"\n");
