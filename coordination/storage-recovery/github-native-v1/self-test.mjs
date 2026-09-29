import assert from "node:assert/strict";
import { exportClosurePack } from "./export-closure-pack.mjs";

const safe = {
  schema: "prometeo.public-closure-pack/v1",
  closure_id: "PROMETEO-MP10-01:S010",
  project_id: "prometeo-control-room",
  objective_id: "PROMETEO-USABLE-CONTROL-ROOM-V1",
  run_id: "PROMETEO-MP10-01",
  slot_id: "S010",
  status: "CLOSED",
  completion_class: "SUCCESS",
  closed_at: "2026-09-29T03:20:00Z",
  source_refs: [
    "coordination/launch-packets/PROMETEO-MP10-01/PACKET.json"
  ],
  result_refs: [
    "coordination/integration-runs/PROMETEO-MP10-01/returns/S010.json"
  ],
  verification_refs: [],
  changed_refs: [
    "coordination/storage-recovery/github-native-v1/CLOSURE_PACK_CONTRACT.json"
  ],
  boundary_codes: [],
  next_refs: [
    "coordination/integration-runs/PROMETEO-MP10-01/reallocation/R007.json"
  ],
  retention_class: "PUBLIC_DURABLE_CLOSURE"
};

const exported = exportClosurePack(safe);
assert.equal(exported.schema, safe.schema);
assert.deepEqual(exported.result_refs, safe.result_refs);
assert.equal(Object.isFrozen(exported), true);

assert.throws(
  () => exportClosurePack({ ...safe, transcript: "synthetic-private-example" }),
  /SENSITIVE_KEY/
);

assert.throws(
  () => exportClosurePack({ ...safe, summary: "free text is intentionally not exportable" }),
  /UNKNOWN_FIELD/
);

assert.throws(
  () => exportClosurePack({ ...safe, result_refs: ["https://example.invalid/file?token=synthetic"] }),
  /UNSAFE_TOKEN/
);

assert.throws(
  () => exportClosurePack({ ...safe, closed_at: "not-a-time" }),
  /INVALID_CLOSED_AT/
);

assert.throws(
  () => exportClosurePack({ ...safe, project_id: "alice@example.com" }),
  /FORBIDDEN_VALUE_CLASS/
);

assert.throws(
  () => exportClosurePack({ ...safe, closure_id: "+14155551212" }),
  /FORBIDDEN_VALUE_CLASS/
);

assert.throws(
  () => exportClosurePack({ ...safe, objective_id: "ghp_123456789012345678901234567890" }),
  /FORBIDDEN_VALUE_CLASS/
);

assert.throws(
  () => exportClosurePack({ ...safe, source_refs: [{ ref: "coordination/private" }] }),
  /UNSAFE_TOKEN/
);

process.stdout.write("PASS closure-pack fail-closed self-test\n");
