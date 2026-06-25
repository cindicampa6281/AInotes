/**
 * NoteD Web — Detail View
 * Mirrors iOS DetailView.swift (header + player + tabs)
 */

// ── Detail View Model ─────────────────────────────────
class DetailViewModel {
  constructor(recording) {
    this.recording         = recording;
    this.audioService      = new AudioService();
    this.currentTime       = 0;
    this.duration          = recording.duration || 0;
    this.isPlaying         = false;
    this.playbackSpeed     = 1.0;
    this.activeSegmentIdx  = -1;
    this._listeners        = {};
    this._audioLoaded      = false;

    // Load audio
    this._loadAudio(recording);
  }

  async _loadAudio(recording) {
    // Try to get blob from storage
    const blob = await storage.getAudioBlob(recording.id);
    if (blob) {
      await this.audioService.load(blob);
      this._audioLoaded = true;
      this.duration = this.audioService.duration || recording.duration;
    }

    this.audioService.on('play', () => {
      this.isPlaying = true;
      this._emit('play');
    });
    this.audioService.on('pause', () => {
      this.isPlaying = false;
      this._emit('pause');
    });
    this.audioService.on('ended', () => {
      this.isPlaying = false;
      this.currentTime = 0;
      this._emit('ended');
    });
    this.audioService.on('timeupdate', (t) => {
      this.currentTime = t;
      this.duration = this.audioService.duration || this.duration;
      this._updateActiveSegment(t);
      this._emit('timeupdate', t);
    });
  }

  // ── Playback Controls ─────────────────────────────────
  togglePlayback() {
    if (!this._audioLoaded) { showToast('Không có file audio để phát', 'error'); return; }
    this.audioService.togglePlay();
  }

  seekToTime(time) {
    this.audioService.seekTo(time);
    this.currentTime = time;
    this._emit('timeupdate', time);
  }

  skipForward()  { this.audioService.skipForward(10); }
  skipBackward() { this.audioService.skipBackward(10); }

  setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;
    this.audioService.setPlaybackRate(speed);
    this._emit('speedchange', speed);
  }

  // ── Segment sync ──────────────────────────────────────
  _updateActiveSegment(time) {
    const segs = this.recording.transcriptSegments;
    let idx = -1;
    for (let i = 0; i < segs.length; i++) {
      if (time >= segs[i].startTime && time <= segs[i].endTime) { idx = i; break; }
    }
    if (idx !== this.activeSegmentIdx) {
      this.activeSegmentIdx = idx;
      this._emit('activesegment', idx);
    }
  }

  onActiveSegmentChange(fn) {
    return this.on('activesegment', fn);
  }

  // ── Copy / Export ─────────────────────────────────────
  copyTranscript() { copyToClipboard(this.recording.fullTranscript || '(Chưa có transcript)'); }

  // ── Events ────────────────────────────────────────────
  on(event, fn) {
    (this._listeners[event] = this._listeners[event] || []).push(fn);
    return () => { this._listeners[event] = (this._listeners[event] || []).filter(l => l !== fn); };
  }
  _emit(event, data) { (this._listeners[event] || []).forEach(fn => fn(data)); }

  destroy() { this.audioService.destroy(); }
}

// ── Detail View ───────────────────────────────────────
class DetailView {
  constructor(container) {
    this.container   = container;
    this.recording   = null;
    this.viewModel   = null;
    this.activeTab   = 'transcript';
    this._tabView    = null;
    this._unsubs     = [];

    this._renderEmpty();
  }

  _renderEmpty() {
    this.container.innerHTML = `
      <div class="empty-state" style="flex:1;height:100%">
        <div class="empty-state__icon">${icon('waveform', 40).outerHTML}</div>
        <div class="empty-state__title" style="font-size:var(--text-lg)">Chọn một ghi âm</div>
        <div class="empty-state__desc">Chọn ghi âm từ danh sách bên trái để xem chi tiết</div>
      </div>
    `;
  }

  load(recording) {
    // Destroy previous
    this._destroy();

    this.recording = recording;
    this.viewModel = new DetailViewModel(recording);
    this.activeTab = 'transcript';

    this._render();
    this._bindPlayerEvents();
    this._switchTab('transcript');
  }

  _render() {
    const { recording } = this;
    this.container.innerHTML = `
      <!-- Header -->
      <div class="detail-header" style="flex-shrink:0">
        <button class="detail-header__back press-scale" id="detailBack" aria-label="Quay lại">
          ${icon('chevronLeft', 16).outerHTML}
        </button>
        <div class="detail-header__info">
          <div class="detail-header__title" id="detailTitle">${recording.title}</div>
          <div class="detail-header__date">${recording.formattedDate}</div>
        </div>
        <button class="btn--icon" id="exportBtn" title="Xuất dữ liệu" aria-label="Xuất dữ liệu">
          ${icon('share', 16).outerHTML}
        </button>
      </div>

      <!-- Player -->
      <div style="padding:var(--space-3) var(--space-4);flex-shrink:0">
        <div class="player-card">
          <!-- Timeline -->
          <div class="player-timeline">
            <input type="range" class="player-slider" id="playerSlider"
              min="0" max="${Math.max(recording.duration, 1)}" value="0" step="0.1"
              aria-label="Vị trí phát" style="--progress:0%"
            />
            <div class="player-times">
              <span class="player-time" id="playerCurrent">00:00</span>
              <span class="player-time" id="playerDuration">${formatMinSec(recording.duration)}</span>
            </div>
          </div>

          <!-- Controls -->
          <div class="player-controls">
            <!-- Speed -->
            <div style="position:relative">
              <button class="speed-btn" id="speedBtn" aria-label="Tốc độ phát">1x</button>
            </div>

            <!-- Skip back -->
            <button class="skip-btn press-scale" id="skipBack" aria-label="Lùi 10 giây">
              ⏪
            </button>

            <!-- Play/Pause -->
            <button class="play-btn press-scale" id="playBtn" aria-label="Phát / Tạm dừng">
              ${icon('play', 22).outerHTML}
            </button>

            <!-- Skip forward -->
            <button class="skip-btn press-scale" id="skipFwd" aria-label="Tiến 10 giây">
              ⏩
            </button>

            <!-- Copy transcript -->
            <button class="copy-btn" id="copyTransBtn" aria-label="Sao chép transcript">
              ${icon('copy', 16).outerHTML}
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" id="detailTabs" role="tablist" style="flex-shrink:0">
        ${[
          { id: 'transcript', icon: '📄', label: 'Phiên âm' },
          { id: 'summary',    icon: '✨', label: 'AI Tóm tắt' },
          { id: 'chat',       icon: '💬', label: 'AI Chat' },
        ].map(tab => `
          <button class="tab${tab.id === 'transcript' ? ' active' : ''}"
            data-tab="${tab.id}" role="tab"
            aria-selected="${tab.id === 'transcript'}"
            aria-controls="tabContent-${tab.id}"
          >
            <div class="tab__inner">
              <span>${tab.icon}</span>
              <span>${tab.label}</span>
            </div>
            <div class="tab__indicator"></div>
          </button>
        `).join('')}
      </div>

      <!-- Tab Content -->
      <div id="tabContent" style="flex:1;overflow:hidden;display:flex;flex-direction:column"></div>
    `;

    // Back button (mobile)
    this.container.querySelector('#detailBack').addEventListener('click', () => {
      EventBus.emit('closeDetail');
    });

    // Export
    this.container.querySelector('#exportBtn').addEventListener('click', () => {
      downloadText(`${recording.title}.txt`, buildExportText(recording));
      showToast('Đã xuất file!', 'success');
    });

    // Tabs
    this.container.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchTab(tab.dataset.tab));
    });
  }

  _switchTab(tabId) {
    this.activeTab = tabId;
    this._tabView?.destroy();

    // Update tab buttons
    this.container.querySelectorAll('.tab').forEach(tab => {
      const isActive = tab.dataset.tab === tabId;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive);
    });

    const contentEl = this.container.querySelector('#tabContent');
    if (!contentEl) return;
    contentEl.innerHTML = '';

    switch (tabId) {
      case 'transcript':
        this._tabView = new TranscriptView(contentEl, this.recording, this.viewModel);
        break;
      case 'summary':
        this._tabView = new SummaryView(contentEl, this.recording, this.viewModel);
        break;
      case 'chat':
        this._tabView = new ChatView(contentEl, this.recording, this.viewModel);
        break;
    }
  }

  _bindPlayerEvents() {
    const vm = this.viewModel;

    // Play/pause button
    const playBtn = this.container.querySelector('#playBtn');
    this._unsubs.push(vm.on('play', () => {
      if (playBtn) playBtn.innerHTML = icon('pause', 22).outerHTML;
    }));
    this._unsubs.push(vm.on('pause', () => {
      if (playBtn) playBtn.innerHTML = icon('play', 22).outerHTML;
    }));
    this._unsubs.push(vm.on('ended', () => {
      if (playBtn) playBtn.innerHTML = icon('play', 22).outerHTML;
      const slider = this.container.querySelector('#playerSlider');
      if (slider) { slider.value = 0; slider.style.setProperty('--progress', '0%'); }
      const cur = this.container.querySelector('#playerCurrent');
      if (cur) cur.textContent = '00:00';
    }));

    playBtn?.addEventListener('click', () => vm.togglePlayback());

    // Skip
    this.container.querySelector('#skipBack')?.addEventListener('click', () => vm.skipBackward());
    this.container.querySelector('#skipFwd')?.addEventListener('click', () => vm.skipForward());

    // Copy
    this.container.querySelector('#copyTransBtn')?.addEventListener('click', () => vm.copyTranscript());

    // Slider
    const slider = this.container.querySelector('#playerSlider');
    slider?.addEventListener('input', () => {
      vm.seekToTime(parseFloat(slider.value));
    });

    // Time update
    this._unsubs.push(vm.on('timeupdate', (t) => {
      const dur  = vm.duration || this.recording.duration || 1;
      const pct  = Math.min(100, (t / dur) * 100);

      const cur = this.container.querySelector('#playerCurrent');
      if (cur) cur.textContent = formatMinSec(t);

      const durEl = this.container.querySelector('#playerDuration');
      if (durEl) durEl.textContent = formatMinSec(dur);

      if (slider && !slider.matches(':active')) {
        slider.max   = dur;
        slider.value = t;
        slider.style.setProperty('--progress', `${pct}%`);
      }
    }));

    // Speed button
    const speedBtn = this.container.querySelector('#speedBtn');
    const speeds   = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

    speedBtn?.addEventListener('click', (e) => {
      // Remove existing menu
      document.querySelector('.speed-menu')?.remove();

      const menu = el('div', { class: 'speed-menu' });
      speeds.forEach(s => {
        const item = el('div', {
          class: `speed-menu__item${s === vm.playbackSpeed ? ' active' : ''}`,
          html: `${s === 1 ? '1' : s}x`,
        });
        item.addEventListener('click', () => {
          vm.setPlaybackSpeed(s);
          speedBtn.textContent = `${s === 1 ? '1' : s}x`;
          menu.remove();
        });
        menu.appendChild(item);
      });

      const rect = speedBtn.getBoundingClientRect();
      menu.style.cssText = `position:fixed;left:${rect.left}px;bottom:${window.innerHeight - rect.top + 4}px`;
      document.body.appendChild(menu);

      const close = (ev) => { if (!menu.contains(ev.target) && ev.target !== speedBtn) { menu.remove(); document.removeEventListener('click', close); }};
      setTimeout(() => document.addEventListener('click', close), 0);
    });
  }

  _destroy() {
    this._unsubs.forEach(fn => fn());
    this._unsubs = [];
    this._tabView?.destroy();
    this._tabView = null;
    this.viewModel?.destroy();
    this.viewModel = null;
  }

  destroy() { this._destroy(); }
}
