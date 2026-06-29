/**
 * NoteD Web — Auth & Profile Modal
 * Handles user login, registration, and profile display/edit
 */
class AuthModal {
  constructor() {
    this._modal = null;
    this._activeTab = 'login'; // 'login' or 'register'
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
    this._renderContent();
    this._modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this._modal.classList.remove('visible');
    document.body.style.overflow = '';
  }

  _renderContent() {
    const token = storage.getToken();
    if (token) {
      this._renderProfile();
    } else {
      this._renderAuthForms();
    }
  }

  // ── Render Login/Register Forms ───────────────────────
  _renderAuthForms() {
    const isLogin = this._activeTab === 'login';
    
    this._modal.innerHTML = `
      <div class="modal__content" style="border-radius:var(--radius-2xl); width:90%; max-width:420px; display:flex; flex-direction:column; background: linear-gradient(180deg, #1e1e2f 0%, #121220 100%);">
        
        <!-- Header Tabs -->
        <div class="auth-tabs">
          <button class="auth-tab-btn ${isLogin ? 'active' : ''}" id="tabLoginBtn">Đăng nhập</button>
          <button class="auth-tab-btn ${!isLogin ? 'active' : ''}" id="tabRegisterBtn">Đăng ký</button>
        </div>

        <div style="padding: 0 var(--space-5) var(--space-6); display:flex; flex-direction:column; gap:var(--space-4);">
          
          <div id="authErrorMessage" class="hidden" style="font-size:var(--text-xs); color:var(--color-red); padding:var(--space-2) var(--space-3); background:rgba(255, 77, 77, 0.1); border:1px solid rgba(255, 77, 77, 0.2); border-radius:var(--radius-sm); line-height:1.4;"></div>

          ${isLogin ? this._getLoginHTML() : this._getRegisterHTML()}

          <button class="btn btn--primary" id="authSubmitBtn" style="width:100%; font-size:var(--text-sm); font-weight:var(--weight-semibold); padding:var(--space-3); border-radius:var(--radius-md); margin-top:var(--space-2);">
            ${isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </div>
      </div>
    `;

    // Hook events
    this._modal.querySelector('#tabLoginBtn').addEventListener('click', () => {
      this._activeTab = 'login';
      this._renderAuthForms();
    });

    this._modal.querySelector('#tabRegisterBtn').addEventListener('click', () => {
      this._activeTab = 'register';
      this._renderAuthForms();
    });

    this._modal.querySelector('#authSubmitBtn').addEventListener('click', () => {
      if (isLogin) {
        this._handleLogin();
      } else {
        this._handleRegister();
      }
    });

    // Enter key support
    const inputs = this._modal.querySelectorAll('.input-field');
    inputs.forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          if (isLogin) this._handleLogin();
          else this._handleRegister();
        }
      });
    });
  }

  _getLoginHTML() {
    return `
      <div style="display:flex; flex-direction:column; gap:var(--space-3);">
        <div style="display:flex; flex-direction:column; gap:var(--space-1);">
          <label style="font-size:var(--text-xs); color:var(--text-secondary);">Tên tài khoản hoặc Email</label>
          <input type="text" id="loginUsername" class="input-field" placeholder="username hoặc email" autocomplete="username" />
        </div>
        <div style="display:flex; flex-direction:column; gap:var(--space-1);">
          <label style="font-size:var(--text-xs); color:var(--text-secondary);">Mật khẩu</label>
          <input type="password" id="loginPassword" class="input-field" placeholder="••••••••" autocomplete="current-password" />
        </div>
      </div>
    `;
  }

  _getRegisterHTML() {
    return `
      <div style="display:flex; flex-direction:column; gap:var(--space-3); max-height: 48vh; overflow-y: auto; padding-right: 4px;">
        <div style="display:flex; flex-direction:column; gap:var(--space-1);">
          <label style="font-size:var(--text-xs); color:var(--text-secondary);">Tên hiển thị</label>
          <input type="text" id="regName" class="input-field" placeholder="Ví dụ: Nguyễn Văn A" />
        </div>
        <div style="display:flex; flex-direction:column; gap:var(--space-1);">
          <label style="font-size:var(--text-xs); color:var(--text-secondary);">Tên tài khoản (username)</label>
          <input type="text" id="regUsername" class="input-field" placeholder="viet_tat_khong_dau" autocomplete="username" />
        </div>
        <div style="display:flex; flex-direction:column; gap:var(--space-1);">
          <label style="font-size:var(--text-xs); color:var(--text-secondary);">Email</label>
          <input type="email" id="regEmail" class="input-field" placeholder="name@domain.com" />
        </div>
        <div style="display:flex; flex-direction:column; gap:var(--space-1);">
          <label style="font-size:var(--text-xs); color:var(--text-secondary);">Mật khẩu</label>
          <input type="password" id="regPassword" class="input-field" placeholder="Tối thiểu 6 ký tự" autocomplete="new-password" />
        </div>
        <div style="display:flex; flex-direction:column; gap:var(--space-1);">
          <label style="font-size:var(--text-xs); color:var(--text-secondary);">Xác nhận mật khẩu</label>
          <input type="password" id="regConfirmPassword" class="input-field" placeholder="Nhập lại mật khẩu" autocomplete="new-password" />
        </div>
      </div>
    `;
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

  // ── Authentication Actions ───────────────────────────
  async _handleLogin() {
    const errorEl = this._modal.querySelector('#authErrorMessage');
    errorEl.classList.add('hidden');

    const usernameOrEmail = this._modal.querySelector('#loginUsername').value.trim();
    const password = this._modal.querySelector('#loginPassword').value;

    if (!usernameOrEmail || !password) {
      errorEl.textContent = 'Vui lòng điền đầy đủ thông tin.';
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      this._setLoadingState(true);
      await storage.login(usernameOrEmail, password);
      showToast('Đăng nhập thành công!', 'success');
      this._isEditingProfile = false;
      this._renderContent();
      EventBus.emit('accountUpdated');
    } catch (err) {
      errorEl.textContent = err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.';
      errorEl.classList.remove('hidden');
    } finally {
      this._setLoadingState(false);
    }
  }

  async _handleRegister() {
    const errorEl = this._modal.querySelector('#authErrorMessage');
    errorEl.classList.add('hidden');

    const name = this._modal.querySelector('#regName').value.trim();
    const username = this._modal.querySelector('#regUsername').value.trim();
    const email = this._modal.querySelector('#regEmail').value.trim();
    const password = this._modal.querySelector('#regPassword').value;
    const confirmPassword = this._modal.querySelector('#regConfirmPassword').value;

    if (!username || !email || !password || !confirmPassword) {
      errorEl.textContent = 'Vui lòng điền đầy đủ các thông tin bắt buộc.';
      errorEl.classList.remove('hidden');
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = 'Mật khẩu phải tối thiểu 6 ký tự.';
      errorEl.classList.remove('hidden');
      return;
    }

    if (password !== confirmPassword) {
      errorEl.textContent = 'Mật khẩu nhập lại không khớp.';
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      this._setLoadingState(true);
      await storage.register(email, username, password, name);
      showToast('Đăng ký thành công và tự động đăng nhập!', 'success');
      this._isEditingProfile = false;
      this._renderContent();
      EventBus.emit('accountUpdated');
    } catch (err) {
      errorEl.textContent = err.message || 'Đăng ký tài khoản thất bại.';
      errorEl.classList.remove('hidden');
    } finally {
      this._setLoadingState(false);
    }
  }

  _handleLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất? Dữ liệu ghi âm mới sẽ chỉ được lưu trong trình duyệt cho đến khi bạn đăng nhập lại.')) {
      storage.logout();
      showToast('Đã đăng xuất!', 'default');
      this._isEditingProfile = false;
      this._renderContent();
      EventBus.emit('accountUpdated');
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

  _setLoadingState(loading) {
    const btn = this._modal.querySelector('#authSubmitBtn');
    if (!btn) return;

    if (loading) {
      btn.disabled = true;
      btn.textContent = 'Vui lòng đợi...';
    } else {
      btn.disabled = false;
      btn.textContent = this._activeTab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản';
    }
  }
}
