/**
 * NoteD Web — Storage Service
 * Extends LocalStorage with MySQL API synchronization
 */
class StorageService {
  constructor() {
    this.RECORDINGS_KEY = 'noted_recordings';
    this.SETTINGS_KEY   = 'noted_settings';
    this.TOKEN_KEY      = 'noted_jwt_token';
    this.USER_KEY       = 'noted_user_profile';
    this.API_BASE_URL   = 'https://ainotes.thinkdiff.us'; // Production backend

    this._recordings    = [];
    this._listeners     = [];
    this._audioBlobs    = {}; // id → Blob (in-memory, not persisted)
    
    this.loadRecordings();
  }

  // ── API Fetch Helper ─────────────────────────────────
  async _fetch(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const resp = await fetch(`${this.API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || `HTTP error: ${resp.status}`);
    }

    return resp.json();
  }

  // ── Authentication Management ────────────────────────
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  saveToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.USER_KEY));
    } catch {
      return null;
    }
  }

  saveUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  clearUser() {
    localStorage.removeItem(this.USER_KEY);
  }

  async login(usernameOrEmail, password) {
    const data = await this._fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password })
    });

    this.saveToken(data.token);
    this.saveUser(data.user);
    
    // Sync recordings immediately on successful login
    await this.loadRecordings();
    return data.user;
  }

  async register(email, username, password, name) {
    const data = await this._fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, name })
    });

    this.saveToken(data.token);
    this.saveUser(data.user);
    
    // Sync recordings
    await this.loadRecordings();
    return data.user;
  }

  logout() {
    this.clearToken();
    this.clearUser();
    // Re-load local recordings (offline list)
    this.loadRecordings();
  }

  async updateProfile(name, email, bio) {
    const data = await this._fetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, email, bio, avatar_url: this.getUser()?.avatar_url })
    });

    const user = this.getUser() || {};
    user.name = name;
    user.email = email;
    user.bio = bio;
    this.saveUser(user);
    return user;
  }

  async updateProfileAvatar(avatarBase64) {
    const user = this.getUser() || {};
    const data = await this._fetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatar_url: avatarBase64
      })
    });

    user.avatar_url = avatarBase64;
    this.saveUser(user);
    return user;
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

  async loadRecordings() {
    const token = this.getToken();

    if (token) {
      try {
        const notes = await this._fetch('/api/notes');
        this._recordings = notes.map(r => RecordingModel.fromJSON(r));
        this._recordings.sort((a, b) => b.createdAt - a.createdAt);
        
        // Update local cache as backup
        this.saveRecordingsLocally();
        this._notify();
        return;
      } catch (err) {
        console.warn('Could not load from API, falling back to local cache:', err);
      }
    }

    // Offline / Fallback
    try {
      const data = localStorage.getItem(this.RECORDINGS_KEY);
      if (!data) {
        this._recordings = createSampleRecordings();
        this.saveRecordingsLocally();
      } else {
        const parsed = JSON.parse(data);
        this._recordings = parsed.map(r => RecordingModel.fromJSON(r));
      }
      this._recordings.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error('StorageService.loadRecordings error:', e);
      this._recordings = createSampleRecordings();
    }
    this._notify();
  }

  // Caches list locally in localStorage
  saveRecordingsLocally() {
    try {
      const data = this._recordings.map(r => r.toJSON());
      localStorage.setItem(this.RECORDINGS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('StorageService.saveRecordingsLocally error:', e);
    }
  }

  async addRecording(recording) {
    this._recordings.unshift(recording);
    this.saveRecordingsLocally();
    this._notify();

    if (this.getToken()) {
      try {
        await this._fetch('/api/notes', {
          method: 'POST',
          body: JSON.stringify(recording.toJSON())
        });
      } catch (err) {
        console.error('Error syncing new recording to MySQL backend:', err);
      }
    }
    return recording;
  }

  async updateRecording(recording) {
    const idx = this._recordings.findIndex(r => r.id === recording.id);
    if (idx !== -1) {
      this._recordings[idx] = recording;
      this.saveRecordingsLocally();
      this._notify();

      if (this.getToken()) {
        try {
          await this._fetch(`/api/notes/${recording.id}`, {
            method: 'PUT',
            body: JSON.stringify(recording.toJSON())
          });
        } catch (err) {
          console.error('Error syncing updated recording to MySQL backend:', err);
        }
      }
    }
  }

  async deleteRecording(recording) {
    this._recordings = this._recordings.filter(r => r.id !== recording.id);
    
    // Remove audio blob
    delete this._audioBlobs[recording.id];
    try { localStorage.removeItem(`noted_audio_${recording.id}`); } catch {}
    
    this.saveRecordingsLocally();
    this._notify();

    if (this.getToken()) {
      try {
        await this._fetch(`/api/notes/${recording.id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error('Error deleting recording from MySQL backend:', err);
      }
    }
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
      if (!dataURL) {
        // Fallback: Fetch audio from the server if logged in
        if (this.getToken()) {
          fetch(`${this.API_BASE_URL}/api/notes/${recordingId}/audio`, {
            headers: {
              'Authorization': `Bearer ${this.getToken()}`
            }
          })
            .then(resp => {
              if (resp.ok) return resp.blob();
              throw new Error('Not found on server');
            })
            .then(blob => {
              this._audioBlobs[recordingId] = blob;
              // Try to cache it locally as data URL
              const reader = new FileReader();
              reader.onload = () => {
                try { localStorage.setItem(`noted_audio_${recordingId}`, reader.result); } catch (e) {}
              };
              reader.readAsDataURL(blob);
              resolve(blob);
            })
            .catch(() => resolve(null));
        } else {
          resolve(null);
        }
        return;
      }
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
