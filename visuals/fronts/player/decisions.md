# 🖐️ Player / Eye Content · Durable Decisions

Status: CURRENT

- Preserve V21 blink/frame animation unchanged.
- Internal eye content is a separate subsystem behind the frame.
- The frame pivot and the eye-content center are not the same coordinate.
- Frame pivot: [64,86].
- Content center: [64,70].
- Open aperture bbox: [38,54,90,86].
- Safe content bbox: [42,58,86,82].
- Use the accepted V21 open frame as the repeated authoring reference.
- Use 10×10 only for visual exploration.
- Use 2×5 for one concrete ten-frame animation.
- Reduce free variables: do not ask the generator to redesign the frame while designing the interior.
- Generated grids remain authoring input, never runtime truth.
- Selected content sequences go through the same normalization/QA discipline as the accepted frame animation.
- Pupil/iris motion must never alter frame pivot or blink alignment.
