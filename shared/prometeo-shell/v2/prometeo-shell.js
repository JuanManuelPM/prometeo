/**
 * Prometeo Global Shell v2 — RETIRED COMPATIBILITY STUB
 *
 * The global navigation / notes / capture surface is now owned exclusively by
 * the Universal Shell at /prometeo/. Historical pages may still include this
 * module, so this file intentionally performs no UI mount.
 *
 * Keeping the path alive avoids breaking old HTML while enforcing the invariant:
 * exactly one global Prometeo shell per browsing session.
 *
 * The former v2 implementation remains recoverable from Git history/blob
 * 94f89e21c2bda4e0cc038b55ee77daa2d6b4130f.
 */

try {
  localStorage.removeItem('prometeo.shell.enabled.v1');
} catch {}

window.__PROMETEO_LEGACY_SHELL_RETIRED__ = true;
