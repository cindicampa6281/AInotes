/**
 * NoteD Web — Recorder
 * Mirrors iOS RecordingViewModel using MediaRecorder + Web Audio API Analyser
 */
class Recorder {
  constructor() {
    this._stream       = null;
    this._mediaRecorder = null;
    this._chunks       = [];
    this._startTime    = null;
    this._pausedTime   = 0;
    this._pauseStart   = null;
    this._timerInterval = null;

    // Audio analyser for waveform
    this._audioContext = null;
    this._analyser     = null;
    this._animFrame    = null;

    // State
    this.isRecording   = false;
    this.isPaused      = false;
    this.currentTime   = 0;   // seconds
    this.audioLevels   = new Float32Array(40).fill(0);

    // Listeners
    this._listeners = {};
  }

  // ── Start Recording ───────────────────────────────────
  async start() {
    if (this.isRecording) return;

    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
    } catch (e) {
      this._emit('error', 'Không thể truy cập microphone: ' + e.message);
      return;
    }

    // Setup analyser
    this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = this._audioContext.createMediaStreamSource(this._stream);
    this._analyser = this._audioContext.createAnalyser();
    this._analyser.fftSize = 256;
    this._analyser.smoothingTimeConstant = 0.7;
    source.connect(this._analyser);

    // Determine MIME type
    const mimeType = this._getSupportedMimeType();

    this._chunks = [];
    this._mediaRecorder = new MediaRecorder(this._stream, { mimeType });
    this._mediaRecorder.addEventListener('dataavailable', e => {
      if (e.data.size > 0) this._chunks.push(e.data);
    });
    this._mediaRecorder.addEventListener('stop', () => this._onStop());

    this._mediaRecorder.start(100); // Collect every 100ms
    this._startTime   = Date.now();
    this._pausedTime  = 0;
    this.isRecording  = true;
    this.isPaused     = false;

    this._startTimer();
    this._startWaveform();
    this._emit('start');
  }

  // ── Pause / Resume ────────────────────────────────────
  pause() {
    if (!this.isRecording || this.isPaused) return;
    this._mediaRecorder?.pause();
    this._pauseStart = Date.now();
    this.isPaused = true;
    this._stopWaveform();
    this._emit('pause');
  }

  resume() {
    if (!this.isRecording || !this.isPaused) return;
    if (this._pauseStart) this._pausedTime += Date.now() - this._pauseStart;
    this._pauseStart = null;
    this._mediaRecorder?.resume();
    this.isPaused = false;
    this._startWaveform();
    this._emit('resume');
  }

  // ── Stop ──────────────────────────────────────────────
  stop() {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.isPaused    = false;
    clearInterval(this._timerInterval);
    this._stopWaveform();
    this._mediaRecorder?.stop();
    // stream tracks stopped in _onStop
  }

  discard() {
    this.stop();
    this._chunks     = [];
    this.currentTime = 0;
    this.isRecording = false;
    this.isPaused    = false;
    this._emit('discard');
  }

  // ── Internal: called when MediaRecorder fires 'stop' ─
  _onStop() {
    const mimeType = this._getSupportedMimeType();
    const blob = new Blob(this._chunks, { type: mimeType });
    const duration = this.currentTime;

    // Stop tracks
    this._stream?.getTracks().forEach(t => t.stop());
    this._stream = null;
    if (this._audioContext?.state !== 'closed') this._audioContext?.close();
    this._audioContext = null;
    this._analyser = null;

    this.currentTime = 0;
    this._emit('done', { blob, duration, mimeType });
  }

  // ── Timer ─────────────────────────────────────────────
  _startTimer() {
    clearInterval(this._timerInterval);
    this._timerInterval = setInterval(() => {
      if (this.isPaused) return;
      const elapsed = (Date.now() - this._startTime - this._pausedTime) / 1000;
      this.currentTime = elapsed;
      this._emit('tick', elapsed);
    }, 100);
  }

  // ── Waveform / Analyser ───────────────────────────────
  _startWaveform() {
    this._stopWaveform();
    const dataArray = new Uint8Array(this._analyser.frequencyBinCount);
    const barCount  = 40;

    const draw = () => {
      if (!this._analyser || this.isPaused) return;
      this._analyser.getByteFrequencyData(dataArray);

      const levels = new Float32Array(barCount);
      const step = Math.floor(dataArray.length / barCount);
      for (let i = 0; i < barCount; i++) {
        const start = i * step;
        let sum = 0;
        for (let j = start; j < start + step; j++) sum += dataArray[j];
        levels[i] = (sum / step) / 255; // 0..1
      }

      this.audioLevels = levels;
      this._emit('levels', levels);
      this._animFrame = requestAnimationFrame(draw);
    };

    this._animFrame = requestAnimationFrame(draw);
  }

  _stopWaveform() {
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
  }

  // ── MIME type detection ───────────────────────────────
  _getSupportedMimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  }

  // ── Events ────────────────────────────────────────────
  on(event, fn)  { (this._listeners[event] = this._listeners[event] || []).push(fn); return this; }
  off(event, fn) { this._listeners[event] = (this._listeners[event] || []).filter(l => l !== fn); }
  _emit(event, data) { (this._listeners[event] || []).forEach(fn => fn(data)); }
}

// ── Waveform Canvas Renderer ──────────────────────────
class WaveformRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.levels = new Float32Array(40).fill(0);
    this._animFrame = null;
  }

  start() {
    const draw = () => {
      this._draw();
      this._animFrame = requestAnimationFrame(draw);
    };
    this._animFrame = requestAnimationFrame(draw);
  }

  stop() {
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
    this._draw(); // draw final state
  }

  setLevels(levels) { this.levels = levels; }

  drawStatic() {
    const staticLevels = new Float32Array(40);
    for (let i = 0; i < 40; i++) {
      staticLevels[i] = 0.15 + Math.sin(i * 0.4) * 0.10 + Math.sin(i * 0.8) * 0.05;
    }
    this.levels = staticLevels;
    this._draw();
  }

  _draw() {
    const { canvas, ctx, levels } = this;
    const dpr = window.devicePixelRatio || 1;
    const w   = canvas.offsetWidth;
    const h   = canvas.offsetHeight;

    if (!w || !h) return;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const barCount  = levels.length;
    const barWidth  = (w / barCount) * 0.55;
    const gap       = (w / barCount) * 0.45;
    const minHeight = 3;
    const maxHeight = h * 0.8;
    const cy        = h / 2;

    // Gradient
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#617FFF');
    grad.addColorStop(1, '#9459FF');

    for (let i = 0; i < barCount; i++) {
      const x  = i * (barWidth + gap) + gap / 2;
      const lvl = Math.max(0, Math.min(1, levels[i]));
      const bh = minHeight + lvl * (maxHeight - minHeight);

      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.5 + lvl * 0.5;
      ctx.beginPath();
      ctx.roundRect(x, cy - bh/2, barWidth, bh, barWidth/2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

const recorder = new Recorder();
