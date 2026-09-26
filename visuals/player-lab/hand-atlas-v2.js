window.PROMETEO_HAND_ATLAS_V2 = {
  version: 2,
  cell: 96,
  columns: 10,
  rows: 10,
  source: "Prometeo Player hand atlas generated in-session with OpenAI image generation, then normalized into fixed 96px cells from the user-reviewed 10x10 grid.",
  asset: "./hand-atlas-player-v2.webp",
  actions: {
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
  frameCount: 10,
  notes: [
    "Every row is one action and every column is a progressive frame.",
    "The normalized atlas removes the source grid/labels and keeps each frame fully inside a fixed cell.",
    "The renderer uses screen compositing so the dark neutral frame background disappears into the scene without pretending it is transparent alpha."
  ]
};
