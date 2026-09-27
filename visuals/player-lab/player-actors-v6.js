window.PROMETEO_PLAYER_ACTORS_V6 = {
  version: 6,
  cell: 128,
  self: {
    role: "PLAYER_HAND",
    source: "./hand-atlas-v3-inspect.webp",
    idleFrame: 8,
    petFrames: [8,7,6,5,6,7,8],
    anchor: "LOWER_RIGHT",
    rule: "One player hand only. Lower-right, same-side family, no palm-forward catalog frames."
  },
  pet: {
    role: "CARRIED_PET",
    heart: "../../arte/assets/footer/heart-mask-final-alpha.png",
    eye: {
      frameSource: "./player-eye-blink-v1.webp",
      frameCell: 96,
      frameCount: 10,
      blinkFrames: [0,1,2,3,4,5,6,7,8,9],
      openness: [1,1,.90,.58,.20,.05,.22,.60,.90,1],
      rule: "The generated monochrome eye frame is the eyelid/liner layer only. The eyeball and pupil are rendered independently behind it."
    },
    animation: ["IDLE","REACT","BLINK"],
    rule: "The carried pet has no human hands. Its only automatic face animation is an occasional blink."
  }
};
