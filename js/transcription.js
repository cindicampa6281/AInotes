/**
 * NoteD Web — Transcription Service
 * Mirrors iOS TranscriptionService.swift (Whisper.cpp HTTP server)
 */
class TranscriptionService {
  get serverURL() { return storage.getSetting('server_url', 'http://localhost:8080'); }
  get language()  { return storage.getSetting('language', 'auto'); }

  // ── Transcribe audio blob via Whisper.cpp server ──────
  async transcribe(audioBlob, language = null) {
    const lang = language || this.language;
    const endpoint = `${this.serverURL}/inference`;

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('response_format', 'verbose_json');
    if (lang && lang !== 'auto') formData.append('language', lang);

    const resp = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!resp.ok) {
      throw new Error(`Whisper server error: ${resp.status} ${resp.statusText}`);
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
}

const transcriptionService = new TranscriptionService();
