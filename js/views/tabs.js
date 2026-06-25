/**
 * NoteD Web — Transcript Tab View
 * Mirrors iOS TranscriptView.swift
 */
class TranscriptView {
  constructor(container, recording, detailVM) {
    this.container  = container;
    this.recording  = recording;
    this.detailVM   = detailVM;
    this.render();
  }

  render() {
    const { recording } = this;

    if (!recording.transcriptSegments.length && !recording.fullTranscript) {
      this._renderEmpty();
    } else if (!recording.transcriptSegments.length && recording.fullTranscript) {
      this._renderPlain();
    } else {
      this._renderSegmented();
    }
  }

  _renderEmpty() {
    const isProcessing = recording => recording.status === RecordingStatus.TRANSCRIBING || recording.status === RecordingStatus.UPLOADING;
    const { recording } = this;
    this.container.innerHTML = `
      <div class="empty-state animate-fade-in" style="flex:1">
        <div class="empty-state__icon" style="background:rgba(148,89,255,0.1)">${icon('waveform', 36).outerHTML}</div>
        <div class="empty-state__title">Chưa có transcript</div>
        <div class="empty-state__desc">${isProcessing(recording) ? 'Đang phiên âm, vui lòng chờ...' : 'Ghi âm chưa được phiên âm.\nCần kết nối server Whisper.cpp.'}</div>
        ${isProcessing(recording) ? '<div class="spinner spinner--lg"></div>' : ''}
      </div>
    `;
  }

  _renderPlain() {
    const { recording } = this;
    this.container.innerHTML = `
      <div class="scroll-y" style="flex:1;padding:var(--space-4)">
        <div class="card animate-fade-in">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              ${icon('text', 14).outerHTML}
              <span style="font-size:var(--text-base);font-weight:var(--weight-semibold)">Bản ghi thoại</span>
            </div>
            <button class="btn btn--ghost" id="copyPlainBtn" style="padding:var(--space-1) var(--space-3);font-size:var(--text-xs)">
              ${icon('copy', 12).outerHTML} Sao chép
            </button>
          </div>
          <p style="font-size:var(--text-base);color:var(--text-primary);line-height:1.8;white-space:pre-wrap">${recording.fullTranscript}</p>
        </div>
      </div>
    `;
    this.container.querySelector('#copyPlainBtn')?.addEventListener('click', () => {
      copyToClipboard(recording.fullTranscript);
    });
  }

  _renderSegmented() {
    const { recording } = this;
    this.container.innerHTML = `<div id="transcriptScroll" class="scroll-y" style="flex:1;padding:0 var(--space-4) var(--space-10)"></div>`;

    const scroll = this.container.querySelector('#transcriptScroll');

    recording.transcriptSegments.forEach((seg, i) => {
      const row = document.createElement('div');
      row.className = 'transcript-segment';
      row.dataset.index = i;
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.innerHTML = `
        <div class="transcript-segment__time-col">
          <span class="transcript-segment__timestamp">${seg.formattedStartTime}</span>
          ${seg.speaker ? `<span class="transcript-segment__speaker">${seg.speaker}</span>` : ''}
        </div>
        <div class="transcript-segment__bar"></div>
        <div class="transcript-segment__text">${seg.text}</div>
      `;

      row.addEventListener('click', () => {
        this.detailVM.seekToTime(seg.startTime);
      });
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.detailVM.seekToTime(seg.startTime);
        }
      });

      scroll.appendChild(row);
    });

    // Observe active segment
    this._unsubActive = this.detailVM.onActiveSegmentChange((index) => {
      this._highlightSegment(index);
    });
  }

  _highlightSegment(index) {
    const scroll = this.container.querySelector('#transcriptScroll');
    if (!scroll) return;

    $$('.transcript-segment', scroll).forEach((row, i) => {
      row.classList.toggle('active', i === index);
    });

    // Auto-scroll
    const active = scroll.querySelector(`.transcript-segment[data-index="${index}"]`);
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  destroy() {
    this._unsubActive?.();
  }
}

/**
 * NoteD Web — Summary Tab View
 * Mirrors iOS SummaryView.swift
 */
class SummaryView {
  constructor(container, recording, detailVM) {
    this.container = container;
    this.recording = recording;
    this.detailVM  = detailVM;
    this.render();
  }

  render() {
    if (this.recording.summary) {
      this._renderSummary(this.recording.summary);
    } else {
      this._renderEmpty();
    }
  }

  _renderSummary(summary) {
    this.container.innerHTML = '';
    const scroll = el('div', { class: 'scroll-y stagger-children', style: 'flex:1;padding:var(--space-3) var(--space-4) var(--space-10)' });

    // Overview
    scroll.appendChild(this._makeCard({
      icon: '💬', title: 'Tổng quan', color: 'var(--color-accent)',
      html: `<p style="font-size:var(--text-sm);color:var(--text-primary);line-height:1.8">${summary.overview}</p>`
    }));

    // Key Points
    if (summary.keyPoints.length) {
      scroll.appendChild(this._makeCard({
        icon: '⭐', title: 'Điểm chính', color: 'var(--color-purple)',
        html: summary.keyPoints.map((pt, i) => `
          <div class="key-point-item">
            <div class="key-point-num">${i+1}</div>
            <div style="font-size:var(--text-sm);color:var(--text-primary);line-height:1.7">${pt}</div>
          </div>
        `).join('')
      }));
    }

    // Action Items
    if (summary.actionItems.length) {
      scroll.appendChild(this._makeCard({
        icon: '✅', title: 'Việc cần làm', color: 'var(--color-green)',
        html: summary.actionItems.map(item => `
          <div class="action-item">
            <div class="action-checkbox" role="checkbox" aria-checked="false" tabindex="0"></div>
            <div style="font-size:var(--text-sm);color:var(--text-primary);line-height:1.7">${item}</div>
          </div>
        `).join('')
      }));
    }

    // Meeting Notes
    if (summary.meetingNotes) {
      scroll.appendChild(this._makeCard({
        icon: '📝', title: 'Ghi chú cuộc họp', color: 'var(--color-orange)',
        html: `<p style="font-size:var(--text-sm);color:var(--text-primary);line-height:1.8">${summary.meetingNotes}</p>`
      }));
    }

    // Participants
    if (summary.participants.length) {
      scroll.appendChild(this._makeCard({
        icon: '👥', title: 'Người tham gia', color: 'var(--color-teal)',
        html: `<div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">
          ${summary.participants.map(p => `<span class="participant-chip">${p}</span>`).join('')}
        </div>`
      }));
    }

    // Footer
    const footer = el('div', { style: 'text-align:center;padding:var(--space-4) 0;font-size:var(--text-xs);color:var(--text-tertiary)' });
    footer.textContent = `Tạo bởi AI • ${formatShortDate(summary.generatedAt)}`;
    scroll.appendChild(footer);

    this.container.appendChild(scroll);

    // Checkbox toggle
    $$('.action-checkbox', this.container).forEach(cb => {
      cb.addEventListener('click', () => {
        cb.classList.toggle('checked');
        cb.setAttribute('aria-checked', cb.classList.contains('checked'));
      });
      cb.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cb.click(); }
      });
    });
  }

  _renderEmpty() {
    const { recording } = this;
    const canGenerate = !!recording.fullTranscript;

    this.container.innerHTML = `
      <div class="empty-state animate-fade-in" style="flex:1;gap:var(--space-6)">
        <div style="width:100px;height:100px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:44px;background:linear-gradient(135deg,rgba(97,127,255,0.1),rgba(148,89,255,0.1))">
          ${icon('sparkles', 44).outerHTML}
        </div>
        <div>
          <div class="empty-state__title">Chưa có tóm tắt AI</div>
          <div class="empty-state__desc">AI sẽ phân tích nội dung ghi âm và<br>tạo tóm tắt, điểm chính, việc cần làm.</div>
        </div>
        ${canGenerate ? `
          <button class="btn btn--primary btn--pill" id="genSummaryBtn" style="font-size:var(--text-base)">
            ${icon('sparkles', 16).outerHTML} Tạo tóm tắt AI
          </button>
        ` : `
          <div style="font-size:var(--text-sm);color:var(--text-tertiary)">Cần có transcript trước khi tạo tóm tắt</div>
        `}
      </div>
    `;

    this.container.querySelector('#genSummaryBtn')?.addEventListener('click', async () => {
      const btn = this.container.querySelector('#genSummaryBtn');
      btn.disabled = true;
      btn.innerHTML = `<div class="spinner spinner--sm"></div> Đang tạo tóm tắt...`;

      try {
        const summary = await aiService.generateSummary(recording.fullTranscript);
        recording.summary = summary;
        storage.updateRecording(recording);
        this._renderSummary(summary);
        showToast('Tóm tắt AI hoàn thành!', 'success');
      } catch (e) {
        showToast('Lỗi tạo tóm tắt: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `${icon('sparkles', 16).outerHTML} Thử lại`;
      }
    });
  }

  _makeCard({ icon: iconChar, title, color, html }) {
    const card = el('div', {
      class: 'summary-card',
      style: `--card-accent:${color};margin-bottom:var(--space-3)`
    });
    card.innerHTML = `
      <div class="summary-card__header">
        <span class="summary-card__icon" style="color:${color}">${iconChar}</span>
        <span class="summary-card__title">${title}</span>
      </div>
      <div>${html}</div>
    `;
    return card;
  }

  destroy() {}
}

/**
 * NoteD Web — Chat Tab View
 * Mirrors iOS ChatView.swift
 */
class ChatView {
  constructor(container, recording, detailVM) {
    this.container  = container;
    this.recording  = recording;
    this.detailVM   = detailVM;
    this.messages   = []; // { isUser, text }
    this.isLoading  = false;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="chat-messages scroll-y" id="chatMessages">
        <div id="chatWelcome" class="animate-fade-in" style="display:flex;flex-direction:column;align-items:center;gap:var(--space-4);padding:var(--space-8) var(--space-4)">
          <div style="font-size:48px;background:var(--gradient-accent);-webkit-background-clip:text;-webkit-text-fill-color:transparent">💬</div>
          <div style="font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--text-primary)">AI Chat</div>
          <div style="font-size:var(--text-sm);color:var(--text-secondary);text-align:center">Hỏi AI về nội dung ghi âm này</div>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);justify-content:center;margin-top:var(--space-2)" id="chatSuggestions">
            ${['Tóm tắt 3 ý chính?', 'Cuộc họp nói về gì?', 'Liệt kê các việc cần làm'].map(s =>
              `<button class="chat-suggestion press-scale" data-msg="${s}">${s}</button>`
            ).join('')}
          </div>
        </div>
        <div id="chatList"></div>
      </div>
      <div class="chat-input-bar">
        <textarea class="chat-input" id="chatInput" placeholder="Hỏi về nội dung ghi âm..." rows="1"></textarea>
        <button class="chat-send-btn" id="chatSend" disabled aria-label="Gửi">
          ${icon('send', 18).outerHTML}
        </button>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const input   = this.container.querySelector('#chatInput');
    const sendBtn = this.container.querySelector('#chatSend');

    input.addEventListener('input', () => {
      sendBtn.disabled = !input.value.trim() || this.isLoading;
      // Auto-resize
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) this._send();
      }
    });

    sendBtn.addEventListener('click', () => this._send());

    // Suggestions
    this.container.querySelectorAll('.chat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.dataset.msg;
        input.dispatchEvent(new Event('input'));
        this._send();
      });
    });
  }

  async _send() {
    const input   = this.container.querySelector('#chatInput');
    const sendBtn = this.container.querySelector('#chatSend');
    const msg     = input.value.trim();
    if (!msg || this.isLoading) return;

    // Hide welcome
    this.container.querySelector('#chatWelcome')?.classList.add('hidden');

    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    this.isLoading = true;

    this._appendMessage({ isUser: true, text: msg });

    // Loading bubble
    const loadEl = this._appendLoading();

    try {
      const response = await aiService.chatWithTranscript(this.recording.fullTranscript, msg);
      loadEl.remove();
      this._appendMessage({ isUser: false, text: response });
    } catch (e) {
      loadEl.remove();
      this._appendMessage({ isUser: false, text: `Lỗi: ${e.message}` });
    }

    this.isLoading = false;
    sendBtn.disabled = !input.value.trim();
  }

  _appendMessage({ isUser, text }) {
    const list = this.container.querySelector('#chatList');
    const wrap = el('div', { class: `chat-bubble-wrap${isUser ? ' chat-bubble-wrap--user' : ''}` });
    const bubble = el('div', {
      class: `chat-bubble chat-bubble--${isUser ? 'user' : 'ai'}`,
      html: text.replace(/\n/g, '<br>')
    });
    wrap.appendChild(bubble);
    list.appendChild(wrap);
    this._scrollToBottom();
    return wrap;
  }

  _appendLoading() {
    const list = this.container.querySelector('#chatList');
    const wrap = el('div', { class: 'chat-bubble-wrap' });
    const loading = el('div', { class: 'chat-loading' });
    for (let i = 0; i < 3; i++) loading.appendChild(el('div', { class: 'chat-loading-dot' }));
    wrap.appendChild(loading);
    list.appendChild(wrap);
    this._scrollToBottom();
    return wrap;
  }

  _scrollToBottom() {
    const el = this.container.querySelector('#chatMessages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  destroy() {}
}
