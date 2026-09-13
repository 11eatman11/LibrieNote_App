/**
 * Smart Network Manager per Libri & Note (Android & Web)
 * - Rileva se si e' in LAN domestica o connessi a Internet da remoto
 * - Mostra prompt per Tailscale se fuori casa
 * - Attiva modalita' locale offline
 * - Esegue backup e sincronizzazione automatica al ritorno della connessione
 */

const STORAGE_KEY = 'librienote_smart_network_config';

export const DEFAULT_NETWORK_CONFIG = {
  nasLocalAddress: 'http://192.168.1.100:13378',
  nasTailscaleAddress: '',
  autoPromptTailscale: true,
  autoSyncOnReconnect: true,
  checkIntervalSec: 15,
  lastSyncTime: null
};

class SmartNetworkManager {
  constructor() {
    this.config = this.loadConfig();
    this.currentState = 'UNKNOWN'; // 'LAN', 'TAILSCALE', 'TAILSCALE_PROMPT', 'OFFLINE'
    this.activeAddress = null;
    this.listeners = [];
    this.isChecking = false;
    this.isSyncing = false;
    this.checkTimer = null;
    this.eventBus = null;
  }

  setEventBus(bus) {
    this.eventBus = bus;
  }

  loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_NETWORK_CONFIG, ...JSON.parse(raw) };
    } catch (e) {}
    return { ...DEFAULT_NETWORK_CONFIG };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {}
    this.emitChange();
  }

  async probeAddress(address, timeoutMs = 2500) {
    if (!address) return false;
    try {
      let cleanUrl = address.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'http://' + cleanUrl;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${cleanUrl}/ping`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timer);
      return res.status >= 200 && res.status < 500;
    } catch (e) {
      return false;
    }
  }

  isOnline() {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  async checkNetwork(store = null) {
    if (this.isChecking) return;
    this.isChecking = true;

    const previousState = this.currentState;
    const online = this.isOnline();

    if (!online) {
      this.currentState = 'OFFLINE';
      this.activeAddress = null;
      this.emitChange();
      this.isChecking = false;
      return;
    }

    // 1. Prova connessione LAN Locale
    const isLanReachable = await this.probeAddress(this.config.nasLocalAddress, 2000);
    if (isLanReachable) {
      this.currentState = 'LAN';
      this.activeAddress = this.config.nasLocalAddress;
    } else {
      // 2. Se LAN fallisce, prova Tailscale se impostato
      let isTsReachable = false;
      if (this.config.nasTailscaleAddress) {
        isTsReachable = await this.probeAddress(this.config.nasTailscaleAddress, 2500);
      }

      if (isTsReachable) {
        this.currentState = 'TAILSCALE';
        this.activeAddress = this.config.nasTailscaleAddress;
      } else {
        // Fuori rete domestica con Internet attivo
        this.currentState = 'TAILSCALE_PROMPT';
        this.activeAddress = null;
      }
    }

    // Aggiorna l'indirizzo server attivo nello store se configurato
    if (store && this.activeAddress) {
      const currentServer = store.getters['user/getServerAddress'];
      if (currentServer !== this.activeAddress) {
        store.commit('user/setServerAddress', this.activeAddress);
      }
    }

    this.emitChange();

    // Trigger Auto-Sync se siamo passati da OFFLINE a LAN o TAILSCALE
    if (this.config.autoSyncOnReconnect && previousState === 'OFFLINE' && (this.currentState === 'LAN' || this.currentState === 'TAILSCALE')) {
      this.triggerAutoBackup(store);
    }

    this.isChecking = false;
  }

  async triggerAutoBackup(store) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    if (this.eventBus) this.eventBus.$emit('smart-sync-start');

    try {
      // Sincronizza note offline salvate in IndexedDB
      const { noteStorage } = await import('@/services/noteStorage');
      const userId = store?.state?.user?.user?.id || 'default_user';
      if (userId && noteStorage) {
        await noteStorage.syncOfflineNotes(userId);
      }
      this.config.lastSyncTime = new Date().toISOString();
      this.saveConfig(this.config);
      if (this.eventBus) this.eventBus.$emit('smart-sync-success', this.config.lastSyncTime);
    } catch (e) {
      console.error('[SmartNetwork] Auto-backup error:', e);
      if (this.eventBus) this.eventBus.$emit('smart-sync-error', e.message);
    } finally {
      this.isSyncing = false;
    }
  }

  openTailscaleApp() {
    try {
      // Prova ad aprire l'app Tailscale su Android tramite schema o intent
      window.location.href = 'tailscale://';
    } catch (e) {
      window.open('https://login.tailscale.com/admin/machines', '_blank');
    }
  }

  startMonitoring(store = null, bus = null) {
    if (bus) this.eventBus = bus;
    this.checkNetwork(store);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.checkNetwork(store));
      window.addEventListener('offline', () => {
        this.currentState = 'OFFLINE';
        this.emitChange();
      });
    }

    if (this.checkTimer) clearInterval(this.checkTimer);
    this.checkTimer = setInterval(() => {
      this.checkNetwork(store);
    }, Math.max(10, this.config.checkIntervalSec || 15) * 1000);
  }

  stopMonitoring() {
    if (this.checkTimer) clearInterval(this.checkTimer);
  }

  subscribe(callback) {
    this.listeners.push(callback);
    callback({ state: this.currentState, activeAddress: this.activeAddress, config: this.config });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  emitChange() {
    const payload = { state: this.currentState, activeAddress: this.activeAddress, config: this.config };
    this.listeners.forEach((cb) => cb(payload));
    if (this.eventBus) {
      this.eventBus.$emit('smart-network-state', payload);
    }
  }
}

export const smartNetworkManager = new SmartNetworkManager();
