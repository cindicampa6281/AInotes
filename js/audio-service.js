/**
 * NoteD Web — Audio Service (Playback)
 * Mirrors iOS AudioService.swift using Web Audio API + HTML5 Audio
 */
class AudioService {
  constructor() {
    this._audio     = null;
    this._context   = null;
    this._source    = null;
    this._isPlaying = false;
    this._listeners = { play: [], pause: [], timeupdate: [], ended: [], error: [] };
    this._animFrame = null;
  }

  get isPlaying() { return this._isPlaying; }
  get currentTime() { return this._audio ? this._audio.currentTime : 0; }
  get duration() { return this._audio ? (this._audio.duration || 0) : 0; }

  // ── Load & Play ───────────────────────────────────────
  async loadAndPlay(blobOrURL) {
    this.stop();

    const url = blobOrURL instanceof Blob
      ? URL.createObjectURL(blobOrURL)
      : blobOrURL;

    this._audio = new Audio();
    this._audio.src = url;
    this._audio.preload = 'auto';

    this._audio.addEventListener('play',   () => { this._isPlaying = true;  this._emit('play'); this._startTimeUpdate(); });
    this._audio.addEventListener('pause',  () => { this._isPlaying = false; this._emit('pause'); this._stopTimeUpdate(); });
    this._audio.addEventListener('ended',  () => { this._isPlaying = false; this._emit('ended'); this._stopTimeUpdate(); });
    this._audio.addEventListener('error',  (e) => this._emit('error', e));
    this._audio.addEventListener('timeupdate', () => this._emit('timeupdate', this._audio.currentTime));

    try {
      await this._audio.play();
    } catch (e) {
      console.warn('AudioService.loadAndPlay:', e);
      this._emit('error', e);
    }
  }

  async load(blobOrURL) {
    this.stop();
    const url = blobOrURL instanceof Blob ? URL.createObjectURL(blobOrURL) : blobOrURL;
    this._audio = new Audio();
    this._audio.src = url;
    this._audio.preload = 'auto';

    this._audio.addEventListener('play',   () => { this._isPlaying = true;  this._emit('play'); this._startTimeUpdate(); });
    this._audio.addEventListener('pause',  () => { this._isPlaying = false; this._emit('pause'); this._stopTimeUpdate(); });
    this._audio.addEventListener('ended',  () => { this._isPlaying = false; this._emit('ended'); this._stopTimeUpdate(); });
    this._audio.addEventListener('error',  (e) => this._emit('error', e));
    this._audio.addEventListener('timeupdate', () => this._emit('timeupdate', this._audio.currentTime));
  }

  // ── Controls ──────────────────────────────────────────
  async play() {
    if (!this._audio) return;
    try { await this._audio.play(); } catch(e) { console.warn(e); }
  }

  pause() { this._audio?.pause(); }

  stop() {
    if (this._audio) {
      this._audio.pause();
      this._audio.src = '';
      this._audio = null;
    }
    this._isPlaying = false;
    this._stopTimeUpdate();
  }

  seekTo(time) {
    if (!this._audio) return;
    this._audio.currentTime = Math.max(0, Math.min(time, this.duration));
    this._emit('timeupdate', this._audio.currentTime);
  }

  skipForward(seconds = 10) { this.seekTo(this.currentTime + seconds); }
  skipBackward(seconds = 10) { this.seekTo(this.currentTime - seconds); }

  setPlaybackRate(rate) {
    if (this._audio) this._audio.playbackRate = rate;
  }

  togglePlay() {
    if (!this._audio) return;
    if (this._isPlaying) this.pause();
    else this.play();
  }

  // ── Time update via requestAnimationFrame ─────────────
  _startTimeUpdate() {
    this._stopTimeUpdate();
    const tick = () => {
      if (!this._audio || !this._isPlaying) return;
      this._emit('timeupdate', this._audio.currentTime);
      this._animFrame = requestAnimationFrame(tick);
    };
    this._animFrame = requestAnimationFrame(tick);
  }

  _stopTimeUpdate() {
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
  }

  // ── Event System ──────────────────────────────────────
  on(event, fn)  { (this._listeners[event] = this._listeners[event] || []).push(fn); return this; }
  off(event, fn) { this._listeners[event] = (this._listeners[event] || []).filter(l => l !== fn); }
  _emit(event, data) { (this._listeners[event] || []).forEach(fn => fn(data)); }

  destroy() {
    this.stop();
    this._listeners = {};
  }
}
