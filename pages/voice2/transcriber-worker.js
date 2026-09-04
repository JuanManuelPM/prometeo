import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriberPromise = null;
let queue = [];
let busy = false;

async function getTranscriber(id = null) {
  if (!transcriberPromise) {
    transcriberPromise = pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-small",
      {
        device: "wasm",
        dtype: "q8",
        progress_callback: info => {
          if (id && typeof info?.progress === "number") {
            self.postMessage({
              type: "model-progress",
              id,
              progress: Math.max(0, Math.min(100, Math.round(info.progress)))
            });
          }
        }
      }
    );
  }
  return transcriberPromise;
}

async function run(job) {
  busy = true;
  const { id, audio } = job;
  try {
    self.postMessage({ type: "status", id, status: "loading" });
    const transcriber = await getTranscriber(id);
    self.postMessage({ type: "status", id, status: "transcribing" });
    const result = await transcriber(new Float32Array(audio), {
      language: "spanish",
      task: "transcribe",
      do_sample: false,
      temperature: 0,
      num_beams: 5,
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false
    });
    const text = String(result?.text || "").replace(/\s+/g, " ").trim();
    self.postMessage({ type: "done", id, text });
  } catch (error) {
    self.postMessage({ type: "error", id, error: error?.message || String(error) });
  } finally {
    busy = false;
    pump();
  }
}

function pump() {
  if (busy || queue.length === 0) return;
  run(queue.shift());
}

self.onmessage = event => {
  const data = event.data || {};
  if (data.type === "warmup") {
    getTranscriber().then(
      () => self.postMessage({ type: "model-ready" }),
      () => {}
    );
    return;
  }
  if (data.type === "transcribe" && data.id && data.audio) {
    queue.push({ id: data.id, audio: data.audio });
    self.postMessage({ type: "queued", id: data.id, position: queue.length + (busy ? 1 : 0) });
    pump();
  }
};
