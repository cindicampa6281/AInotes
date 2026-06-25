/**
 * NoteD Web — Settings Modal
 * Mirrors iOS SettingsView.swift
 */
class SettingsModal {
  constructor() {
    this._modal = null;
    this._isTesting = false;
    this._build();
  }

  _build() {
    this._modal = el('div', { class: 'modal modal--center', id: 'settingsModal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Cài đặt' });
    
    this._modal.innerHTML = `
      <div class="modal__content" style="border-radius:var(--radius-2xl); width:90%; max-width:550px; max-height:85vh; display:flex; flex-direction:column; background: linear-gradient(180deg, #1e1e2f 0%, #121220 100%);">
        
        <!-- Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:var(--space-4) var(--space-5); border-bottom:1px solid var(--color-border); flex-shrink:0;">
          <div style="width:50px"></div>
          <div style="font-size:var(--text-lg); font-weight:var(--weight-bold); color:var(--text-primary)">Cài đặt</div>
          <button class="btn btn--ghost" id="smDoneBtn" style="padding:var(--space-1) var(--space-4); border-radius:var(--radius-full); font-size:var(--text-sm); font-weight:var(--weight-semibold); color:var(--color-accent); border:none; background:transparent;">
            Xong
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="scroll-y" style="flex:1; padding:var(--space-5) var(--space-5) var(--space-8); display:flex; flex-direction:column; gap:var(--space-5);">
          
          <!-- App Info -->
          <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:var(--space-2); padding-bottom:var(--space-2);">
            <div style="width:72px; height:72px; border-radius:var(--radius-xl); background:linear-gradient(135deg, var(--color-accent), var(--color-purple)); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(97, 127, 255, 0.3);">
              ${icon('waveform', 36).outerHTML}
            </div>
            <div style="font-size:22px; font-weight:var(--weight-bold); color:var(--text-primary); margin-top:var(--space-2);">AiNotes</div>
            <div style="font-size:var(--text-xs); color:var(--text-secondary);">AI Voice Recording & Transcription</div>
          </div>

          <!-- Whisper.cpp Server Config -->
          <div class="card" style="padding:var(--space-4); display:flex; flex-direction:column; gap:var(--space-3);">
            <div style="display:flex; align-items:center; gap:var(--space-2); color:var(--color-accent); font-size:var(--text-xs); font-weight:var(--weight-bold); text-transform:uppercase; letter-spacing:0.5px;">
              <span>🖥️</span> <span>Whisper.cpp Server</span>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:var(--space-1);">
              <label for="settingsServerURL" style="font-size:var(--text-xs); color:var(--text-secondary);">Server URL</label>
              <input type="text" id="settingsServerURL" class="input-field" style="font-family:var(--font-mono); font-size:var(--text-sm);" placeholder="http://localhost:8080" />
            </div>

            <button class="btn btn--primary" id="settingsTestBtn" style="font-size:var(--text-sm); font-weight:var(--weight-medium); width:100%; border-radius:var(--radius-md); padding:var(--space-2) var(--space-4);">
              <span>Kiểm tra kết nối</span>
            </button>

            <div id="settingsTestResult" class="hidden" style="font-size:var(--text-xs); padding:var(--space-2) var(--space-3); border-radius:var(--radius-sm); display:flex; align-items:center; gap:var(--space-2);">
            </div>

            <div style="font-size:10px; color:var(--text-tertiary); text-align:center;">
              Server chạy Whisper.cpp với --host 0.0.0.0 --port 8080
            </div>
          </div>

          <!-- AI Config (OpenAI) -->
          <div class="card" style="padding:var(--space-4); display:flex; flex-direction:column; gap:var(--space-3);">
            <div style="display:flex; align-items:center; gap:var(--space-2); color:var(--color-purple); font-size:var(--text-xs); font-weight:var(--weight-bold); text-transform:uppercase; letter-spacing:0.5px;">
              <span>✨</span> <span>AI Summary (OpenAI)</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:var(--space-1);">
              <label for="settingsAPIKey" style="font-size:var(--text-xs); color:var(--text-secondary);">OpenAI API Key</label>
              <div style="position:relative; display:flex; align-items:center;">
                <input type="password" id="settingsAPIKey" class="input-field" style="font-family:var(--font-mono); font-size:var(--text-sm); padding-right:40px;" placeholder="sk-..." />
                <button type="button" id="settingsToggleKey" aria-label="Hiện API Key" style="position:absolute; right:10px; background:none; border:none; color:var(--text-tertiary); cursor:pointer; padding:4px;">
                  👁️
                </button>
              </div>
            </div>

            <div style="font-size:10px; color:var(--text-tertiary);">
              Dùng để tạo tóm tắt AI, meeting notes, việc cần làm. Không bắt buộc (sẽ fallback sang Pollinations AI nếu không nhập).
            </div>
          </div>

          <!-- Language Selection -->
          <div class="card" style="padding:var(--space-4); display:flex; flex-direction:column; gap:var(--space-3);">
            <div style="display:flex; align-items:center; gap:var(--space-2); color:var(--color-green); font-size:var(--text-xs); font-weight:var(--weight-bold); text-transform:uppercase; letter-spacing:0.5px;">
              <span>🌐</span> <span>Ngôn ngữ nhận dạng</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:var(--space-2);" id="settingsLangList">
              <button class="settings-lang-btn" data-lang="auto" style="display:flex; align-items:center; justify-content:space-between; width:100%; border:none; background:var(--color-surface2); color:var(--text-primary); padding:var(--space-3) var(--space-4); border-radius:var(--radius-md); font-size:var(--text-sm); cursor:pointer; transition:all var(--transition-fast);">
                <span>✨ Tự động</span>
                <span class="settings-lang-check hidden" style="color:var(--color-green)">✓</span>
              </button>
              <button class="settings-lang-btn" data-lang="vi" style="display:flex; align-items:center; justify-content:space-between; width:100%; border:none; background:var(--color-surface2); color:var(--text-primary); padding:var(--space-3) var(--space-4); border-radius:var(--radius-md); font-size:var(--text-sm); cursor:pointer; transition:all var(--transition-fast);">
                <span>🇻🇳 Tiếng Việt</span>
                <span class="settings-lang-check hidden" style="color:var(--color-green)">✓</span>
              </button>
              <button class="settings-lang-btn" data-lang="en" style="display:flex; align-items:center; justify-content:space-between; width:100%; border:none; background:var(--color-surface2); color:var(--text-primary); padding:var(--space-3) var(--space-4); border-radius:var(--radius-md); font-size:var(--text-sm); cursor:pointer; transition:all var(--transition-fast);">
                <span>🇺🇸 English</span>
                <span class="settings-lang-check hidden" style="color:var(--color-green)">✓</span>
              </button>
            </div>
          </div>

          <!-- Storage -->
          <div class="card" style="padding:var(--space-4); display:flex; flex-direction:column; gap:var(--space-3);">
            <div style="display:flex; align-items:center; gap:var(--space-2); color:var(--color-orange); font-size:var(--text-xs); font-weight:var(--weight-bold); text-transform:uppercase; letter-spacing:0.5px;">
              <span>💾</span> <span>Bộ nhớ</span>
            </div>

            <div style="display:flex; align-items:center; justify-content:space-between; font-size:var(--text-sm);">
              <span style="color:var(--text-secondary)">Tổng số ghi âm</span>
              <span style="font-weight:var(--weight-bold); color:var(--text-primary)" id="settingsTotalRecords">0 bản ghi</span>
            </div>

            <button class="btn btn--danger" id="settingsClearBtn" style="font-size:var(--text-sm); font-weight:var(--weight-medium); width:100%; border-radius:var(--radius-md); padding:var(--space-2) var(--space-4);">
              <span>Xoá tất cả dữ liệu</span>
            </button>
          </div>

          <!-- About -->
          <div class="card" style="padding:var(--space-4); display:flex; flex-direction:column; gap:var(--space-2); font-size:var(--text-sm);">
            <div style="display:flex; align-items:center; gap:var(--space-2); color:var(--text-secondary); font-size:var(--text-xs); font-weight:var(--weight-bold); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:var(--space-1);">
              <span>ℹ️</span> <span>Thông tin</span>
            </div>

            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--text-secondary)">Phiên bản</span>
              <span style="color:var(--text-primary); font-weight:var(--weight-medium);">1.0.0</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--text-secondary)">Xây dựng bằng</span>
              <span style="color:var(--text-primary); font-weight:var(--weight-medium);">HTML + CSS + JS thuần</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--text-secondary)">AI Engine</span>
              <span style="color:var(--text-primary); font-weight:var(--weight-medium);">Whisper.cpp + GPT/Pollinations</span>
            </div>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(this._modal);
    this._bindEvents();
  }

  _bindEvents() {
    this._modal.querySelector('#smDoneBtn').addEventListener('click', () => this.close());
    
    // Save settings when user inputs
    const serverUrlInput = this._modal.querySelector('#settingsServerURL');
    const apiKeyInput = this._modal.querySelector('#settingsAPIKey');
    const toggleKeyBtn = this._modal.querySelector('#settingsToggleKey');

    serverUrlInput.addEventListener('change', () => {
      storage.saveSetting('server_url', serverUrlInput.value.trim());
    });

    apiKeyInput.addEventListener('change', () => {
      storage.saveSetting('api_key', apiKeyInput.value.trim());
    });

    toggleKeyBtn.addEventListener('click', () => {
      const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
      apiKeyInput.setAttribute('type', type);
      toggleKeyBtn.textContent = type === 'password' ? '👁️' : '🙈';
    });

    // Test connection
    this._modal.querySelector('#settingsTestBtn').addEventListener('click', () => this._testConnection());

    // Language selection
    this._modal.querySelectorAll('.settings-lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        storage.saveSetting('language', lang);
        this._updateLangUI(lang);
      });
    });

    // Clear data
    this._modal.querySelector('#settingsClearBtn').addEventListener('click', () => {
      if (confirm('Hành động này không thể hoàn tác. Tất cả ghi âm và file âm thanh sẽ bị xoá khỏi bộ nhớ trình duyệt. Bạn có chắc chắn muốn xoá tất cả dữ liệu?')) {
        // Clear all recordings
        const list = [...storage.recordings];
        list.forEach(r => {
          storage.deleteRecording(r);
        });
        showToast('Đã xoá toàn bộ dữ liệu!', 'success');
        this.close();
      }
    });

    // Click outside backdrop to close
    this._modal.addEventListener('click', (e) => {
      if (e.target === this._modal) this.close();
    });
  }

  open() {
    this._loadSettings();
    this._modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this._modal.classList.remove('visible');
    document.body.style.overflow = '';
  }

  _loadSettings() {
    const serverURL = storage.getSetting('server_url', 'http://localhost:8080');
    const apiKey = storage.getSetting('api_key', '');
    const language = storage.getSetting('language', 'auto');
    const recsCount = storage.recordings.length;

    this._modal.querySelector('#settingsServerURL').value = serverURL;
    this._modal.querySelector('#settingsAPIKey').value = apiKey;
    this._modal.querySelector('#settingsAPIKey').setAttribute('type', 'password');
    this._modal.querySelector('#settingsToggleKey').textContent = '👁️';
    this._modal.querySelector('#settingsTotalRecords').textContent = `${recsCount} bản ghi`;

    this._updateLangUI(language);
    
    // Hide test results
    const resultEl = this._modal.querySelector('#settingsTestResult');
    resultEl.classList.add('hidden');
    resultEl.className = 'hidden';
  }

  _updateLangUI(activeLang) {
    this._modal.querySelectorAll('.settings-lang-btn').forEach(btn => {
      const isSelected = btn.dataset.lang === activeLang;
      btn.style.background = isSelected ? 'rgba(51,217,140,0.1)' : 'var(--color-surface2)';
      btn.style.border = isSelected ? '1px solid rgba(51,217,140,0.2)' : 'none';
      btn.querySelector('.settings-lang-check').classList.toggle('hidden', !isSelected);
    });
  }

  async _testConnection() {
    if (this._isTesting) return;
    
    const serverUrlInput = this._modal.querySelector('#settingsServerURL');
    const serverURL = serverUrlInput.value.trim();

    if (!serverURL) {
      this._showTestResult('✗ URL không hợp lệ', 'error');
      return;
    }

    this._isTesting = true;
    const testBtn = this._modal.querySelector('#settingsTestBtn');
    testBtn.disabled = true;
    testBtn.innerHTML = `<span>Đang kiểm tra...</span>`;
    
    this._showTestResult('Đang kiểm tra kết nối...', 'info');

    try {
      // Create request controller with timeout
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      
      const resp = await fetch(`${serverURL}/`, { 
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors' // Bypass CORS since it is local/IP server
      });
      
      clearTimeout(id);
      this._showTestResult('✓ Kết nối thành công', 'success');
    } catch (e) {
      console.warn('Connection failed:', e);
      this._showTestResult(`✗ Không kết nối được: ${e.name === 'AbortError' ? 'Timeout' : e.message}`, 'error');
    } finally {
      this._isTesting = false;
      testBtn.disabled = false;
      testBtn.innerHTML = `<span>Kiểm tra kết nối</span>`;
    }
  }

  _showTestResult(msg, type) {
    const resultEl = this._modal.querySelector('#settingsTestResult');
    resultEl.classList.remove('hidden');
    resultEl.textContent = msg;

    if (type === 'success') {
      resultEl.style.background = 'rgba(51,217,140,0.1)';
      resultEl.style.color = 'var(--color-green)';
    } else if (type === 'error') {
      resultEl.style.background = 'rgba(255,77,77,0.1)';
      resultEl.style.color = 'var(--color-red)';
    } else {
      resultEl.style.background = 'var(--color-surface3)';
      resultEl.style.color = 'var(--text-secondary)';
    }
  }
}
