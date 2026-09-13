<template>
  <div
    v-if="value"
    class="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
    style="position: fixed !important; inset: 0 !important; z-index: 999999 !important; pointer-events: auto !important; touch-action: none !important;"
    @touchmove.stop
    @click.self="close"
  >
    <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-gray-100 flex flex-col max-h-[90vh] animate-scale-up">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60">
        <div class="flex items-center space-x-2.5">
          <span class="material-symbols text-2xl text-amber-400">palette</span>
          <div>
            <h2 class="text-base sm:text-lg font-bold">Stile & Modello Foglio</h2>
            <p class="text-xxs text-gray-400">Personalizza sfondo, righe, quadretti e pentagramma</p>
          </div>
        </div>
        <button
          type="button"
          class="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          @click="close"
          title="Chiudi"
        >
          <span class="material-symbols text-xl">close</span>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto space-y-5">
        <!-- 1. Ambito di applicazione: Solo questo foglio / Tutti i fogli -->
        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ambito di Applicazione</label>
          <div class="grid grid-cols-2 gap-2 bg-gray-950/60 p-1 rounded-xl border border-gray-800">
            <button
              type="button"
              class="py-2 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-1.5"
              :class="!config.applyToAll ? 'bg-amber-500 text-gray-950 font-bold shadow' : 'text-gray-400 hover:text-white'"
              @click="config.applyToAll = false; emitUpdate()"
            >
              <span class="material-symbols text-sm">description</span>
              <span>Solo questo foglio</span>
            </button>
            <button
              type="button"
              class="py-2 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-1.5"
              :class="config.applyToAll ? 'bg-amber-500 text-gray-950 font-bold shadow' : 'text-gray-400 hover:text-white'"
              @click="config.applyToAll = true; emitUpdate()"
            >
              <span class="material-symbols text-sm">library_books</span>
              <span>Tutti i fogli</span>
            </button>
          </div>
        </div>

        <!-- 2. Colori di Sfondo -->
        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Colore di Sfondo</label>
          <div class="grid grid-cols-4 gap-2">
            <!-- Bianco Puro -->
            <button
              type="button"
              class="flex flex-col items-center p-2.5 rounded-xl border transition-all"
              :class="config.background === 'white' ? 'border-amber-400 bg-white/10 ring-2 ring-amber-400/40 shadow' : 'border-gray-800 hover:border-gray-700 bg-gray-950/40'"
              @click="config.background = 'white'; emitUpdate()"
            >
              <span class="w-7 h-7 rounded-full bg-white border border-gray-300 shadow-sm mb-1.5" />
              <span class="text-xs font-medium">⚪ Bianco</span>
            </button>
            <!-- Scuro Notte -->
            <button
              type="button"
              class="flex flex-col items-center p-2.5 rounded-xl border transition-all"
              :class="config.background === 'dark' ? 'border-amber-400 bg-white/10 ring-2 ring-amber-400/40 shadow' : 'border-gray-800 hover:border-gray-700 bg-gray-950/40'"
              @click="config.background = 'dark'; emitUpdate()"
            >
              <span class="w-7 h-7 rounded-full bg-[#18191c] border border-gray-700 shadow-sm mb-1.5" />
              <span class="text-xs font-medium">🌑 Notte</span>
            </button>
            <!-- Seppia Libro -->
            <button
              type="button"
              class="flex flex-col items-center p-2.5 rounded-xl border transition-all"
              :class="config.background === 'sepia' ? 'border-amber-400 bg-white/10 ring-2 ring-amber-400/40 shadow' : 'border-gray-800 hover:border-gray-700 bg-gray-950/40'"
              @click="config.background = 'sepia'; emitUpdate()"
            >
              <span class="w-7 h-7 rounded-full bg-[#fbf0d9] border border-amber-300 shadow-sm mb-1.5" />
              <span class="text-xs font-medium">📜 Seppia</span>
            </button>
            <!-- Personalizzato -->
            <button
              type="button"
              class="flex flex-col items-center p-2.5 rounded-xl border transition-all relative cursor-pointer"
              :class="config.background === 'custom' ? 'border-amber-400 bg-white/10 ring-2 ring-amber-400/40 shadow' : 'border-gray-800 hover:border-gray-700 bg-gray-950/40'"
              @click="config.background = 'custom'; emitUpdate()"
            >
              <span class="w-7 h-7 rounded-full border border-gray-600 shadow-sm mb-1.5 flex items-center justify-center overflow-hidden" :style="{ backgroundColor: config.customColor || '#1e293b' }">
                <input
                  type="color"
                  v-model="config.customColor"
                  class="opacity-0 w-full h-full cursor-pointer"
                  @input="config.background = 'custom'; emitUpdate()"
                />
              </span>
              <span class="text-xs font-medium">🎨 Custom</span>
            </button>
          </div>
        </div>

        <!-- 3. Modelli di Foglio & Pentagramma -->
        <div>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Modello di Foglio</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              v-for="tpl in templateList"
              :key="tpl.id"
              type="button"
              class="flex flex-col items-center p-2.5 rounded-xl border text-center transition-all"
              :class="config.template === tpl.id ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-semibold ring-1 ring-amber-400/30 shadow' : 'border-gray-800 hover:border-gray-700 text-gray-300 bg-gray-950/30'"
              @click="config.template = tpl.id; emitUpdate()"
            >
              <span class="material-symbols text-xl mb-1">{{ tpl.icon }}</span>
              <span class="text-xs">{{ tpl.name }}</span>
            </button>
          </div>
        </div>

        <!-- 4. Motivi & Texture di Sfondo -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Texture & Motivi Grafici</label>
            <!-- Carica Immagine Custom -->
            <label class="cursor-pointer text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center space-x-1">
              <span class="material-symbols text-sm">upload_file</span>
              <span>Carica sfondo...</span>
              <input type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
            </label>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="pat in patternList"
              :key="pat.id"
              type="button"
              class="p-2 rounded-xl border text-xs text-center transition-all"
              :class="config.pattern === pat.id ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-semibold ring-1 ring-amber-400/30 shadow' : 'border-gray-800 hover:border-gray-700 text-gray-300 bg-gray-950/30'"
              @click="config.pattern = pat.id; config.customPatternImage = null; emitUpdate()"
            >
              {{ pat.name }}
            </button>
          </div>
          <div v-if="config.customPatternImage" class="mt-2 flex items-center justify-between bg-gray-950/60 p-2.5 rounded-xl border border-gray-800">
            <span class="text-xs text-emerald-400 flex items-center space-x-1">
              <span class="material-symbols text-sm">check_circle</span>
              <span>Sfondo personalizzato caricato</span>
            </span>
            <button type="button" class="text-xs text-red-400 hover:text-red-300 font-medium" @click="config.customPatternImage = null; emitUpdate()">Rimuovi</button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-800 bg-gray-950/60 flex justify-end space-x-2">
        <button
          type="button"
          class="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl text-xs sm:text-sm transition shadow-lg shadow-amber-500/20 flex items-center space-x-1.5"
          @click="close"
        >
          <span class="material-symbols text-sm font-bold">check</span>
          <span>Applica & Chiudi</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    value: {
      type: Boolean,
      default: false
    },
    currentConfig: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      config: {
        background: 'white',
        customColor: '#ffffff',
        template: 'blank',
        pattern: 'none',
        customPatternImage: null,
        applyToAll: false
      },
      templateList: [
        { id: 'blank', name: 'Bianco', icon: 'crop_portrait' },
        { id: 'ruled', name: 'Righe Standard', icon: 'format_align_left' },
        { id: 'ruled_narrow', name: 'Righe Strette', icon: 'density_small' },
        { id: 'grid', name: 'Quadretti 5mm', icon: 'grid_4x4' },
        { id: 'millimeter', name: 'Millimetrata', icon: 'border_inner' },
        { id: 'dot', name: 'Puntinato', icon: 'grain' },
        { id: 'music', name: 'Pentagramma', icon: 'queue_music' },
        { id: 'cornell', name: 'Cornell', icon: 'view_quilt' }
      ],
      patternList: [
        { id: 'none', name: 'Nessuno' },
        { id: 'dots', name: 'Puntinatura' },
        { id: 'isometric', name: 'Assonometria 3D' },
        { id: 'blueprint', name: 'Blueprint' },
        { id: 'parchment', name: 'Pergamena' }
      ]
    }
  },
  watch: {
    currentConfig: {
      immediate: true,
      deep: true,
      handler(newVal) {
        if (newVal) {
          this.config = { ...this.config, ...newVal }
        }
      }
    }
  },
  methods: {
    close() {
      this.$emit('input', false)
    },
    emitUpdate() {
      this.$emit('update', { ...this.config })
    },
    handleFileUpload(e) {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        this.config.customPatternImage = event.target.result
        this.config.pattern = 'custom'
        this.emitUpdate()
      }
      reader.readAsDataURL(file)
    }
  }
}
</script>

<style scoped>
.text-xxs {
  font-size: 0.65rem;
}
@keyframes scaleUp {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-scale-up {
  animation: scaleUp 0.15s ease-out;
}
</style>

