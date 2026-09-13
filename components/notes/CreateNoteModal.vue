<template>
  <div
    v-if="value"
    class="fixed inset-0 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none"
    style="position: fixed !important; inset: 0 !important; z-index: 999999 !important; pointer-events: auto !important; touch-action: none !important;"
    @touchmove.stop
    @click.self="close"
  >
    <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-white animate-scale-up flex flex-col max-h-[92vh]">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/60">
        <div class="flex items-center space-x-2.5">
          <span class="material-symbols text-2xl text-blue-400">note_add</span>
          <div>
            <h2 class="text-base sm:text-lg font-bold">Crea Nuova Nota</h2>
            <p class="text-xxs text-gray-400">Scegli nome, cartella, modello e colore con anteprima in tempo reale</p>
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

      <!-- Body -->
      <div class="p-6 overflow-y-auto space-y-5 text-sm">
        <!-- Riquadro Anteprima Dinamica del Foglio -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-semibold text-gray-300">Anteprima Foglio in Tempo Reale:</label>
            <span class="text-xxs text-blue-400 font-medium flex items-center space-x-1">
              <span class="material-symbols text-xs">visibility</span>
              <span>{{ previewTemplateName }} • {{ previewBgName }}</span>
            </span>
          </div>

          <div class="relative w-full h-36 rounded-xl overflow-hidden border border-gray-700 shadow-lg flex flex-col justify-between p-3 transition-all duration-300">
            <!-- Sheet Background Render -->
            <sheet-background
              :style-config="previewStyleConfig"
              :is-overlay-transparent="false"
            />

            <!-- Preview Header simulation -->
            <div
              class="relative z-10 flex items-center justify-between px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm transition-colors"
              :class="isDarkPreview ? 'bg-white/10 text-white border border-white/10' : 'bg-black/10 text-gray-900 border border-black/10'"
            >
              <div class="flex items-center space-x-2 truncate">
                <span class="material-symbols text-sm text-blue-400">edit_note</span>
                <span class="text-xs font-bold truncate">{{ title || 'Nuova Nota' }}</span>
              </div>
              <span class="text-xxs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
                {{ previewTemplateName }}
              </span>
            </div>

            <!-- Preview Footer simulation -->
            <div
              class="relative z-10 flex items-center justify-between text-xxs px-2 opacity-75 font-mono"
              :class="isDarkPreview ? 'text-gray-300' : 'text-gray-700'"
            >
              <span>LibrieNote Studio</span>
              <span>Pagina 1 di 1</span>
            </div>
          </div>
        </div>

        <!-- Titolo Nota con Nome Automatico -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-semibold text-gray-300">Titolo Nota / Taccuino:</label>
            <button
              type="button"
              class="text-xxs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1"
              @click="generateAutoTitle"
            >
              <span class="material-symbols text-xs">refresh</span>
              <span>Rigenera nome auto</span>
            </button>
          </div>
          <input
            ref="titleInput"
            v-model="title"
            type="text"
            placeholder="es. Nota 1, Appunti di Studio, Lezione di Matematica..."
            class="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-medium"
            @keydown.enter="create"
          />
        </div>

        <!-- Cartella di Destinazione + Inline Cartella Creator -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-semibold text-gray-300">Cartella di Destinazione:</label>
            <button
              type="button"
              class="text-xxs text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
              @click="showInlineFolderCreator = !showInlineFolderCreator"
            >
              <span class="material-symbols text-xs">{{ showInlineFolderCreator ? 'close' : 'create_new_folder' }}</span>
              <span>{{ showInlineFolderCreator ? 'Chiudi' : '+ Nuova Cartella' }}</span>
            </button>
          </div>

          <!-- Inline Folder Creation Accordion -->
          <div
            v-if="showInlineFolderCreator"
            class="mb-3 p-3 bg-gray-950/80 border border-amber-500/40 rounded-xl space-y-2.5 animate-scale-up"
          >
            <div class="flex items-center space-x-1 text-xs text-amber-400 font-semibold">
              <span class="material-symbols text-sm">folder_open</span>
              <span>Crea e seleziona nuova cartella</span>
            </div>
            <div class="flex flex-col sm:flex-row gap-2">
              <input
                ref="newFolderInput"
                v-model="newFolderName"
                type="text"
                placeholder="Nome nuova cartella..."
                class="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                @keydown.enter="createInlineFolder"
              />
              <button
                type="button"
                class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-lg text-xs transition flex items-center justify-center space-x-1"
                @click="createInlineFolder"
              >
                <span class="material-symbols text-xs font-bold">add</span>
                <span>Crea ed Usa</span>
              </button>
            </div>
          </div>

          <!-- Dropdown Selezione Cartella -->
          <select
            v-model="selectedFolderId"
            class="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option :value="null">📁 Cartella Principale (Nessuna cartella)</option>
            <option v-for="f in folderOptions" :key="f.id" :value="f.id">
              {{ f.fullPath }}
            </option>
          </select>
        </div>

        <!-- Modello di Foglio Iniziale -->
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-2">Modello Iniziale di Foglio:</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              v-for="tpl in templates"
              :key="tpl.id"
              type="button"
              class="p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition text-center"
              :class="selectedTemplate === tpl.id ? 'border-blue-500 bg-blue-600/20 text-blue-300 font-bold ring-1 ring-blue-500/40 shadow' : 'border-gray-800 bg-gray-950/60 text-gray-400 hover:border-gray-700 hover:text-gray-200'"
              @click="selectedTemplate = tpl.id"
            >
              <span class="material-symbols text-xl">{{ tpl.icon }}</span>
              <span class="text-xxs leading-tight">{{ tpl.name }}</span>
            </button>
          </div>
        </div>

        <!-- Tonalità di Sfondo con Colore Custom -->
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-2">Colore di Sfondo:</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="bg in backgrounds"
              :key="bg.id"
              type="button"
              class="py-2 px-2 rounded-xl border text-xs font-medium transition flex flex-col items-center justify-center space-y-1"
              :class="selectedBg === bg.id ? 'border-blue-500 bg-white/10 ring-2 ring-blue-500/40 font-bold shadow' : 'border-gray-800 hover:border-gray-700 bg-gray-950/40'"
              @click="selectedBg = bg.id"
            >
              <span class="w-6 h-6 rounded-full border border-gray-600 shadow-sm" :style="{ backgroundColor: bg.color }" />
              <span class="text-xxs">{{ bg.name }}</span>
            </button>

            <!-- Custom Color Picker -->
            <button
              type="button"
              class="py-2 px-2 rounded-xl border text-xs font-medium transition flex flex-col items-center justify-center space-y-1 relative cursor-pointer"
              :class="selectedBg === 'custom' ? 'border-blue-500 bg-white/10 ring-2 ring-blue-500/40 font-bold shadow' : 'border-gray-800 hover:border-gray-700 bg-gray-950/40'"
              @click="selectedBg = 'custom'"
            >
              <span class="w-6 h-6 rounded-full border border-gray-600 shadow-sm flex items-center justify-center overflow-hidden" :style="{ backgroundColor: customBgColor }">
                <input
                  type="color"
                  v-model="customBgColor"
                  class="opacity-0 w-full h-full cursor-pointer"
                  @input="selectedBg = 'custom'"
                />
              </span>
              <span class="text-xxs">🎨 Custom</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-gray-950/60 border-t border-gray-800 flex items-center justify-end space-x-3">
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition text-xs font-semibold"
          @click="close"
        >
          Annulla
        </button>
        <button
          type="button"
          class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold transition shadow-lg shadow-blue-600/30 text-xs sm:text-sm flex items-center space-x-1.5"
          @click="create"
        >
          <span class="material-symbols text-base font-bold">edit_note</span>
          <span>Crea & Apri Nota</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import SheetBackground from './SheetBackground.vue'
import { noteStorage } from '@/services/noteStorage'

export default {
  components: {
    SheetBackground
  },
  props: {
    value: Boolean,
    defaultFolderId: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      title: '',
      selectedFolderId: this.defaultFolderId,
      selectedTemplate: 'blank',
      selectedBg: 'white',
      customBgColor: '#1e293b',
      folders: [],
      showInlineFolderCreator: false,
      newFolderName: '',
      templates: [
        { id: 'blank', name: 'Bianco', icon: 'crop_portrait' },
        { id: 'ruled', name: 'Righe Standard', icon: 'format_align_left' },
        { id: 'ruled_narrow', name: 'Righe Strette', icon: 'density_small' },
        { id: 'grid', name: 'Quadretti 5mm', icon: 'grid_4x4' },
        { id: 'millimeter', name: 'Millimetrata', icon: 'border_inner' },
        { id: 'dot', name: 'Puntinato', icon: 'grain' },
        { id: 'music', name: 'Pentagramma', icon: 'queue_music' },
        { id: 'cornell', name: 'Cornell', icon: 'view_quilt' }
      ],
      backgrounds: [
        { id: 'white', name: '⚪ Bianco', color: '#ffffff' },
        { id: 'dark', name: '🌑 Notte', color: '#18191c' },
        { id: 'sepia', name: '📜 Seppia', color: '#fbf0d9' }
      ]
    }
  },
  computed: {
    userId() {
      return this.$store.state.user.user?.id || 'default_user'
    },
    folderOptions() {
      const buildPath = (folder) => {
        let path = folder.name
        let current = folder
        while (current.parentId) {
          const parent = this.folders.find((f) => f.id === current.parentId)
          if (parent) {
            path = parent.name + ' / ' + path
            current = parent
          } else {
            break
          }
        }
        return '📁 ' + path
      }

      return this.folders.map((f) => ({
        id: f.id,
        name: f.name,
        fullPath: buildPath(f)
      }))
    },
    previewStyleConfig() {
      return {
        background: this.selectedBg,
        customColor: this.customBgColor,
        template: this.selectedTemplate,
        pattern: 'none'
      }
    },
    previewTemplateName() {
      const t = this.templates.find((tpl) => tpl.id === this.selectedTemplate)
      return t ? t.name : 'Bianco'
    },
    previewBgName() {
      if (this.selectedBg === 'custom') return 'Personalizzato'
      const b = this.backgrounds.find((bg) => bg.id === this.selectedBg)
      return b ? b.name : 'Bianco'
    },
    isDarkPreview() {
      if (this.selectedBg === 'dark') return true
      if (this.selectedBg === 'sepia' || this.selectedBg === 'white') return false
      const hex = (this.customBgColor || '#ffffff').replace('#', '')
      if (hex.length === 6) {
        const r = parseInt(hex.substr(0, 2), 16)
        const g = parseInt(hex.substr(2, 2), 16)
        const b = parseInt(hex.substr(4, 2), 16)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return luminance < 0.5
      }
      return false
    }
  },
  watch: {
    value(val) {
      if (val) {
        this.selectedFolderId = this.defaultFolderId
        this.showInlineFolderCreator = false
        this.newFolderName = ''
        this.initAutoTitleAndFolders()
      }
    },
    defaultFolderId(val) {
      this.selectedFolderId = val
    }
  },
  methods: {
    async initAutoTitleAndFolders() {
      await this.loadFolders()
      await this.generateAutoTitle()
      this.$nextTick(() => {
        if (this.$refs.titleInput) {
          this.$refs.titleInput.focus()
          this.$refs.titleInput.select()
        }
      })
    },
    async generateAutoTitle() {
      const existing = await noteStorage.getUserNotebooks(this.userId)
      const count = existing.length + 1
      this.title = `Nota ${count}`
    },
    async loadFolders() {
      this.folders = await noteStorage.getUserFolders(this.userId)
    },
    async createInlineFolder() {
      if (!this.newFolderName || !this.newFolderName.trim()) {
        this.$toast?.error('Inserisci un nome per la cartella')
        return
      }
      const folder = await noteStorage.createFolder(this.userId, this.newFolderName.trim(), this.selectedFolderId)
      if (folder) {
        await this.loadFolders()
        this.selectedFolderId = folder.id
        this.newFolderName = ''
        this.showInlineFolderCreator = false
        this.$toast?.success(`Cartella "${folder.name}" creata e selezionata!`)
      }
    },
    close() {
      this.$emit('input', false)
    },
    async create() {
      const finalTitle = this.title.trim() || `Nota ${Date.now()}`
      const sheetStyle = {
        background: this.selectedBg,
        template: this.selectedTemplate,
        pattern: 'none',
        customColor: this.customBgColor || '#ffffff',
        applyToAll: false
      }

      const note = await noteStorage.createNotebook(this.userId, {
        title: finalTitle,
        folderId: this.selectedFolderId,
        sheetStyle
      })

      if (note) {
        this.$toast?.success('Nota creata con successo!')
        const client = this.$nativeHttp || this.$axios
        if (client && this.userId) {
          noteStorage.syncWithServer(this.userId, client)
        }
        this.$emit('created', note)
        this.close()
      } else {
        this.$toast?.error('Impossibile creare la nota')
      }
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

