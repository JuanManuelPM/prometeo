import test from 'node:test';
import assert from 'node:assert/strict';
import { RecorderController } from '../shared/capture/v1/recorder.js';

class FakeMediaRecorder {
  static isTypeSupported(type) { return type.startsWith('audio/webm'); }
  constructor(stream, options = {}) {
    this.stream = stream;
    this.mimeType = options.mimeType || 'audio/webm';
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
  }
  start() { this.state = 'recording'; }
  pause() { this.state = 'paused'; }
  resume() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob([new Uint8Array(512)], { type: this.mimeType }) });
    queueMicrotask(() => this.onstop?.());
  }
}

test('Recorder saves two consecutive captures while reusing one live microphone stream', async () => {
  const originalNavigator = globalThis.navigator;
  const originalMediaRecorder = globalThis.MediaRecorder;
  const originalSecureContext = globalThis.isSecureContext;

  let gumCalls = 0;
  const stream = {
    active: true,
    tracksStopped: 0,
    getTracks() {
      return [{ stop: () => { this.tracksStopped += 1; this.active = false; } }];
    }
  };
  const savedCaptures = [];
  const audioBlobs = [];
  const leases = [];
  const released = [];
  const store = {
    async putAudioBlob(capture, blob) { audioBlobs.push({ id: capture.id, size: blob.size }); },
    async putCapture(capture) { savedCaptures.push(capture); }
  };
  const ownership = {
    snapshot: () => ({ focus: [] }),
    acquireFocus(owner) { const lease = { id: `lease-${leases.length + 1}`, owner }; leases.push(lease); return lease; },
    releaseFocus(lease) { released.push(lease.id); }
  };

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: async () => { gumCalls += 1; stream.active = true; return stream; } } }
  });
  globalThis.MediaRecorder = FakeMediaRecorder;
  globalThis.isSecureContext = true;

  const controller = new RecorderController({
    store,
    ownership,
    contextProvider: async () => ({
      page_id: 'calendar',
      source_path: '/prometeo/pages/calendar/',
      source_href: 'https://juanmanuelpm.github.io/prometeo/pages/calendar/',
      source_title: 'Calendar',
      viewport: { width: 360, height: 780, orientation: 'portrait' }
    })
  });

  try {
    const firstState = await controller.start();
    assert.equal(firstState.active, true);
    controller.pauseResume();
    assert.equal(controller.state().paused, true);
    controller.pauseResume();
    assert.equal(controller.state().paused, false);
    const first = await controller.save();

    const secondState = await controller.start();
    assert.equal(secondState.active, true);
    const second = await controller.save();

    assert.notEqual(first.id, second.id);
    assert.equal(first.processing_state, 'QUEUED');
    assert.equal(second.processing_state, 'QUEUED');
    assert.equal(first.audio.present, true);
    assert.equal(second.audio.present, true);
    assert.equal(gumCalls, 1, 'second capture should reuse the retained live stream');
    assert.deepEqual(audioBlobs.map(x => x.id), [first.id, second.id]);
    assert.deepEqual(savedCaptures.map(x => x.id), [first.id, second.id]);
    assert.equal(leases.length, 2);
    assert.deepEqual(released, leases.map(x => x.id));
  } finally {
    controller.close();
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: originalNavigator });
    globalThis.MediaRecorder = originalMediaRecorder;
    globalThis.isSecureContext = originalSecureContext;
  }
});
