<template>
  <div v-if="showBanner" class="w-full bg-gradient-to-r from-amber-600/90 to-orange-600/90 text-white px-4 py-2.5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 z-40 transition-all">
    <div class="flex items-center space-x-2.5">
      <span class="material-symbols text-xl animate-pulse text-amber-200">vpn_lock</span>
      <div>
        <p class="text-xs font-bold leading-tight">Sei fuori dalla rete domestica!</p>
        <p class="text-xxs text-amber-100 opacity-90 leading-tight">Il NAS locale non risponde. Connetti Tailscale per accedere ai tuoi libri e note da remoto.</p>
      </div>
    </div>

    <div class="flex items-center space-x-2 w-full sm:w-auto justify-end">
      <button
        type="button"
        class="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-white text-xxs font-semibold border border-white/20 transition"
        @click="dismiss"
      >
        Lavora Offline
      </button>

      <button
        type="button"
        class="px-3 py-1 rounded-lg bg-white text-gray-900 hover:bg-amber-100 text-xxs font-bold shadow flex items-center space-x-1 transition"
        @click="openTailscale"
      >
        <span class="material-symbols text-xs">open_in_new</span>
        <span>Apri Tailscale</span>
      </button>
    </div>
  </div>
</template>

<script>
import { smartNetworkManager } from '@/services/smartNetworkManager'

export default {
  data() {
    return {
      netState: 'UNKNOWN',
      dismissed: false
    }
  },
  computed: {
    showBanner() {
      return this.netState === 'TAILSCALE_PROMPT' && !this.dismissed
    }
  },
  mounted() {
    this.unsubscribe = smartNetworkManager.subscribe(({ state }) => {
      this.netState = state
      if (state !== 'TAILSCALE_PROMPT') {
        this.dismissed = false
      }
    })
  },
  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe()
  },
  methods: {
    dismiss() {
      this.dismissed = true
    },
    openTailscale() {
      smartNetworkManager.openTailscaleApp()
    }
  }
}
</script>
