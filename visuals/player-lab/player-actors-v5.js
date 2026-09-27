window.PROMETEO_PLAYER_ACTORS_V5 = {
  version: 5,
  cell: 128,
  self: {
    role: "PLAYER_HAND",
    source: "./hand-atlas-v3-inspect.webp",
    idleFrame: 8,
    petFrames: [8,7,6,5,6,7,8],
    anchor: "LOWER_RIGHT",
    rule: "One player hand only. Always the same lower-right family from the generated strip. No left/right alternation, no palm-forward catalog frames, no camera-facing hand poses."
  },
  pet: {
    role: "CARRIED_PET",
    mask: "../../strategy/mask-mouth/assets/mask-transparent.webp",
    heart: "../../arte/assets/footer/heart-mask-final-alpha.png",
    animation: ["IDLE","REACT"],
    rule: "The carried pet has no human hands. It only idles and reacts to touch."
  }
};
