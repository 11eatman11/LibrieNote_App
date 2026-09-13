<template>
  <modals-modal v-model="show" :width="460">
    <div class="p-5 text-fg">
      <div class="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div class="flex items-center space-x-2">
          <span class="material-symbols text-xl text-amber-400">hub</span>
          <h2 class="text-base font-bold">Gestione Rete NAS & Tailscale</h2>
        </div>
        <button type="button" class="p-1 rounded hover:bg-white/10" @click="show = false">&times;</button>
      </div>

      <div class="space-y-4 text-xs">
        <div>
          <label class="block font-semibold mb-1 text-fg-muted">Indirizzo Server NAS (Rete Locale):</label>
          <ui-text-input v-model="nasLocal" placeholder="http://192.168.1.100:13378" class="w-full" />
          <span class="text-xxs text-fg-muted">Utilizzato quando sei connesso al Wi-Fi o alla LAN di casa.</span>
        </div>

        <div>
          <label class="block font-semibold mb-1 text-fg-muted">Indirizzo Server NAS (Tailscale VPN):</label>
          <ui-text-input v-model="nasTailscale" placeholder="http://100.x.y.z:13378 o http://qnap-nas:13378" class="w-full" />
          <span class="text-xxs text-fg-muted">Utilizzato quando sei fuori casa con dati cellulare o Wi-Fi esterno.</span>
        </div>

        <div class="flex items-center justify-between py-1">
          <span class="font-semibold text-fg">Chiedi di aprire Tailscale se fuori casa</span>
          <ui-toggle-switch v-model="autoPrompt" />
        </div>

        <div class="flex items-center justify-between py-1">
          <span class="font-semibold text-fg">Auto-backup al ripristino connessione</span>
          <ui-toggle-switch v-model="autoSync" />
        </div>

        <!-- Probe Test Results -->
        <div v-if="testResult" class="p-3 rounded-xl bg-bg-light border border-border">
          <p class="font-bold mb-1">Risultato Test:</p>
          <p :class="testResult.lan ? 'text-green-400' : 'text-red-400'">• LAN Locale: {{ testResult.lan ? 'Raggiungibile (Online)' : 'Non raggiungibile' }}</p>
          <p :class="testResult.ts ? 'text-green-400' : 'text-red-400'">• Tailscale: {{ testResult.ts ? 'Raggiungibile (Online)' : 'Non raggiungibile' }}</p>
        </div>
      </div>

      <div class="flex items-center justify-between mt-6 pt-3 border-t border-border">
        <button type="button" class="px-3 py-1.5 rounded-xl bg-bg-light hover:bg-white/10 text-xs font-semibold text-fg" @click="testConnections" :disabled="testing">
          {{ testing ? 'Verifica in corso...' : 'Testa Connessione' }}
        </button>

        <div class="flex space-x-2">
          <ui-btn small @click="show = false">Annulla</ui-btn>
          <ui-btn small color="primary" @click="save">Salva</ui-btn>
        </div>
      </div>
    </div>
  </modals-modal>
</template>

<script>
import { smartNetworkManager } from '@/services/smartNetworkManager'

export default {
  props: {
    value: Boolean
  },
  data() {
    return {
      nasLocal: '',
      nasTailscale: '',
      autoPrompt: true,
      autoSync: true,
      testing: false,
      testResult: null
    }
  },
  computed: {
    show: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit('input', val)
      }
    }
  },
  watch: {
    value(val) {
      if (val) {
        this.load()
      }
    }
  },
  methods: {
    load() {
      const cfg = smartNetworkManager.config
      this.nasLocal = cfg.nasLocalAddress || ''
      this.nasTailscale = cfg.nasTailscaleAddress || ''
      this.autoPrompt = cfg.autoPromptTailscale !== false
      this.autoSync = cfg.autoSyncOnReconnect !== false
      this.testResult = null
    },
    async testConnections() {
      this.testing = true
      const lan = await smartNetworkManager.probeAddress(this.nasLocal, 2500)
      let ts = false
      if (this.nasTailscale) {
        ts = await smartNetworkManager.probeAddress(this.nasTailscale, 2500)
      }
      this.testResult = { lan, ts }
      this.testing = false
    },
    save() {
      smartNetworkManager.saveConfig({
        nasLocalAddress: this.nasLocal.trim(),
        nasTailscaleAddress: this.nasTailscale.trim(),
        autoPromptTailscale: this.autoPrompt,
        autoSyncOnReconnect: this.autoSync
      })
      smartNetworkManager.checkNetwork(this.$store)
      this.show = false
    }
  }
}
</script>
