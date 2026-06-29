/**
 * NoteD Web — Auth Page & Profile Modal
 * Full-screen auth gate + profile management for logged-in users
 */

// ── Full-Screen Auth Page (Login / Register) ──────────────
class AuthPage {
  constructor(container) {
    this.container = container;
    this._activeTab = 'login';
    this.render();
  }

  render() {
    const isLogin = this._activeTab === 'login';

    this.container.innerHTML = `
      <div class="auth-page">
        <!-- Animated background -->
        <div class="auth-page__bg">
          <div class="auth-page__orb auth-page__orb--1"></div>
          <div class="auth-page__orb auth-page__orb--2"></div>
          <div class="auth-page__orb auth-page__orb--3"></div>
        </div>

        <div class="auth-page__content">
          <!-- Logo -->
          <div class="auth-page__logo animate-fade-in">
            <div class="auth-page__logo-icon">
              <span class="auth-page__logo-glow"></span>
              ${icon('waveform', 36).outerHTML}
            </div>
            <h1 class="auth-page__title gradient-text">AiNotes</h1>
            <p class="auth-page__subtitle">Ghi âm & Phiên âm AI thông minh</p>
          </div>

          <!-- Auth Card -->
          <div class="auth-card animate-fade-in" style="animation-delay: 0.15s">
            <!-- Tab Switcher -->
            <div class="auth-card__tabs">
              <button class="auth-card__tab ${isLogin ? 'active' : ''}" id="authTabLogin">
                <span class="auth-card__tab-icon">🔑</span>
                Đăng nhập
              </button>
              <button class="auth-card__tab ${!isLogin ? 'active' : ''}" id="authTabRegister">
                <span class="auth-card__tab-icon">✨</span>
                Đăng ký
              </button>
              <div class="auth-card__tab-indicator" style="transform: translateX(${isLogin ? '0%' : '100%'})"></div>
            </div>

            <!-- Error message -->
            <div id="authPageError" class="auth-card__error hidden"></div>

            <!-- Form -->
            <div class="auth-card__form" id="authPageForm">
              ${isLogin ? this._getLoginHTML() : this._getRegisterHTML()}
            </div>

            <!-- Submit button -->
            <button class="auth-card__submit" id="authPageSubmit">
              <span class="auth-card__submit-text">${isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</span>
              <span class="auth-card__submit-icon">→</span>
            </button>

            <!-- Footer -->
            <div class="auth-card__footer">
              ${isLogin 
                ? 'Chưa có tài khoản? <button class="auth-card__link" id="authSwitchToRegister">Đăng ký ngay</button>'
                : 'Đã có tài khoản? <button class="auth-card__link" id="authSwitchToLogin">Đăng nhập</button>'
              }
            </div>
          </div>

          <!-- Features preview -->
          <div class="auth-page__features animate-fade-in" style="animation-delay: 0.3s">
            <div class="auth-page__feature">
              <span class="auth-page__feature-icon">🎙️</span>
              <span>Ghi âm chất lượng cao</span>
            </div>
            <div class="auth-page__feature">
              <span class="auth-page__feature-icon">📝</span>
              <span>Phiên âm tự động</span>
            </div>
            <div class="auth-page__feature">
              <span class="auth-page__feature-icon">🤖</span>
              <span>AI tóm tắt & phân tích</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _getLoginHTML() {
    return `
      <div class="auth-field">
        <label class="auth-field__label">Tên tài khoản hoặc Email</label>
        <div class="auth-field__input-wrap">
          <span class="auth-field__icon">👤</span>
          <input type="text" id="authLoginUsername" class="auth-field__input" placeholder="username hoặc email" autocomplete="username" />
        </div>
      </div>
      <div class="auth-field">
        <label class="auth-field__label">Mật khẩu</label>
        <div class="auth-field__input-wrap">
          <span class="auth-field__icon">🔒</span>
          <input type="password" id="authLoginPassword" class="auth-field__input" placeholder="••••••••" autocomplete="current-password" />
        </div>
      </div>
    `;
  }

  _getRegisterHTML() {
    return `
      <div class="auth-field">
        <label class="auth-field__label">Tên hiển thị</label>
        <div class="auth-field__input-wrap">
          <span class="auth-field__icon">😊</span>
          <input type="text" id="authRegName" class="auth-field__input" placeholder="Ví dụ: Nguyễn Văn A" />
        </div>
      </div>
      <div class="auth-field">
        <label class="auth-field__label">Tên tài khoản (username)</label>
        <div class="auth-field__input-wrap">
          <span class="auth-field__icon">👤</span>
          <input type="text" id="authRegUsername" class="auth-field__input" placeholder="viet_tat_khong_dau" autocomplete="username" />
        </div>
      </div>
      <div class="auth-field">
        <label class="auth-field__label">Email</label>
        <div class="auth-field__input-wrap">
          <span class="auth-field__icon">📧</span>
          <input type="email" id="authRegEmail" class="auth-field__input" placeholder="name@domain.com" />
        </div>
      </div>
      <div class="auth-field">
        <label class="auth-field__label">Mật khẩu</label>
        <div class="auth-field__input-wrap">
          <span class="auth-field__icon">🔒</span>
          <input type="password" id="authRegPassword" class="auth-field__input" placeholder="Tối thiểu 6 ký tự" autocomplete="new-password" />
        </div>
      </div>
      <div class="auth-field">
        <label class="auth-field__label">Xác nhận mật khẩu</label>
        <div class="auth-field__input-wrap">
          <span class="auth-field__icon">🔒</span>
          <input type="password" id="authRegConfirm" class="auth-field__input" placeholder="Nhập lại mật khẩu" autocomplete="new-password" />
        </div>
      </div>
    `;
  }

  _bindEvents() {
    // Tab switching
    const loginTab = this.container.querySelector('#authTabLogin');
    const registerTab = this.container.querySelector('#authTabRegister');
    const switchToRegister = this.container.querySelector('#authSwitchToRegister');
    const switchToLogin = this.container.querySelector('#authSwitchToLogin');

    loginTab?.addEventListener('click', () => { this._activeTab = 'login'; this.render(); });
    registerTab?.addEventListener('click', () => { this._activeTab = 'register'; this.render(); });
    switchToRegister?.addEventListener('click', () => { this._activeTab = 'register'; this.render(); });
    switchToLogin?.addEventListener('click', () => { this._activeTab = 'login'; this.render(); });

    // Submit
    this.container.querySelector('#authPageSubmit')?.addEventListener('click', () => {
      if (this._activeTab === 'login') this._handleLogin();
      else this._handleRegister();
    });

    // Enter key
    this.container.querySelectorAll('.auth-field__input').forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          if (this._activeTab === 'login') this._handleLogin();
          else this._handleRegister();
        }
      });
    });

    // Focus first input
    setTimeout(() => {
      const firstInput = this.container.querySelector('.auth-field__input');
      firstInput?.focus();
    }, 400);
  }

  _showError(msg) {
    const el = this.container.querySelector('#authPageError');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
  }

  _hideError() {
    const el = this.container.querySelector('#authPageError');
    if (el) el.classList.add('hidden');
  }

  _setLoading(loading) {
    const btn = this.container.querySelector('#authPageSubmit');
    if (!btn) return;
    btn.disabled = loading;
    const textEl = btn.querySelector('.auth-card__submit-text');
    const iconEl = btn.querySelector('.auth-card__submit-icon');
    if (loading) {
      textEl.textContent = 'Đang xử lý...';
      iconEl.innerHTML = '<span class="auth-spinner"></span>';
    } else {
      textEl.textContent = this._activeTab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản';
      iconEl.textContent = '→';
    }
  }

  async _handleLogin() {
    this._hideError();
    const username = this.container.querySelector('#authLoginUsername')?.value.trim();
    const password = this.container.querySelector('#authLoginPassword')?.value;

    if (!username || !password) {
      this._showError('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    try {
      this._setLoading(true);
      await storage.login(username, password);
      showToast('Đăng nhập thành công! 🎉', 'success');
      EventBus.emit('authStateChanged', { loggedIn: true });
    } catch (err) {
      this._showError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
    } finally {
      this._setLoading(false);
    }
  }

  async _handleRegister() {
    this._hideError();
    const name = this.container.querySelector('#authRegName')?.value.trim();
    const username = this.container.querySelector('#authRegUsername')?.value.trim();
    const email = this.container.querySelector('#authRegEmail')?.value.trim();
    const password = this.container.querySelector('#authRegPassword')?.value;
    const confirm = this.container.querySelector('#authRegConfirm')?.value;

    if (!username || !email || !password || !confirm) {
      this._showError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    if (password.length < 6) {
      this._showError('Mật khẩu phải tối thiểu 6 ký tự.');
      return;
    }
    if (password !== confirm) {
      this._showError('Mật khẩu nhập lại không khớp.');
      return;
    }

    try {
      this._setLoading(true);
      await storage.register(email, username, password, name);
      showToast('Đăng ký thành công! Chào mừng bạn 🎉', 'success');
      EventBus.emit('authStateChanged', { loggedIn: true });
    } catch (err) {
      this._showError(err.message || 'Đăng ký tài khoản thất bại.');
    } finally {
      this._setLoading(false);
    }
  }
}


// ── Profile Modal (for logged-in users) ──────────────────
class AuthModal {
  constructor() {
    this._modal = null;
    this._isEditingProfile = false;
    this._build();
  }

  _build() {
    this._modal = el('div', { 
      class: 'modal modal--center', 
      id: 'authModal', 
      role: 'dialog', 
      'aria-modal': 'true', 
      'aria-label': 'Tài khoản' 
    });
    
    document.body.appendChild(this._modal);
    this._bindEvents();
  }

  _bindEvents() {
    // Click backdrop to close
    this._modal.addEventListener('click', (e) => {
      if (e.target === this._modal) this.close();
    });
  }

  open() {
    this._renderProfile();
    this._modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this._modal.classList.remove('visible');
    document.body.style.overflow = '';
  }

  // ── Render User Profile ───────────────────────────────
  _renderProfile() {
    const user = storage.getUser() || {};
    const avatar = user.avatar_url;
    const initial = (user.name || user.username || 'U').charAt(0).toUpperCase();
    const joinedDate = user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '—';

    this._modal.innerHTML = `
      <div class="modal__content" style="border-radius:var(--radius-2xl); width:90%; max-width:440px; display:flex; flex-direction:column; background: linear-gradient(180deg, #1e1e2f 0%, #121220 100%);">
        
        <!-- Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:var(--space-4) var(--space-5); border-bottom:1px solid var(--color-border); flex-shrink:0;">
          <button class="btn btn--ghost" id="profileCloseBtn" style="padding:var(--space-1) var(--space-4); border-radius:var(--radius-full); font-size:var(--text-sm); font-weight:var(--weight-semibold); border:none; background:transparent;">
            Đóng
          </button>
          <div style="font-size:var(--text-md); font-weight:var(--weight-bold); color:var(--text-primary)">Tài khoản</div>
          <button class="btn btn--ghost" id="profileActionBtn" style="padding:var(--space-1) var(--space-4); border-radius:var(--radius-full); font-size:var(--text-sm); font-weight:var(--weight-semibold); color:var(--color-accent); border:none; background:transparent;">
            ${this._isEditingProfile ? 'Lưu' : 'Sửa'}
          </button>
        </div>

        <!-- Body -->
        <div class="scroll-y" style="flex:1; padding:var(--space-5); display:flex; flex-direction:column; gap:var(--space-4);">
          
          <!-- Avatar and Username info -->
          <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:var(--space-2); position:relative;">
            <div class="avatar-upload-container">
              <div class="avatar-upload-preview" id="avatarPreview" style="${avatar ? `background-image: url(${avatar}); text-indent: -9999px;` : ''}">
                ${initial}
              </div>
              <label class="avatar-upload-overlay" for="avatarFileInput">
                <span>Đổi</span>
              </label>
              <input type="file" id="avatarFileInput" accept="image/*" class="sr-only" />
            </div>
            
            <div style="font-size:var(--text-lg); font-weight:var(--weight-bold); color:var(--text-primary);" id="displayNameText">${user.name || user.username}</div>
            <div style="font-size:var(--text-xs); color:var(--text-secondary);">@${user.username}</div>
          </div>

          <!-- Message box -->
          <div id="profileMessage" class="hidden" style="font-size:var(--text-xs); padding:var(--space-2) var(--space-3); border-radius:var(--radius-sm);"></div>

          <!-- Fields -->
          <div style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div style="display:flex; flex-direction:column; gap:var(--space-1);">
              <label style="font-size:var(--text-xs); color:var(--text-secondary);">Họ và tên</label>
              <input type="text" id="profileName" class="input-field" value="${user.name || ''}" ${!this._isEditingProfile ? 'disabled' : ''} />
            </div>
            <div style="display:flex; flex-direction:column; gap:var(--space-1);">
              <label style="font-size:var(--text-xs); color:var(--text-secondary);">Email</label>
              <input type="email" id="profileEmail" class="input-field" value="${user.email || ''}" ${!this._isEditingProfile ? 'disabled' : ''} />
            </div>
            <div style="display:flex; flex-direction:column; gap:var(--space-1);">
              <label style="font-size:var(--text-xs); color:var(--text-secondary);">Tiểu sử</label>
              <textarea id="profileBio" class="input-field" style="resize:none;" rows="2" ${!this._isEditingProfile ? 'disabled' : ''}>${user.bio || ''}</textarea>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="profile-stats-grid">
            <div class="profile-stat-card">
              <div class="profile-stat-icon" style="background:rgba(97, 127, 255, 0.15); color:var(--color-accent);">🎙️</div>
              <div class="profile-stat-info">
                <span class="profile-stat-value">${storage.recordings.length}</span>
                <span class="profile-stat-label">Tổng ghi âm</span>
              </div>
            </div>
            <div class="profile-stat-card">
              <div class="profile-stat-icon" style="background:rgba(51, 217, 140, 0.15); color:var(--color-green);">📅</div>
              <div class="profile-stat-info">
                <span class="profile-stat-value">${joinedDate}</span>
                <span class="profile-stat-label">Ngày tham gia</span>
              </div>
            </div>
          </div>

          <!-- Sync Indicator -->
          <div class="sync-status-indicator">
            <span class="sync-status-dot synced"></span>
            <span>Đồng bộ hoá tự động (Máy chủ MySQL)</span>
          </div>

          <!-- Logout button -->
          <button class="btn btn--danger" id="logoutBtn" style="width:100%; border-radius:var(--radius-md); font-size:var(--text-sm); font-weight:var(--weight-semibold); padding:var(--space-3);">
            Đăng xuất
          </button>

        </div>
      </div>
    `;

    // Hook events
    this._modal.querySelector('#profileCloseBtn').addEventListener('click', () => {
      this._isEditingProfile = false;
      this.close();
    });

    const actionBtn = this._modal.querySelector('#profileActionBtn');
    actionBtn.addEventListener('click', () => {
      if (this._isEditingProfile) {
        this._handleSaveProfile();
      } else {
        this._isEditingProfile = true;
        this._renderProfile();
      }
    });

    this._modal.querySelector('#logoutBtn').addEventListener('click', () => {
      this._handleLogout();
    });

    // Avatar upload handler
    const fileInput = this._modal.querySelector('#avatarFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target.result;
          this._modal.querySelector('#avatarPreview').style.backgroundImage = `url(${base64})`;
          this._modal.querySelector('#avatarPreview').textContent = '';
          
          // Save immediately to DB
          try {
            await storage.updateProfileAvatar(base64);
            showToast('Đã cập nhật ảnh đại diện!', 'success');
            EventBus.emit('accountUpdated');
          } catch (err) {
            showToast('Không thể cập nhật ảnh đại diện', 'error');
            console.error(err);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }

  _handleLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      storage.logout();
      showToast('Đã đăng xuất!', 'default');
      this._isEditingProfile = false;
      this.close();
      EventBus.emit('authStateChanged', { loggedIn: false });
    }
  }

  async _handleSaveProfile() {
    const msgEl = this._modal.querySelector('#profileMessage');
    msgEl.classList.add('hidden');

    const name = this._modal.querySelector('#profileName').value.trim();
    const email = this._modal.querySelector('#profileEmail').value.trim();
    const bio = this._modal.querySelector('#profileBio').value.trim();

    if (!email) {
      msgEl.textContent = 'Email là bắt buộc.';
      msgEl.className = 'profile-msg error';
      msgEl.classList.remove('hidden');
      return;
    }

    try {
      this._modal.querySelector('#profileActionBtn').textContent = 'Đang lưu...';
      this._modal.querySelector('#profileActionBtn').disabled = true;

      await storage.updateProfile(name, email, bio);
      
      this._isEditingProfile = false;
      showToast('Đã cập nhật thông tin hồ sơ!', 'success');
      this._renderProfile();
      EventBus.emit('accountUpdated');
    } catch (err) {
      msgEl.textContent = err.message || 'Lỗi khi cập nhật thông tin hồ sơ.';
      msgEl.className = 'profile-msg error';
      msgEl.classList.remove('hidden');
      
      this._modal.querySelector('#profileActionBtn').textContent = 'Lưu';
      this._modal.querySelector('#profileActionBtn').disabled = false;
    }
  }
}
