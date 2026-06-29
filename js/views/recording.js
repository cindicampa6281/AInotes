/**
 * NoteD Web — Recording Modal
 * Mirrors iOS RecordingView.swift
 */
class RecordingModal {
  constructor() {
    this._modal      = null;
    this._canvas     = null;
    this._waveform   = null;
    this._timerEl    = null;
    this._statusEl   = null;
    this._title      = 'Ghi âm mới';
    this._onComplete = null;

    this._recUnsubTick   = null;
    this._recUnsubLevels = null;
    this._recUnsubDone   = null;
    this._recUnsubError  = null;

    this._build();
  }

  // ── Build DOM ─────────────────────────────────────────
  _build() {
    this._modal = el('div', { class: 'modal', id: 'recordingModal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Ghi âm' });
    this._modal.innerHTML = `
      <div class="modal__content recording-modal-bg" style="border-radius:var(--radius-2xl);max-height:85vh">
        <!-- Top bar -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-4) var(--space-5);flex-shrink:0">
          <button class="btn--ghost" id="rmCancel" style="padding:var(--space-2) var(--space-4);border-radius:var(--radius-full)">
            ${icon('chevronLeft', 14).outerHTML} Huỷ
          </button>
          <div id="rmRecBadge" class="hidden">
            <span class="rec-badge"><span class="rec-dot"></span> REC</span>
          </div>
          <div style="width:60px"></div>
        </div>

        <!-- Processing view (hidden by default) -->
        <div id="rmProcessing" class="processing-overlay hidden">
          <div class="processing-rings">
            <div class="processing-ring"></div>
            <div class="processing-ring"></div>
            <div class="processing-ring"></div>
            <div class="processing-center">${icon('waveform', 36).outerHTML}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:var(--text-2xl);font-weight:var(--weight-bold);margin-bottom:var(--space-3)">Đang xử lý...</div>
            <div id="rmProcessMsg" style="font-size:var(--text-base);color:var(--text-secondary)">Đang chuẩn bị...</div>
          </div>
        </div>

        <!-- Recording content -->
        <div id="rmContent" style="display:flex;flex-direction:column;align-items:center;flex:1;padding:0 var(--space-6) var(--space-8)">
          <!-- Title -->
          <div style="text-align:center;margin-bottom:var(--space-6)">
            <div id="rmTitleDisplay" style="font-size:22px;font-weight:var(--weight-semibold);color:var(--text-primary);cursor:pointer;display:flex;align-items:center;gap:var(--space-2);justify-content:center">
              <span id="rmTitleText">Ghi âm mới</span>
              <span style="font-size:14px;color:var(--text-tertiary)">${icon('import', 12).outerHTML}</span>
            </div>
            <input type="text" id="rmTitleInput" class="input-field hidden" style="text-align:center;margin-top:var(--space-2);max-width:280px" value="Ghi âm mới" placeholder="Tên ghi âm" />
            <div id="rmStatusText" style="font-size:13px;color:var(--text-secondary);margin-top:var(--space-2)">Nhấn để bắt đầu</div>
          </div>

          <!-- Waveform canvas -->
          <div style="width:100%;margin-bottom:var(--space-6);position:relative">
            <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center, rgba(97,127,255,0.1) 0%, transparent 70%);pointer-events:none" id="rmGlow" class="hidden"></div>
            <canvas id="rmCanvas" class="waveform-canvas"></canvas>
          </div>

          <!-- Timer -->
          <div style="text-align:center;margin-bottom:var(--space-6)">
            <div id="rmTimer" class="rec-timer">00:00</div>
            <div id="rmPausedLabel" class="hidden" style="font-size:11px;font-weight:700;color:var(--color-orange);letter-spacing:2px;margin-top:4px">TẠM DỪNG</div>
          </div>

          <!-- Controls -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-8)">
            <div style="display:flex;align-items:center;gap:48px">
              <!-- Discard -->
              <button id="rmDiscard" class="btn--icon press-scale hidden" style="width:56px;height:56px;font-size:20px" aria-label="Huỷ ghi âm">
                ${icon('trash', 22).outerHTML}
              </button>

              <!-- Main button -->
              <button id="rmMainBtn" class="recording-fab press-scale" aria-label="Bắt đầu ghi âm">
                <div id="rmMainBtnInner" class="recording-fab__inner">
                  ${icon('mic', 28).outerHTML}
                </div>
              </button>

              <!-- Pause/Resume -->
              <button id="rmPauseBtn" class="btn--icon press-scale hidden" style="width:56px;height:56px;font-size:20px" aria-label="Tạm dừng">
                ${icon('pause', 22).outerHTML}
              </button>
            </div>

            <div id="rmHint" style="font-size:12px;color:var(--text-tertiary)">Nhấn ● để bắt đầu ghi âm</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this._modal);
    this._bindEvents();

    // Setup waveform
    this._canvas   = this._modal.querySelector('#rmCanvas');
    this._waveform = new WaveformRenderer(this._canvas);
    this._waveform.drawStatic();
  }

  // ── Events ────────────────────────────────────────────
  _bindEvents() {
    this._modal.querySelector('#rmCancel').addEventListener('click', () => this.close());

    // Title editing
    const titleDisplay = this._modal.querySelector('#rmTitleDisplay');
    const titleInput   = this._modal.querySelector('#rmTitleInput');
    const titleText    = this._modal.querySelector('#rmTitleText');

    titleDisplay.addEventListener('click', () => {
      titleDisplay.classList.add('hidden');
      titleInput.classList.remove('hidden');
      titleInput.focus();
    });
    titleInput.addEventListener('blur', () => {
      this._title = titleInput.value || 'Ghi âm mới';
      titleText.textContent = this._title;
      titleInput.classList.add('hidden');
      titleDisplay.classList.remove('hidden');
    });
    titleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') titleInput.blur(); });

    // Main record/stop button
    this._modal.querySelector('#rmMainBtn').addEventListener('click', () => {
      if (recorder.isRecording || recorder.isPaused) {
        this._stopAndProcess();
      } else {
        this._startRecording();
      }
    });

    // Pause/Resume
    this._modal.querySelector('#rmPauseBtn').addEventListener('click', () => {
      if (recorder.isPaused) {
        recorder.resume();
        this._modal.querySelector('#rmPauseBtn').innerHTML = icon('pause', 22).outerHTML;
        this._modal.querySelector('#rmPauseBtn').setAttribute('aria-label', 'Tạm dừng');
        this._modal.querySelector('#rmPausedLabel').classList.add('hidden');
        this._modal.querySelector('#rmStatusText').textContent = 'Đang ghi âm...';
      } else {
        recorder.pause();
        this._modal.querySelector('#rmPauseBtn').innerHTML = icon('play', 22).outerHTML;
        this._modal.querySelector('#rmPauseBtn').setAttribute('aria-label', 'Tiếp tục');
        this._modal.querySelector('#rmPausedLabel').classList.remove('hidden');
        this._modal.querySelector('#rmStatusText').textContent = 'Đã tạm dừng';
      }
    });

    // Discard
    this._modal.querySelector('#rmDiscard').addEventListener('click', () => {
      if (confirm('Huỷ ghi âm này?')) {
        recorder.discard();
        this._resetUI();
      }
    });

    // Backdrop close (when not recording)
    this._modal.addEventListener('click', (e) => {
      if (e.target === this._modal && !recorder.isRecording && !recorder.isPaused) this.close();
    });
  }

  // ── Open / Close ──────────────────────────────────────
  open(onComplete) {
    this._onComplete = onComplete;
    this._resetUI();
    this._modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (recorder.isRecording || recorder.isPaused) {
      if (!confirm('Huỷ ghi âm?')) return;
      recorder.discard();
    }
    this._cleanup();
    this._modal.classList.remove('visible');
    document.body.style.overflow = '';
  }

  // ── Recording Controls ────────────────────────────────
  async _startRecording() {
    await recorder.start();
    if (!recorder.isRecording) return; // Permission denied

    this._waveform.start();

    // Update UI
    this._modal.querySelector('#rmRecBadge').classList.remove('hidden');
    this._modal.querySelector('#rmDiscard').classList.remove('hidden');
    this._modal.querySelector('#rmPauseBtn').classList.remove('hidden');
    this._modal.querySelector('#rmGlow').classList.remove('hidden');
    this._modal.querySelector('#rmStatusText').textContent = 'Đang ghi âm...';
    this._modal.querySelector('#rmHint').textContent = 'Nhấn ■ để dừng và xử lý';

    // Main button → stop icon
    const inner = this._modal.querySelector('#rmMainBtnInner');
    inner.innerHTML = '';
    inner.classList.add('recording-fab__inner--stop');

    // Recorder listeners
    this._recUnsubTick = recorder.on('tick', (elapsed) => {
      this._modal.querySelector('#rmTimer').textContent = formatMinSec(elapsed);
    });

    this._recUnsubLevels = recorder.on('levels', (levels) => {
      this._waveform.setLevels(levels);
    });

    this._recUnsubDone = recorder.on('done', ({ blob, duration, mimeType }) => {
      this._handleRecordingDone(blob, duration, mimeType);
    });

    this._recUnsubError = recorder.on('error', (msg) => {
      showToast(msg, 'error');
      this._resetUI();
    });
  }

  async _stopAndProcess() {
    recorder.stop();
    this._waveform.stop();
    // _handleRecordingDone will be called via 'done' event
    this._showProcessing('Đang xử lý ghi âm...');
  }

  async _handleRecordingDone(blob, duration, mimeType) {
    this._cleanup();

    const title = this._modal.querySelector('#rmTitleText')?.textContent || 'Ghi âm mới';
    const recording = new RecordingModel({
      title,
      status: RecordingStatus.RECORDED,
      duration,
    });

    storage.saveAudioBlob(recording.id, blob);
    storage.addRecording(recording);

    this._showProcessing('Đang phiên âm...');

    // Transcribe
    recording.set('status', RecordingStatus.UPLOADING);
    storage.updateRecording(recording);

    try {
      const result = await transcriptionService.transcribe(blob, recording.language, recording.id);

      recording.transcriptSegments = result.segments;
      recording.fullTranscript     = result.fullText;
      recording.set('status', RecordingStatus.SUMMARIZING);
      storage.updateRecording(recording);
      this._setProcessMsg('Đang tạo tóm tắt AI...');

      const summary = await aiService.generateSummary(result.fullText);
      recording.set('summary', summary);
      recording.set('status', RecordingStatus.COMPLETED);
      storage.updateRecording(recording);
    } catch (e) {
      console.warn('Auto-transcription failed:', e);
      recording.set('status', RecordingStatus.RECORDED);
      storage.updateRecording(recording);
    }

    this._modal.classList.remove('visible');
    document.body.style.overflow = '';
    this._resetUI();
    this._onComplete?.(recording);
  }

  // ── Processing State ──────────────────────────────────
  _showProcessing(msg) {
    this._modal.querySelector('#rmContent').classList.add('hidden');
    this._modal.querySelector('#rmProcessing').classList.remove('hidden');
    this._setProcessMsg(msg);
  }

  _setProcessMsg(msg) {
    const el = this._modal.querySelector('#rmProcessMsg');
    if (el) el.textContent = msg;
  }

  // ── Reset UI ──────────────────────────────────────────
  _resetUI() {
    // Hide processing
    this._modal.querySelector('#rmProcessing').classList.add('hidden');
    this._modal.querySelector('#rmContent').classList.remove('hidden');

    // Hide recording-only elements
    this._modal.querySelector('#rmRecBadge').classList.add('hidden');
    this._modal.querySelector('#rmDiscard').classList.add('hidden');
    this._modal.querySelector('#rmPauseBtn').classList.add('hidden');
    this._modal.querySelector('#rmPausedLabel').classList.add('hidden');
    this._modal.querySelector('#rmGlow').classList.add('hidden');

    // Reset timer
    this._modal.querySelector('#rmTimer').textContent = '00:00';
    this._modal.querySelector('#rmStatusText').textContent = 'Nhấn để bắt đầu';
    this._modal.querySelector('#rmHint').textContent = 'Nhấn ● để bắt đầu ghi âm';

    // Reset main button
    const inner = this._modal.querySelector('#rmMainBtnInner');
    inner.classList.remove('recording-fab__inner--stop');
    inner.innerHTML = icon('mic', 28).outerHTML;

    // Reset pause button
    this._modal.querySelector('#rmPauseBtn').innerHTML = icon('pause', 22).outerHTML;

    // Reset title
    this._title = 'Ghi âm mới';
    const titleText = this._modal.querySelector('#rmTitleText');
    const titleInput = this._modal.querySelector('#rmTitleInput');
    if (titleText) titleText.textContent = this._title;
    if (titleInput) titleInput.value = this._title;

    // Reset waveform
    this._waveform?.stop();
    this._waveform?.drawStatic();
  }

  _cleanup() {
    if (typeof this._recUnsubTick === 'function') this._recUnsubTick();
    if (typeof this._recUnsubLevels === 'function') this._recUnsubLevels();
    if (typeof this._recUnsubDone === 'function') this._recUnsubDone();
    if (typeof this._recUnsubError === 'function') this._recUnsubError();
    this._recUnsubTick = this._recUnsubLevels = this._recUnsubDone = this._recUnsubError = null;
  }
}
