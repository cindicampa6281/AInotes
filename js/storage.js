/**
 * NoteD Web — Storage Service
 * Mirrors iOS StorageService (UserDefaults → localStorage)
 */
class StorageService {
  constructor() {
    this.RECORDINGS_KEY = 'noted_recordings';
    this.SETTINGS_KEY   = 'noted_settings';
    this._recordings    = [];
    this._listeners     = [];
    this._audioBlobs    = {}; // id → Blob (in-memory, not persisted)
    this.loadRecordings();
  }

  // ── Settings ─────────────────────────────────────────
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || '{}');
    } catch { return {}; }
  }

  saveSetting(key, value) {
    const s = this.getSettings();
    s[key] = value;
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(s));
  }

  getSetting(key, defaultValue = '') {
    return this.getSettings()[key] ?? defaultValue;
  }

  // ── Recordings ────────────────────────────────────────
  get recordings() { return this._recordings; }

  loadRecordings() {
    try {
      const data = localStorage.getItem(this.RECORDINGS_KEY);
      if (!data) {
        this._recordings = createSampleRecordings();
        this.saveRecordings();
      } else {
        const parsed = JSON.parse(data);
        this._recordings = parsed.map(r => RecordingModel.fromJSON(r));
      }
      // Sort by createdAt desc
      this._recordings.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error('StorageService.loadRecordings error:', e);
      this._recordings = createSampleRecordings();
    }
    this._notify();
  }

  saveRecordings() {
    try {
      const data = this._recordings.map(r => r.toJSON());
      localStorage.setItem(this.RECORDINGS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('StorageService.saveRecordings error:', e);
    }
  }

  addRecording(recording) {
    this._recordings.unshift(recording);
    this.saveRecordings();
    this._notify();
    return recording;
  }

  updateRecording(recording) {
    const idx = this._recordings.findIndex(r => r.id === recording.id);
    if (idx !== -1) {
      this._recordings[idx] = recording;
      this.saveRecordings();
      this._notify();
    }
  }

  deleteRecording(recording) {
    this._recordings = this._recordings.filter(r => r.id !== recording.id);
    // Remove audio blob
    delete this._audioBlobs[recording.id];
    // Remove stored audio from localStorage
    try { localStorage.removeItem(`noted_audio_${recording.id}`); } catch {}
    this.saveRecordings();
    this._notify();
  }

  // ── Audio Blob Storage ────────────────────────────────
  saveAudioBlob(recordingId, blob) {
    this._audioBlobs[recordingId] = blob;
    // Also save as base64 for persistence across page loads
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(`noted_audio_${recordingId}`, reader.result);
      } catch (e) {
        console.warn('Could not persist audio to localStorage (quota):', e);
      }
    };
    reader.readAsDataURL(blob);
  }

  getAudioBlob(recordingId) {
    if (this._audioBlobs[recordingId]) return Promise.resolve(this._audioBlobs[recordingId]);

    // Try to load from localStorage
    return new Promise((resolve) => {
      const dataURL = localStorage.getItem(`noted_audio_${recordingId}`);
      if (!dataURL) { resolve(null); return; }
      fetch(dataURL)
        .then(r => r.blob())
        .then(blob => {
          this._audioBlobs[recordingId] = blob;
          resolve(blob);
        })
        .catch(() => resolve(null));
    });
  }

  getAudioURL(recordingId) {
    const blob = this._audioBlobs[recordingId];
    if (blob) return URL.createObjectURL(blob);
    return null;
  }

  // ── Listeners ─────────────────────────────────────────
  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  _notify() { this._listeners.forEach(fn => fn(this._recordings)); }
}

// Singleton
const storage = new StorageService();
