import fs from "node:fs/promises";

const CONTRACT_SCHEMA = "prometeo.public-closure-pack/v1";
const ALLOWED_KEYS = new Set([
  "schema",
  "closure_id",
  "project_id",
  "objective_id",
  "run_id",
  "slot_id",
  "status",
  "completion_class",
  "closed_at",
  "source_refs",
  "result_refs",
  "verification_refs",
  "changed_refs",
  "boundary_codes",
  "next_refs",
  "retention_class"
]);
const REQUIRED_KEYS = [
  "schema",
  "closure_id",
  "project_id",
  "objective_id",
  "status",
  "completion_class",
  "closed_at",
  "source_refs",
  "result_refs",
  "retention_class"
];
const ARRAY_KEYS = new Set([
  "source_refs",
  "result_refs",
  "verification_refs",
  "changed_refs",
  "boundary_codes",
  "next_refs"
]);
const STATUS = new Set(["CLOSED", "BOUNDARY", "FAILED", "SUPERSEDED"]);
const COMPLETION = new Set(["SUCCESS", "BOUNDARY", "FAILED"]);
const RETENTION = new Set(["PUBLIC_DURABLE_CLOSURE", "PUBLIC_COMPACTED_EVIDENCE"]);
const SENSITIVE_KEY = /(prompt|transcript|message|audio|attachment|packet|payload|authorization|cookie|token|api[_-]?key|secret|password|signed[_-]?url|email|phone|address|location|pii)/i;
const TOKEN = /^[A-Za-z0-9._:/@+#-]+$/;
const EMAIL_VALUE = /^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;
const PHONE_VALUE = /^(?:\+\d{8,15}|\d{8,15})$/;
const URL_CREDENTIAL_VALUE = /^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/@]+@/;
const SECRET_VALUE = /^(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})$/;

function fail(code, detail) {
  const error = new Error(`${code}: ${detail}`);
  error.code = code;
  throw error;
}

function assertToken(value, name, max = 240) {
  if (typeof value !== "string" || value.length < 1 || value.length > max || !TOKEN.test(value)) {
    fail("UNSAFE_TOKEN", name);
  }
  if (value.includes("?") || value.includes("=") || value.includes("%") || value.includes("\\")) {
    fail("UNSAFE_TOKEN", name);
  }
  if (EMAIL_VALUE.test(value) || PHONE_VALUE.test(value) || URL_CREDENTIAL_VALUE.test(value) || SECRET_VALUE.test(value)) {
    fail("FORBIDDEN_VALUE_CLASS", name);
  }
  return value;
}

function scanKeys(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanKeys(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) fail("SENSITIVE_KEY", `${path}.${key}`);
    scanKeys(nested, `${path}.${key}`);
  }
}

function assertIsoUtc(value) {
  assertToken(value, "closed_at", 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    fail("INVALID_CLOSED_AT", "closed_at must be UTC ISO-8601");
  }
  return value;
}

function assertRefArray(value, name) {
  if (!Array.isArray(value)) fail("INVALID_ARRAY", name);
  if (value.length > 128) fail("ARRAY_TOO_LARGE", name);
  return value.map((item, index) => assertToken(item, `${name}[${index}]`, 512));
}

export function exportClosurePack(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("INVALID_INPUT", "root");
  scanKeys(input);

  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) fail("UNKNOWN_FIELD", key);
  }
  for (const key of REQUIRED_KEYS) {
    if (!(key in input)) fail("MISSING_FIELD", key);
  }

  if (input.schema !== CONTRACT_SCHEMA) fail("INVALID_SCHEMA", String(input.schema));
  if (!STATUS.has(input.status)) fail("INVALID_STATUS", String(input.status));
  if (!COMPLETION.has(input.completion_class)) fail("INVALID_COMPLETION_CLASS", String(input.completion_class));
  if (!RETENTION.has(input.retention_class)) fail("INVALID_RETENTION_CLASS", String(input.retention_class));

  const output = {};
  for (const key of ALLOWED_KEYS) {
    if (!(key in input)) continue;
    const value = input[key];
    if (ARRAY_KEYS.has(key)) output[key] = assertRefArray(value, key);
    else if (key === "closed_at") output[key] = assertIsoUtc(value);
    else if (["status", "completion_class", "retention_class", "schema"].includes(key)) output[key] = value;
    else output[key] = assertToken(value, key, 240);
  }

  return Object.freeze(output);
}

async function main(argv) {
  if (argv.length !== 2) {
    fail("USAGE", "node export-closure-pack.mjs <input.json> <output.json>");
  }
  const [inputPath, outputPath] = argv;
  const raw = await fs.readFile(inputPath, "utf8");
  const input = JSON.parse(raw);
  const output = exportClosurePack(input);
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx" });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.code || "EXPORT_FAILED"}: ${error.message}\n`);
    process.exitCode = 1;
  });
}
