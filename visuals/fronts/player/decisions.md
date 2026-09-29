# 🖐️ Player / Eye Frame · Durable Decisions

Status: CURRENT

- V21 remains the accepted blink baseline.
- V24 supersedes V23 for eye-content behavior.
- Eye content must not use continuously eased perfect-circle motion as its primary visual language.
- Eye-content motion is quantized into visible temporal and geometric steps.
- V24 renders the inner eye on a 24×16 logical buffer and upscales with nearest-neighbor sampling.
- Per-frame V21 aperture masking remains mandatory.
- Blink and eye-content clocks remain independent.
- Pupil dilation may end in full-black sclera.
- Pupil contraction may reveal red or other sclera colors while maintaining the pupil's prior center.
- Pupil shape may change between circle, oval, slit, thin slit, full aperture, dot, or none.
- Current V24 sequences: look_scan, dilate_to_black, contract_reveal_red, slit_breathe, inverse_scan.
- Local visual QA passed before publication.
- Player integration remains blocked until public review of V24.
