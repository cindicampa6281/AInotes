/**
 * NoteD Web — Home View
 * Mirrors iOS HomeView.swift
 */
class HomeView {
  constructor(container) {
    this.container = container;
    this.searchText = '';
    this._unsubStorage = null;
    this._activeRecordingId = null;
    this.render();
    this._bind();
  }

  render() {
    this.container.innerHTML = `
      <!-- Header -->
      <header class="home-header">
        <div class="home-header__logo">
          <div class="home-header__app-name gradient-text">AiNotes</div>
          <div class="home-header__tagline">AI Voice Notes</div>
        </div>
        <div class="home-header__actions">
          <button class="btn--icon" id="importBtn" title="Nhập file audio" aria-label="Nhập file audio">
            ${icon('import', 18).outerHTML}
          </button>
          <button class="btn--icon" id="settingsBtn" title="Cài đặt" aria-label="Cài đặt">
            ${icon('settings', 18).outerHTML}
          </button>
        </div>
      </header>

      <!-- Search -->
      <div style="padding: 0 var(--space-4) var(--space-3)">
        <div class="search-bar">
          <span class="icon">${icon('search', 16).outerHTML}</span>
          <input type="text" id="searchInput" placeholder="Tìm kiếm ghi âm..." autocomplete="off" />
          <button class="clear-btn hidden" id="clearSearch" aria-label="Xoá tìm kiếm">${icon('xmark', 14).outerHTML}</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-bar" id="statsBar"></div>

      <!-- Recordings list -->
      <div class="recordings-list scroll-y" id="recordingsList"></div>

      <!-- FAB -->
      <div class="home-fab-container">
        <button class="fab press-scale" id="recordFAB" aria-label="Bắt đầu ghi âm">
          ${icon('mic', 18).outerHTML}
          <span>Ghi âm</span>
        </button>
      </div>

      <!-- Hidden file input -->
      <input type="file" id="audioFileInput" accept="audio/*" class="sr-only" />
    `;

    this._renderStats();
    this._renderList();
  }

  _bind() {
    // Storage updates
    this._unsubStorage = storage.onChange(() => {
      this._renderStats();
      this._renderList();
    });

    // Search
    const searchInput = $('#searchInput', this.container);
    const clearBtn    = $('#clearSearch', this.container);

    searchInput.addEventListener('input', debounce(() => {
      this.searchText = searchInput.value;
      clearBtn.classList.toggle('hidden', !this.searchText);
      this._renderList();
    }, 200));

    clearBtn.addEventListener('click', () => {
      this.searchText = '';
      searchInput.value = '';
      clearBtn.classList.add('hidden');
      this._renderList();
    });

    // Settings button
    $('#settingsBtn', this.container).addEventListener('click', () => {
      EventBus.emit('openSettings');
    });

    // FAB → open recorder
    $('#recordFAB', this.container).addEventListener('click', () => {
      EventBus.emit('openRecorder');
    });

    // Import audio file
    $('#importBtn', this.container).addEventListener('click', () => {
      $('#audioFileInput', this.container).click();
    });

    $('#audioFileInput', this.container).addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this._importAudioFile(file);
      e.target.value = ''; // reset
    });
  }

  _renderStats() {
    const bar = $('#statsBar', this.container);
    if (!bar) return;

    const recs      = storage.recordings;
    const completed = recs.filter(r => r.status === RecordingStatus.COMPLETED).length;
    const totalSec  = recs.reduce((sum, r) => sum + r.duration, 0);
    const totalFmt  = formatHMS(totalSec) || '0m00s';

    bar.innerHTML = `
      <div class="stat-chip" style="--chip-color: var(--color-accent)">
        <div class="stat-chip__value-row">
          <span class="stat-chip__icon" style="color:var(--color-accent)">${icon('waveform', 11).outerHTML}</span>
          <span class="stat-chip__value">${recs.length}</span>
        </div>
        <div class="stat-chip__label">Ghi âm</div>
      </div>
      <div class="stat-chip">
        <div class="stat-chip__value-row">
          <span class="stat-chip__icon" style="color:var(--color-green)">✓</span>
          <span class="stat-chip__value">${completed}</span>
        </div>
        <div class="stat-chip__label">Hoàn thành</div>
      </div>
      <div class="stat-chip">
        <div class="stat-chip__value-row">
          <span class="stat-chip__icon" style="color:var(--color-purple)">⏱</span>
          <span class="stat-chip__value">${totalFmt}</span>
        </div>
        <div class="stat-chip__label">Tổng thời gian</div>
      </div>
    `;
  }

  _renderList() {
    const listEl = $('#recordingsList', this.container);
    if (!listEl) return;

    let recs = storage.recordings;

    // Filter by search
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      recs = recs.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.fullTranscript.toLowerCase().includes(q)
      );
    }

    if (recs.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state animate-fade-in">
          <div class="empty-state__icon">${icon('waveform', 44).outerHTML}</div>
          <div class="empty-state__title">${this.searchText ? 'Không tìm thấy kết quả' : 'Chưa có ghi âm nào'}</div>
          <div class="empty-state__desc">${this.searchText ? 'Thử từ khoá khác' : 'Nhấn nút micro để bắt đầu\nghi âm đầu tiên của bạn'}</div>
        </div>
      `;
      return;
    }

    clearEl(listEl);
    recs.forEach((rec, i) => {
      const row = this._createRow(rec);
      row.style.animationDelay = `${i * 0.04}s`;
      row.classList.add('animate-fade-in');
      listEl.appendChild(row);
    });
  }

  _createRow(recording) {
    const row = document.createElement('div');
    row.className = `recording-row${recording.id === this._activeRecordingId ? ' active' : ''}`;
    row.dataset.id = recording.id;
    row.style.setProperty('--row-accent', recording.statusColor);

    const statusClass = `status-badge--${recording.status}`;

    row.innerHTML = `
      <div class="recording-row__header">
        <div class="recording-row__icon-wrap" style="background: rgba(97,127,255,0.12)">
          ${icon('waveform', 20).outerHTML}
        </div>
        <div class="recording-row__info">
          <div class="recording-row__title">${recording.title}</div>
          <div class="recording-row__date">${formatShortDate(recording.createdAt)}</div>
        </div>
        <button class="btn--icon btn--sm row-more-btn" data-id="${recording.id}" aria-label="Tuỳ chọn" style="background:transparent;border:none">
          <span style="font-size:16px;color:var(--text-tertiary)">•••</span>
        </button>
      </div>
      <div class="recording-row__meta">
        <span class="recording-row__duration">⏱ ${recording.formattedDuration}</span>
        <span class="status-badge ${statusClass}">
          <span class="status-dot"></span>
          ${recording.statusDisplay}
        </span>
        ${recording.transcriptSegments.length ? `<span style="font-size:10px;color:var(--text-tertiary)">${recording.transcriptSegments.length} đoạn</span>` : ''}
      </div>
    `;

    // Click row → open detail
    row.addEventListener('click', (e) => {
      if (e.target.closest('.row-more-btn')) return;
      this._activeRecordingId = recording.id;
      this._renderList(); // update active highlight
      EventBus.emit('openDetail', recording);
    });

    // Context menu button
    row.querySelector('.row-more-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._showContextMenu(e, recording);
    });

    // Right-click context menu
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._showContextMenu(e, recording);
    });

    return row;
  }

  _showContextMenu(e, recording) {
    // Remove any existing menu
    document.querySelector('.context-menu')?.remove();

    const menu = el('div', { class: 'context-menu' });
    menu.innerHTML = `
      <div class="context-menu__item" id="ctxOpen">
        ${icon('waveform', 14).outerHTML} <span>Mở chi tiết</span>
      </div>
      <div class="context-menu__item" id="ctxCopy">
        ${icon('copy', 14).outerHTML} <span>Sao chép transcript</span>
      </div>
      <div class="context-menu__item" id="ctxExport">
        ${icon('share', 14).outerHTML} <span>Xuất dữ liệu</span>
      </div>
      <div class="context-menu__separator"></div>
      <div class="context-menu__item context-menu__item--danger" id="ctxDelete">
        ${icon('trash', 14).outerHTML} <span>Xoá</span>
      </div>
    `;

    // Position
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 160);
    menu.style.cssText = `left:${x}px;top:${y}px`;
    document.body.appendChild(menu);

    menu.querySelector('#ctxOpen').addEventListener('click', () => {
      menu.remove();
      EventBus.emit('openDetail', recording);
    });
    menu.querySelector('#ctxCopy').addEventListener('click', () => {
      menu.remove();
      copyToClipboard(recording.fullTranscript || '(Chưa có transcript)');
    });
    menu.querySelector('#ctxExport').addEventListener('click', () => {
      menu.remove();
      downloadText(`${recording.title}.txt`, buildExportText(recording));
    });
    menu.querySelector('#ctxDelete').addEventListener('click', () => {
      menu.remove();
      if (confirm(`Xoá "${recording.title}"?`)) {
        storage.deleteRecording(recording);
        if (this._activeRecordingId === recording.id) {
          this._activeRecordingId = null;
          EventBus.emit('closeDetail');
        }
      }
    });

    // Close on outside click
    const close = (evt) => { if (!menu.contains(evt.target)) { menu.remove(); document.removeEventListener('click', close); }};
    setTimeout(() => document.addEventListener('click', close), 0);
  }

  // ── Import audio file ─────────────────────────────────
  async _importAudioFile(file) {
    const fileName   = file.name;
    const title      = fileName.replace(/\.[^.]+$/, '') || 'File nhập mới';
    const recording  = new RecordingModel({ title, status: RecordingStatus.UPLOADING });

    storage.addRecording(recording);

    // Get duration
    try {
      const url       = URL.createObjectURL(file);
      const audio     = new Audio(url);
      await new Promise((res) => { audio.addEventListener('loadedmetadata', res); audio.load(); });
      recording.set('duration', audio.duration || 0);
      URL.revokeObjectURL(url);
    } catch {}

    // Save blob
    const blob = file;
    storage.saveAudioBlob(recording.id, blob);
    storage.updateRecording(recording);

    // Transcribe
    this._processTranscription(recording, blob);
  }

  async _processTranscription(recording, blob) {
    recording.set('status', RecordingStatus.TRANSCRIBING);
    storage.updateRecording(recording);

    try {
      const result = await transcriptionService.transcribe(blob, recording.language);

      recording.transcriptSegments = result.segments;
      recording.fullTranscript     = result.fullText;
      recording.set('status', RecordingStatus.SUMMARIZING);
      storage.updateRecording(recording);

      const summary = await aiService.generateSummary(result.fullText);
      recording.set('summary', summary);
      recording.set('status', RecordingStatus.COMPLETED);
      storage.updateRecording(recording);
      showToast('Phiên âm hoàn thành!', 'success');
    } catch (e) {
      console.error('Transcription error:', e);
      recording.set('status', RecordingStatus.FAILED);
      storage.updateRecording(recording);
      showToast('Lỗi phiên âm: ' + e.message, 'error');
    }
  }

  setActiveRecording(id) {
    this._activeRecordingId = id;
    $$('.recording-row', this.container).forEach(row => {
      row.classList.toggle('active', row.dataset.id === id);
    });
  }

  destroy() {
    this._unsubStorage?.();
  }
}
