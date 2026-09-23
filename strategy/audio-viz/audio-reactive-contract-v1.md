# Prometeo Audio Reactive Contract v1

Purpose: one audio analysis stream, many independent visual renderers.

## Canonical live inputs
- timeDomain: Uint8Array from AnalyserNode.getByteTimeDomainData()
- frequency: Uint8Array from AnalyserNode.getByteFrequencyData()
- rms: root-mean-square computed from timeDomain
- smoothRms: smoothed RMS used for animation
- active: approximate voice/activity flag derived from smoothRms threshold
- bass: normalized average of low frequency bins
- mid: normalized average of middle frequency bins
- treble: normalized average of high frequency bins
- chunkIndex / chunkCount
- audio.currentTime / audio.duration
- globalProgress: progress across all TTS chunks

## Stable renderer rule
Renderers do not own audio playback and do not create their own AudioContext.
A single shared AnalyserNode feeds every renderer in one requestAnimationFrame loop.

## Current production-compatible source
- strategic state: prometeo_strategic_console_v2
- TTS endpoint: prometeo-strategy-audio-v1
- voice: prometeo-c-e1-ironic-clone-v4
- cache namespace: prometeo-strategy-c-e1-v4
- heard-state key: prometeo-strategy-heard-v1
- first chunk: 220 chars
- later chunks: 500 chars

## Current visual mappings
- mirrored waveform: timeDomain
- radial spectrum: frequency + smoothRms
- particle burst: bass + smoothRms + active
- orbit rings: bass/mid/treble
- oscilloscope trail: timeDomain + decay
- pulse orb: smoothRms + bass/mid/treble

## Future additions
- VAD probability instead of energy threshold
- pitch / F0 and pitch delta
- word timings
- phoneme / viseme timings
- emphasis events
- precomputed metadata track per TTS chunk
