/**
 * NoteD Web — Transcription Service
 * Mirrors iOS TranscriptionService.swift (Whisper.cpp HTTP server)
 */
class TranscriptionService {
  get serverURL() { return storage.getSetting('server_url', 'https://noted.thinkdiff.us'); }
  get language()  { return storage.getSetting('language', 'auto'); }

  // ── Transcribe audio blob via Whisper.cpp server ──────
  async transcribe(audioBlob, language = null) {
    const lang = language || this.language;
    const endpoint = `${this.serverURL}/inference`;

    let wavBlob = audioBlob;
    try {
      wavBlob = await this._convertToWav16k(audioBlob);
    } catch (e) {
      console.warn('Failed to convert audio to 16kHz mono WAV, sending original blob:', e);
    }

    const formData = new FormData();
    formData.append('file', wavBlob, 'audio.wav');
    formData.append('response_format', 'verbose_json');
    if (lang && lang !== 'auto') formData.append('language', lang);

    const resp = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Whisper server error: ${resp.status} ${resp.statusText} - ${errText}`);
    }

    const json = await resp.json();
    return this._parseWhisperResponse(json);
  }

  // ── Parse Whisper verbose_json response ───────────────
  _parseWhisperResponse(json) {
    const fullText = (json.text || '').trim();
    const segments = (json.segments || []).map(seg => new TranscriptSegment({
      id:        crypto.randomUUID(),
      startTime: seg.start || 0,
      endTime:   seg.end   || 0,
      text:      (seg.text || '').trim(),
      speaker:   null,
    }));

    return { fullText, segments };
  }

  // ── Check server availability ─────────────────────────
  async checkServer() {
    try {
      const resp = await fetch(`${this.serverURL}/`, { signal: AbortSignal.timeout(3000) });
      return resp.ok;
    } catch { return false; }
  }

  // ── Convert audio blob to 16kHz mono WAV PCM ──────────
  async _convertToWav16k(audioBlob) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    let audioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (err) {
      audioBuffer = await new Promise((resolve, reject) => {
        audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
      });
    }

    // Resample to 16000Hz mono using OfflineAudioContext
    const sampleRate = 16000;
    const numberOfChannels = 1;
    const offlineCtx = new OfflineAudioContext(
      numberOfChannels,
      Math.round(sampleRate * audioBuffer.duration),
      sampleRate
    );

    const bufferSource = offlineCtx.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(offlineCtx.destination);
    bufferSource.start();

    const renderedBuffer = await offlineCtx.startRendering();
    
    // Convert to 16-bit PCM WAV
    const bufferLength = renderedBuffer.length * 2;
    const wavBuffer = new ArrayBuffer(44 + bufferLength);
    const view = new DataView(wavBuffer);

    const writeString = (v, offset, str) => {
      for (let i = 0; i < str.length; i++) {
        v.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + bufferLength, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw PCM) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, numberOfChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numberOfChannels * 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, bufferLength, true);

    const result = renderedBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < result.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, result[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    // Close source context to release hardware resources
    if (audioCtx.state !== 'closed') {
      await audioCtx.close().catch(() => {});
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
  }
}

const transcriptionService = new TranscriptionService();
