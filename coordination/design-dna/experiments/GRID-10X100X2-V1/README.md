# GRID-10X100X2-V1

Status: **C / E0 ARMED — external fresh workers required**

This experiment tests whether Prometeo can recover the simple resident-worker loop while keeping modern durability underneath the worker ABI.

Current worker path:

```
BOOTSTRAP -> WORK -> SUBMIT_AND_NEXT -> WORK -> ... -> terminal
```

Current live batch: `GRID-10X100X2-V1-C-E0`.

Read `STATE.json` for exact status, `PRESERVATION_CONTRACT.json` for non-regression requirements, `SMOKE_RECEIPT.json` for already-exercised behavior and `LAUNCH_PROMPT.txt` for the identical fresh-chat invocation.

The 21st external launch is intentional overflow. Twenty seats exist (10 grids × 2); overflow must receive `NO_WORK`.

Do not infer full A/B/C success from C/E0 or from synthetic smoke evidence.
