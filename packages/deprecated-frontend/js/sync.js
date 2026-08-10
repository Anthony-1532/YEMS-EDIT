/* =============================================
   SYNC.JS — YEMS Data Synchronization
   Now remote-only (no local fallback)
   ============================================= */

const SyncService = (() => {
  const CONFIG = {
    autoSync: true,
    syncInterval: 60000,
    retryAttempts: 3,
    retryDelay: 1000
  };

  let syncTimer = null;
  let isSyncing = false;

  const status = {
    lastSync: null,
    connected: false,
    error: null
  };

  async function checkConnection() {
    try {
      const connected = await API.checkConnection();
      status.connected = connected;
      return connected;
    } catch (e) {
      status.connected = false;
      return false;
    }
  }

  async function syncNotes() {
    try {
      const result = await API.notes.getAll();
      const notes = result.data || result.notes || [];
      status.lastSync = new Date();
      return notes;
    } catch (e) {
      console.warn('Notes sync failed:', e.message);
      throw e;
    }
  }

  async function syncAssignments() {
    try {
      const result = await API.assignments.getAll();
      const assignments = result.data || result.assignments || [];
      status.lastSync = new Date();
      return assignments;
    } catch (e) {
      console.warn('Assignments sync failed:', e.message);
      throw e;
    }
  }

  async function syncExams() {
    try {
      const result = await API.exams.getAll();
      const exams = result.data || result.exams || [];
      status.lastSync = new Date();
      return exams;
    } catch (e) {
      console.warn('Exams sync failed:', e.message);
      throw e;
    }
  }

  async function fullSync() {
    if (isSyncing) return;
    isSyncing = true;

    try {
      const connected = await checkConnection();
      if (!connected) {
        console.warn('[Sync] API not available');
        throw new Error('API not available');
      }

      const user = Auth.current();
      if (!user) {
        throw new Error('Not authenticated');
      }

      await Auth.ensureValidToken();

      await Promise.all([
        syncNotes(),
        syncAssignments(),
        syncExams()
      ]);

      console.log('[Sync] Full sync completed');
      return { success: true, timestamp: new Date() };
    } catch (e) {
      console.error('[Sync] Full sync error:', e.message);
      return { success: false, error: e.message };
    } finally {
      isSyncing = false;
    }
  }

  function startAutoSync() {
    if (syncTimer) return;

    syncTimer = setInterval(async () => {
      const user = Auth.current();
      if (user && status.connected) {
        await fullSync();
      }
    }, CONFIG.syncInterval);

    console.log('[Sync] Auto-sync started');
  }

  function stopAutoSync() {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
      console.log('[Sync] Auto-sync stopped');
    }
  }

  async function init() {
    const user = Auth.current();
    if (!user) {
      status.connected = false;
      return;
    }

    await checkConnection();
  }

  init();

  return {
    CONFIG,
    status,
    checkConnection,
    fullSync,
    startAutoSync,
    stopAutoSync
  };
})();

window.SyncService = SyncService;
