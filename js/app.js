/**
 * NoteD Web — Main Application Controller & Router
 */
document.addEventListener('DOMContentLoaded', () => {
  // ── Initialize Containers ────────────────────────────
  const sidebarContainer = $('#sidebarContainer');
  const detailContainer = $('#detailContainer');

  if (!sidebarContainer || !detailContainer) {
    console.error('App layout containers not found in index.html');
    return;
  }

  // ── Initialize Modals & Views ────────────────────────
  const homeView       = new HomeView(sidebarContainer);
  const detailView     = new DetailView(detailContainer);
  const recordingModal = new RecordingModal();
  const settingsModal  = new SettingsModal();
  const authModal      = new AuthModal();

  // ── Global Event Bus Routing ─────────────────────────

  // 1. Open Detail View
  EventBus.on('openDetail', (recording) => {
    // Load recording into detail view
    detailView.load(recording);
    
    // Switch active state for home view list
    homeView.setActiveRecording(recording.id);

    // Mobile layout transition: hide sidebar, show detail panel
    if (window.innerWidth <= 768) {
      sidebarContainer.classList.add('hidden');
      detailContainer.classList.add('active');
    }
  });

  // 2. Close Detail View (back button on mobile)
  EventBus.on('closeDetail', () => {
    // De-select active row in list
    homeView.setActiveRecording(null);

    // Mobile layout transition: show sidebar, hide detail panel
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
      // Callback when a recording finishes processing
      // We automatically select it to view the detail page
      EventBus.emit('openDetail', newRecording);
    });
  });

  // ── Responsive Layout Adaptations ─────────────────────
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      // Restore visible sidebar and main panel on desktop
      sidebarContainer.classList.remove('hidden');
      detailContainer.classList.remove('active');
    } else {
      // If we are on mobile, and a recording is currently active, ensure detail panel is shown
      if (homeView._activeRecordingId) {
        sidebarContainer.classList.add('hidden');
        detailContainer.classList.add('active');
      } else {
        sidebarContainer.classList.remove('hidden');
        detailContainer.classList.remove('active');
      }
    }
  });

  // Log successful launch
  console.log('NoteD Web application successfully initialized');
});
