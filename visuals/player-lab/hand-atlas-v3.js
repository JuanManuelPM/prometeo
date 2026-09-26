window.PROMETEO_HAND_ATLAS_V3 = {
  version: 3,
  cell: 128,
  frameCount: 10,
  sourceSize: { width: 1280, height: 1280 },
  source: "Corrected 10x10 photographic hand grid generated in-session with OpenAI image generation. Current production uses row strips from the real 1280x1280 atlas.",
  strips: {
    IDLE: "./hand-atlas-v3-idle.webp",
    GRAB: "./hand-atlas-v3-grab.webp",
    PUSH: "./hand-atlas-v3-push.webp",
    INSPECT: "./hand-atlas-v3-inspect.webp",
    WEIRD: "./hand-atlas-v3-weird.webp"
  },
  sourceRows: {
    IDLE: 0,
    GRAB: 2,
    PUSH: 4,
    INSPECT: 7,
    WEIRD: 9
  },
  plannedRows: {
    IDLE: 0,
    REACH: 1,
    GRAB: 2,
    POINT: 3,
    PUSH: 4,
    ATTACK: 5,
    OFFER: 6,
    INSPECT: 7,
    PANIC: 8,
    WEIRD: 9
  },
  notes: [
    "Each strip contains ten 128x128 frames from one source row.",
    "The full hand silhouette is preserved inside the source cell with safe padding.",
    "Dark neutral source backgrounds are removed once at load time into an offscreen alpha canvas.",
    "V8 renders the keyed strip with normal source-over compositing; screen compositing is intentionally retired."
  ]
};
