window.PROMETEO_PLAYER_ACTORS_V4 = {
  version: 4,
  cell: 128,
  frameCount: 10,
  self: {
    source: "./hand-atlas-v3-inspect.webp",
    role: "PLAYER_HAND",
    idleFrames: [1,2,3,4,3,2],
    petFrames: [1,2,3,4,5,6,7,8,7,6],
    rule: "Own hand only: anchored to the lower-right camera edge, wrist continues off-screen, fingers aim into the scene/pet. Never render the palm-facing catalog frames as the default player hand."
  },
  other: {
    role: "FRONT_ACTOR_HANDS",
    enabled: false,
    sources: {
      REACH: "./hand-atlas-v3-grab.webp",
      PRESS: "./hand-atlas-v3-push.webp",
      WEIRD: "./hand-atlas-v3-weird.webp"
    },
    rule: "These belong to a separate actor in front of the camera. They must never be silently mixed into PLAYER_HAND animation."
  },
  pet: {
    role: "CARRIED_PET",
    mask: "../../strategy/mask-mouth/assets/mask-transparent.webp",
    maskSolid: "../../strategy/mask-mouth/assets/mask.webp",
    heart: "../../arte/assets/footer/heart-mask-final-alpha.png",
    rule: "The carried foreground relic is a living pet: stable front-center position, breathing/bobbing idle, recoil/heartbeat response when the player's hand pets it."
  }
};
