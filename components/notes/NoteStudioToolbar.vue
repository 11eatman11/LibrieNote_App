<template>
  <div class="note-studio-toolbar fixed right-3 top-20 z-40 flex flex-col items-center select-none">
    <!-- Floating Toolbar Capsule -->
    <div class="bg-gray-900/90 backdrop-blur-md border border-gray-700/80 rounded-2xl shadow-2xl p-1.5 flex flex-col items-center space-y-1.5 text-gray-200">
      <!-- 0. Cursore / Navigazione & Link (👆) -->
      <button
        type="button"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        :class="activeTool === 'cursor' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'hover:bg-white/10 text-gray-300'"
        @click="handleClick('cursor')"
        title="Cursore / Navigazione (Clicca link e seleziona testo)"
      >
        <span class="material-symbols text-xl">near_me</span>
      </button>

      <div class="w-6 h-px bg-gray-700/80 my-0.5"></div>

      <!-- 1. Penna Digitale (✏️) -->
      <div class="relative group">
        <button
          type="button"
          class="w-10 h-10 rounded-xl flex items-center justify-center transition-all relative"
          :class="activeTool === 'pen' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'hover:bg-white/10 text-gray-300'"
          @click="handleClick('pen')"
          title="Penna Digitale (Clic: attiva, secondo Clic: opzioni)"
        >
          <span class="material-symbols text-xl">edit</span>
          <!-- Badge colore/tratto attivo -->
          <span
            class="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-black/40"
            :style="{ backgroundColor: toolSettings.pen.color }"
          />
        </button>

        <!-- Popover Menu Penna (aperto al secondo clic sullo strumento attivo) -->
        <div
          v-if="openMenu === 'pen'"
          class="absolute right-12 top-0 bg-gray-900/95 border border-gray-700 rounded-xl p-3 shadow-2xl w-60 text-xs text-white z-50 space-y-2.5 backdrop-blur-md"
          @click.stop
        >
          <div class="flex items-center justify-between pb-1 border-b border-gray-800">
            <span class="font-bold flex items-center space-x-1">
              <span class="material-symbols text-sm text-blue-400">edit</span>
              <span>Penna Digitale</span>
            </span>
            <button type="button" class="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10" @click="openMenu = null">✕</button>
          </div>
          <div>
            <div class="flex justify-between text-gray-400 mb-1">
              <span>Tratto Penna:</span>
              <span class="font-mono font-bold text-white">{{ toolSettings.pen.strokeWidth }}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              v-model.number="toolSettings.pen.strokeWidth"
              class="w-full accent-blue-500 cursor-pointer"
              @input="saveSettings"
            />
          </div>
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-gray-400">Colore Inchiostro:</span>
              <label class="cursor-pointer flex items-center space-x-1 text-blue-400 hover:text-blue-300">
                <span class="material-symbols text-xs">colorize</span>
                <span class="text-xxs font-medium">Custom</span>
                <input
                  type="color"
                  v-model="toolSettings.pen.color"
                  class="opacity-0 w-0 h-0 absolute pointer-events-none"
                  @input="saveSettings"
                />
              </label>
            </div>
            <div class="grid grid-cols-6 gap-1.5">
              <button
                v-for="c in penColors"
                :key="c"
                type="button"
                class="w-6 h-6 rounded-full border border-white/30 transition-transform hover:scale-110"
                :class="{ 'ring-2 ring-white scale-110': toolSettings.pen.color === c }"
                :style="{ backgroundColor: c }"
                @click="toolSettings.pen.color = c; saveSettings()"
              />
              <!-- Custom color circle with color input -->
              <label
                class="w-6 h-6 rounded-full border border-white/50 transition-transform hover:scale-110 cursor-pointer flex items-center justify-center relative overflow-hidden"
                :style="{ backgroundColor: toolSettings.pen.color }"
                title="Scegli colore personalizzato"
              >
                <span class="material-symbols text-xs text-white drop-shadow">palette</span>
                <input
                  type="color"
                  v-model="toolSettings.pen.color"
                  class="opacity-0 w-full h-full absolute inset-0 cursor-pointer"
                  @input="saveSettings"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Evidenziatore (🖍️) -->
      <div class="relative group">
        <button
          type="button"
          class="w-10 h-10 rounded-xl flex items-center justify-center transition-all relative"
          :class="activeTool === 'highlighter' ? 'bg-amber-500 text-gray-950 font-bold shadow-lg shadow-amber-500/30' : 'hover:bg-white/10 text-gray-300'"
          @click="handleClick('highlighter')"
          title="Evidenziatore (Clic: attiva, secondo Clic: opzioni)"
        >
          <span class="material-symbols text-xl">ink_highlighter</span>
          <span
            class="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-black/40"
            :style="{ backgroundColor: toolSettings.highlighter.color }"
          />
        </button>

        <!-- Popover Menu Evidenziatore -->
        <div
          v-if="openMenu === 'highlighter'"
          class="absolute right-12 top-0 bg-gray-900/95 border border-gray-700 rounded-xl p-3 shadow-2xl w-60 text-xs text-white z-50 space-y-2.5 backdrop-blur-md"
          @click.stop
        >
          <div class="flex items-center justify-between pb-1 border-b border-gray-800">
            <span class="font-bold flex items-center space-x-1">
              <span class="material-symbols text-sm text-amber-400">ink_highlighter</span>
              <span>Evidenziatore</span>
            </span>
            <button type="button" class="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10" @click="openMenu = null">✕</button>
          </div>
          <!-- Spessore -->
          <div>
            <div class="flex justify-between text-gray-400 mb-1">
              <span>Spessore:</span>
              <span class="font-mono font-bold text-white">{{ toolSettings.highlighter.strokeWidth }}px</span>
            </div>
            <input
              type="range"
              min="8"
              max="48"
              step="2"
              v-model.number="toolSettings.highlighter.strokeWidth"
              class="w-full accent-amber-400 cursor-pointer"
              @input="saveSettings"
            />
          </div>
          <!-- Barra per Trasparenza -->
          <div>
            <div class="flex justify-between text-gray-400 mb-1">
              <span>Trasparenza:</span>
              <span class="font-mono font-bold text-white">{{ Math.round((toolSettings.highlighter.opacity || 0.4) * 100) }}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              v-model.number="toolSettings.highlighter.opacity"
              class="w-full accent-amber-400 cursor-pointer"
              @input="saveSettings"
            />
          </div>
          <!-- Colori Fluorescenti + Colore Personalizzato -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-gray-400">Colore Evidenziatore:</span>
              <label class="cursor-pointer flex items-center space-x-1 text-amber-400 hover:text-amber-300">
                <span class="material-symbols text-xs">colorize</span>
                <span class="text-xxs font-medium">Custom</span>
                <input
                  type="color"
                  v-model="toolSettings.highlighter.color"
                  class="opacity-0 w-0 h-0 absolute pointer-events-none"
                  @input="saveSettings"
                />
              </label>
            </div>
            <div class="grid grid-cols-6 gap-1.5">
              <button
                v-for="c in highlighterColors"
                :key="c"
                type="button"
                class="w-6 h-6 rounded-full border border-white/30 transition-transform hover:scale-110"
                :class="{ 'ring-2 ring-white scale-110': toolSettings.highlighter.color === c }"
                :style="{ backgroundColor: c }"
                @click="toolSettings.highlighter.color = c; saveSettings()"
              />
              <!-- Custom color circle with color input -->
              <label
                class="w-6 h-6 rounded-full border border-white/50 transition-transform hover:scale-110 cursor-pointer flex items-center justify-center relative overflow-hidden"
                :style="{ backgroundColor: toolSettings.highlighter.color }"
                title="Scegli colore personalizzato"
              >
                <span class="material-symbols text-xs text-white drop-shadow">palette</span>
                <input
                  type="color"
                  v-model="toolSettings.highlighter.color"
                  class="opacity-0 w-full h-full absolute inset-0 cursor-pointer"
                  @input="saveSettings"
                />
              </label>
            </div>
          </div>
          <!-- Toggle Linee Dritte -->
          <div class="pt-1 border-t border-gray-800 flex items-center justify-between">
            <span class="text-xs text-gray-300">Linee Dritte (Snap):</span>
            <button
              type="button"
              class="px-2 py-1 rounded text-xxs font-bold transition"
              :class="toolSettings.highlighter.straightLine ? 'bg-amber-400 text-gray-950' : 'bg-gray-800 text-gray-400'"
              @click="toolSettings.highlighter.straightLine = !toolSettings.highlighter.straightLine; saveSettings()"
            >
              {{ toolSettings.highlighter.straightLine ? 'ATTIVO' : 'DISATTIVO' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Bottone a Spinta Linee Dritte quando evidenziatore è attivo -->
      <button
        v-if="activeTool === 'highlighter'"
        type="button"
        class="w-10 h-8 rounded-lg flex items-center justify-center transition-all text-xs"
        :class="toolSettings.highlighter.straightLine ? 'bg-amber-400 text-gray-950 font-bold' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'"
        @click="toolSettings.highlighter.straightLine = !toolSettings.highlighter.straightLine; saveSettings()"
        title="Pulsante a spinta: Linee Dritte"
      >
        <span class="material-symbols text-sm">straighten</span>
      </button>

      <!-- 3. Gomma Intelligente (🧽) -->
      <div class="relative group">
        <button
          type="button"
          class="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          :class="activeTool === 'eraser' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' : 'hover:bg-white/10 text-gray-300'"
          @click="handleClick('eraser')"
          title="Gomma (Clic: attiva, secondo Clic: opzioni)"
        >
          <span class="material-symbols text-xl">ink_eraser</span>
        </button>

        <!-- Popover Menu Gomma -->
        <div
          v-if="openMenu === 'eraser'"
          class="absolute right-12 top-0 bg-gray-900/95 border border-gray-700 rounded-xl p-3 shadow-2xl w-56 text-xs text-white z-50 space-y-2.5 backdrop-blur-md"
          @click.stop
        >
          <div class="flex items-center justify-between pb-1 border-b border-gray-800">
            <span class="font-bold flex items-center space-x-1">
              <span class="material-symbols text-sm text-rose-400">ink_eraser</span>
              <span>Gomma Intelligente</span>
            </span>
            <button type="button" class="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10" @click="openMenu = null">✕</button>
          </div>
          <div class="space-y-1.5">
            <button
              type="button"
              class="w-full py-1.5 px-2 rounded-lg text-left text-xs transition flex items-center space-x-2"
              :class="toolSettings.eraser.mode === 'stroke' ? 'bg-rose-600 text-white font-bold' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'"
              @click="toolSettings.eraser.mode = 'stroke'; saveSettings()"
            >
              <span class="material-symbols text-sm">gesture</span>
              <span>Tratto Intero (Stroke)</span>
            </button>
            <button
              type="button"
              class="w-full py-1.5 px-2 rounded-lg text-left text-xs transition flex items-center space-x-2"
              :class="toolSettings.eraser.mode === 'radius' ? 'bg-rose-600 text-white font-bold' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'"
              @click="toolSettings.eraser.mode = 'radius'; saveSettings()"
            >
              <span class="material-symbols text-sm">blur_on</span>
              <span>Raggio Libero (Pixel)</span>
            </button>
          </div>
          <div v-if="toolSettings.eraser.mode === 'radius'">
            <div class="flex justify-between text-gray-400 mb-1">
              <span>Raggio Gomma:</span>
              <span class="font-mono font-bold text-white">{{ toolSettings.eraser.radius }}px</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="2"
              v-model.number="toolSettings.eraser.radius"
              class="w-full accent-rose-500 cursor-pointer"
              @input="saveSettings"
            />
          </div>
          <button
            type="button"
            class="w-full py-1.5 bg-red-900/50 hover:bg-red-800 text-red-200 rounded-lg text-xs font-semibold"
            @click="$emit('clear-canvas'); openMenu = null"
          >
            Cancella Tutto il Disegno
          </button>
        </div>
      </div>

      <div class="w-6 h-px bg-gray-700/80 my-0.5"></div>

      <!-- 4. Casella Matematica (🧮) -->
      <button
        type="button"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        :class="activeTool === 'mathbox' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'hover:bg-white/10 text-gray-300'"
        @click="handleClick('mathbox')"
        title="Casella Matematica (Clic: seleziona, secondo Clic: aggiungi)"
      >
        <span class="material-symbols text-xl">calculate</span>
      </button>

      <!-- 5. Casella di Testo (📝) -->
      <button
        type="button"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        :class="activeTool === 'textbox' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'hover:bg-white/10 text-gray-300'"
        @click="handleClick('textbox')"
        title="Casella di Testo (Clic: seleziona, secondo Clic: aggiungi)"
      >
        <span class="material-symbols text-xl">title</span>
      </button>

      <!-- 6. Stile & Modello Foglio (🎨) - Solo su note/taccuini, rimosso su documenti di testo (EPUB/PDF/ecc.) -->
      <button
        v-if="showSheetStyle"
        type="button"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 text-amber-300 hover:text-amber-200"
        @click="$emit('open-sheet-style')"
        title="Stile & Modello Foglio (Pentagramma, Cornell, Sfondi)"
      >
        <span class="material-symbols text-xl">palette</span>
      </button>

      <!-- 6b. Gestione Pagine, Note & Documenti (📄) - Solo su taccuini / note studio -->
      <div v-if="isStandaloneNotebook" class="relative group">
        <button
          type="button"
          class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 text-blue-400 hover:text-blue-300"
          @click="openMenu = openMenu === 'pages' ? null : 'pages'"
          title="Gestione Pagine, Note & Documenti"
        >
          <span class="material-symbols text-xl">post_add</span>
        </button>

        <!-- Popover Menu Pagine & Note -->
        <div
          v-if="openMenu === 'pages'"
          class="absolute right-12 top-0 bg-gray-900/95 border border-gray-700 rounded-xl p-3 shadow-2xl w-56 text-xs text-white z-50 space-y-2 backdrop-blur-md"
          @click.stop
        >
          <div class="flex items-center justify-between pb-1 border-b border-gray-800">
            <span class="font-bold flex items-center space-x-1">
              <span class="material-symbols text-sm text-blue-400">note_add</span>
              <span>Pagine & Note</span>
            </span>
            <button type="button" class="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10" @click="openMenu = null">✕</button>
          </div>
          <div class="space-y-1">
            <button
              type="button"
              class="w-full py-2 px-2.5 rounded-lg text-left text-xs bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-200 transition flex items-center space-x-2 font-medium"
              @click="$emit('add-new-page'); openMenu = null"
            >
              <span class="material-symbols text-base text-blue-400">add_to_photos</span>
              <span>+ Nuova Pagina</span>
            </button>
            <button
              type="button"
              class="w-full py-2 px-2.5 rounded-lg text-left text-xs bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-200 transition flex items-center space-x-2 font-medium"
              @click="$emit('add-new-note'); openMenu = null"
            >
              <span class="material-symbols text-base text-emerald-400">note_add</span>
              <span>+ Nuova Nota</span>
            </button>
            <button
              type="button"
              class="w-full py-2 px-2.5 rounded-lg text-left text-xs bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-200 transition flex items-center space-x-2 font-medium"
              @click="$emit('add-new-document'); openMenu = null"
            >
              <span class="material-symbols text-base text-purple-400">upload_file</span>
              <span>+ Nuovo Documento</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 7. Memo Vocale (🎙️) -->
      <button
        type="button"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 text-red-400 hover:text-red-300"
        @click="handleClick('voice')"
        title="Inserisci Memo Vocale"
      >
        <span class="material-symbols text-xl">mic</span>
      </button>

      <!-- 8. Galaxy AI Assist (✨) -->
      <button
        type="button"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 text-purple-400 hover:text-purple-300"
        @click="$emit('open-ai-assist')"
        title="Galaxy AI Assist (Riassumi note, punti chiave)"
      >
        <span class="material-symbols text-xl animate-pulse">auto_awesome</span>
      </button>

      <div class="w-6 h-px bg-gray-700/80 my-0.5"></div>

      <!-- 9. Undo / Redo -->
      <div class="flex flex-col space-y-1">
        <button
          type="button"
          class="w-10 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-gray-300 disabled:opacity-30"
          :disabled="!canUndo"
          @click="$emit('undo')"
          title="Annulla (Ctrl+Z)"
        >
          <span class="material-symbols text-lg">undo</span>
        </button>
        <button
          type="button"
          class="w-10 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-gray-300 disabled:opacity-30"
          :disabled="!canRedo"
          @click="$emit('redo')"
          title="Ripristina (Ctrl+Y)"
        >
          <span class="material-symbols text-lg">redo</span>
        </button>
      </div>

      <!-- 10. Toggle Visibilità Layer Note -->
      <button
        type="button"
        class="w-10 h-8 rounded-lg flex items-center justify-center transition-all"
        :class="notesVisible ? 'text-gray-400 hover:text-white' : 'bg-red-500/20 text-red-400'"
        @click="$emit('toggle-visibility')"
        :title="notesVisible ? 'Nascondi annotazioni' : 'Mostra annotazioni'"
      >
        <span class="material-symbols text-lg">{{ notesVisible ? 'visibility' : 'visibility_off' }}</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    activeTool: {
      type: String,
      default: 'pen'
    },
    toolSettings: {
      type: Object,
      required: true
    },
    canUndo: Boolean,
    canRedo: Boolean,
    notesVisible: {
      type: Boolean,
      default: true
    },
    showSheetStyle: {
      type: Boolean,
      default: true
    },
    isStandaloneNotebook: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      openMenu: null,
      penColors: [
        '#3b82f6', // Blu
        '#ef4444', // Rosso
        '#10b981', // Verde
        '#f59e0b', // Arancione
        '#8b5cf6', // Viola
        '#000000', // Nero
        '#ffffff', // Bianco
        '#64748b', // Grigio Ardesia
        '#ec4899', // Rosa
        '#06b6d4'  // Ciano
      ],
      highlighterColors: [
        '#facc15', // Giallo
        '#4ade80', // Verde fluo
        '#38bdf8', // Celeste
        '#f472b6', // Fucsia
        '#fb923c'  // Arancione chiaro
      ]
    }
  },
  methods: {
    handleClick(tool) {
      if (this.activeTool === tool) {
        // Se lo strumento è già attivo, un secondo clic apre o chiude il menu delle opzioni
        if (['pen', 'highlighter', 'eraser'].includes(tool)) {
          this.openMenu = this.openMenu === tool ? null : tool
        } else if (tool === 'mathbox') {
          this.$emit('add-mathbox')
        } else if (tool === 'textbox') {
          this.$emit('add-textbox')
        } else if (tool === 'voice') {
          this.$emit('add-voice')
        }
      } else {
        // Primo clic: attiva lo strumento e chiude i menu aperti
        this.openMenu = null
        this.$emit('select-tool', tool)
        if (tool === 'mathbox') {
          this.$emit('add-mathbox')
        } else if (tool === 'textbox') {
          this.$emit('add-textbox')
        } else if (tool === 'voice') {
          this.$emit('add-voice')
        }
      }
    },
    saveSettings() {
      this.$emit('update-settings', this.toolSettings)
    }
  }
}
</script>

<style scoped>
.text-xxs {
  font-size: 0.65rem;
}
</style>
