import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm';

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriberPromise = null;
let activeId = null;

async function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-small',
      { device: 'wasm', dtype: 'q8' }
    );
  }
  return transcriberPromise;
}

self.onmessage = async event => {
  const data = event.data || {};
  if (data.type === 'warmup') {
    try { await getTranscriber(); self.postMessage({ type: 'model-ready' }); } catch {}
    return;
  }
  if (data.type !== 'transcribe' || !data.id || !data.audio || activeId) return;

  activeId = data.id;
  try {
    self.postMessage({ type: 'status', id: data.id, status: 'loading' });
    const transcriber = await getTranscriber();
    self.postMessage({ type: 'status', id: data.id, status: 'transcribing' });
    const result = await transcriber(new Float32Array(data.audio), {
      language: 'spanish',
      task: 'transcribe',
      do_sample: false,
      temperature: 0,
      num_beams: 5,
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false
    });
    const text = String(result?.text || '').replace(/\s+/g, ' ').trim();
    self.postMessage({ type: 'done', id: data.id, text });
  } catch (error) {
    self.postMessage({ type: 'error', id: data.id, error: error?.message || String(error) });
  } finally {
    activeId = null;
  }
};
