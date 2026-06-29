/**
 * NoteD Web — Main Application Controller & Router
 */
document.addEventListener('DOMContentLoaded', () => {
  // ── Initialize Containers ────────────────────────────
  const authScreen       = $('#authScreen');
  const appLayout        = $('#appLayout');
  const sidebarContainer = $('#sidebarContainer');
  const detailContainer  = $('#detailContainer');

  if (!authScreen || !appLayout || !sidebarContainer || !detailContainer) {
    console.error('App layout containers not found in index.html');
    return;
  }

  // ── Auth State Management ───────────────────────────
  let authPage     = null;
  let homeView     = null;
  let detailView   = null;
  let recordingModal = null;
  let settingsModal  = null;
  let authModal      = null;

  function showAuthScreen() {
    authScreen.classList.remove('hidden');
    appLayout.classList.add('hidden');
    if (!authPage) {
      authPage = new AuthPage(authScreen);
    } else {
      authPage.render();
    }
  }

  function showApp() {
    authScreen.classList.add('hidden');
    appLayout.classList.remove('hidden');

    // Initialize views only once
    if (!homeView) {
      homeView       = new HomeView(sidebarContainer);
      detailView     = new DetailView(detailContainer);
      recordingModal = new RecordingModal();
      settingsModal  = new SettingsModal();
      authModal      = new AuthModal();
      _bindAppEvents();
    } else {
      // Refresh the list when coming back from auth
      homeView.render();
      homeView._bind();
    }
  }

  // ── Check initial auth state ────────────────────────
  const token = storage.getToken();
  if (token) {
    showApp();
  } else {
    showAuthScreen();
  }

  // ── Listen for auth state changes ───────────────────
  EventBus.on('authStateChanged', ({ loggedIn }) => {
    if (loggedIn) {
      showApp();
    } else {
      showAuthScreen();
    }
  });

  // ── App Event Bus Routing ───────────────────────────
  function _bindAppEvents() {
    // 1. Open Detail View
    EventBus.on('openDetail', (recording) => {
      detailView.load(recording);
      homeView.setActiveRecording(recording.id);

      if (window.innerWidth <= 768) {
        sidebarContainer.classList.add('hidden');
        detailContainer.classList.add('active');
      }
    });

    // 2. Close Detail View (back button on mobile)
    EventBus.on('closeDetail', () => {
      homeView.setActiveRecording(null);

      if (window.innerWidth <= 768) {
        sidebarContainer.classList.remove('hidden');
        detailContainer.classList.remove('active');
      }
    });

    // 3. Open Settings Modal
    EventBus.on('openSettings', () => {
      settingsModal.open();
    });

    // 3b. Open Account Modal
    EventBus.on('openAccount', () => {
      authModal.open();
    });

    // 4. Open Recorder Modal
    EventBus.on('openRecorder', () => {
      recordingModal.open((newRecording) => {
        EventBus.emit('openDetail', newRecording);
      });
    });

    // ── Responsive Layout Adaptations ─────────────────
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        sidebarContainer.classList.remove('hidden');
        detailContainer.classList.remove('active');
      } else {
        if (homeView._activeRecordingId) {
          sidebarContainer.classList.add('hidden');
          detailContainer.classList.add('active');
        } else {
          sidebarContainer.classList.remove('hidden');
          detailContainer.classList.remove('active');
        }
      }
    });
  }

  // Log successful launch
  console.log('NoteD Web application successfully initialized');
});
