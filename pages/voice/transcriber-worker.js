import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriberPromise = null;

function getTranscriber(jobId) {
  if (!transcriberPromise) {
    transcriberPromise = pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-small",
      {
        device: "wasm",
        dtype: "q8",
        progress_callback: info => {
          if (typeof info?.progress === "number") {
            self.postMessage({
              type: "model-progress",
              id: jobId,
              progress: Math.max(0, Math.min(100, Math.round(info.progress)))
            });
          }
        }
      }
    );
  }
  return transcriberPromise;
}

self.onmessage = async event => {
  const { type, id, audio } = event.data || {};
  if (type !== "transcribe" || !id || !audio) return;

  try {
    self.postMessage({ type: "status", id, status: "loading-model" });
    const transcriber = await getTranscriber(id);

    self.postMessage({ type: "status", id, status: "transcribing" });
    const samples = new Float32Array(audio);

    const result = await transcriber(samples, {
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
    self.postMessage({
      type: "error",
      id,
      error: error?.message || String(error)
    });
  }
};
