<template>
  <div class="notes-collections-view w-full h-full overflow-y-auto p-4 sm:p-8 select-none text-white">
    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold flex items-center space-x-2">
          <span class="material-symbols text-2xl sm:text-3xl text-blue-400">edit_note</span>
          <span>Le Mie Note & Taccuini</span>
        </h1>
        <p class="text-xs text-gray-400 mt-1">Organizza i tuoi appunti personali in cartelle e sottocartelle private.</p>
      </div>

      <!-- Action Buttons & Search -->
      <div class="flex items-center space-x-2.5">
        <!-- Search bar -->
        <div class="relative w-48 sm:w-60">
          <span class="material-symbols text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">search</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cerca nelle note..."
            class="w-full bg-gray-900 border border-gray-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
          />
          <button v-if="searchQuery" type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" @click="searchQuery = ''">✕</button>
        </div>

        <!-- Sincronizza con NAS Button -->
        <button
          type="button"
          class="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-200 hover:text-white font-semibold text-xs flex items-center space-x-1.5 transition border border-gray-700 shadow"
          :class="{ 'opacity-60 pointer-events-none': isSyncing }"
          @click="triggerSync"
          title="Sincronizza note con il server NAS"
        >
          <span class="material-symbols text-base text-blue-400" :class="{ 'animate-spin': isSyncing }">sync</span>
          <span class="hidden md:inline">{{ isSyncing ? 'Sincronizzazione...' : 'Sincronizza NAS' }}</span>
        </button>

        <!-- + Nuova Cartella Button -->
        <button
          type="button"
          class="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-200 hover:text-white font-semibold text-xs flex items-center space-x-1.5 transition border border-gray-700 shadow"
          @click="openNewFolderModal"
          title="Crea nuova cartella o sottocartella"
        >
          <span class="material-symbols text-base text-amber-400">create_new_folder</span>
          <span class="hidden sm:inline">+ Nuova Cartella</span>
        </button>

        <!-- + Nuova Nota Button -->
        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-lg shadow-blue-600/30"
          @click="openCreateNoteModal"
          title="Crea una nuova nota"
        >
          <span class="material-symbols text-base">note_add</span>
          <span>+ Nuova Nota</span>
        </button>
      </div>
    </div>

    <!-- Breadcrumb Navigation -->
    <div class="flex items-center space-x-1.5 py-4 text-xs overflow-x-auto text-gray-400 border-b border-gray-800/60 mb-6">
      <button
        type="button"
        class="flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-white/10 transition"
        :class="currentFolderId === null ? 'text-blue-400 font-bold bg-blue-600/10' : 'text-gray-300'"
        @click="navigateToFolder(null)"
      >
        <span class="material-symbols text-sm">home_storage</span>
        <span>Note Principali</span>
      </button>

      <template v-for="(crumb, idx) in breadcrumbs">
        <span :key="'sep_' + crumb.id" class="text-gray-600">/</span>
        <button
          :key="crumb.id"
          type="button"
          class="flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-white/10 transition truncate max-w-xs"
          :class="idx === breadcrumbs.length - 1 ? 'text-blue-400 font-bold bg-blue-600/10' : 'text-gray-300'"
          @click="navigateToFolder(crumb.id)"
        >
          <span class="material-symbols text-sm text-amber-400">folder</span>
          <span>{{ crumb.name }}</span>
        </button>
      </template>
    </div>

    <!-- SOTTO-CARTELLE (Se presenti nella cartella corrente) -->
    <div v-if="subFolders.length > 0 && !searchQuery" class="mb-8">
      <h2 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
        <span class="material-symbols text-sm text-amber-400">folder_open</span>
        <span>Cartelle & Sottocartelle ({{ subFolders.length }})</span>
      </h2>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div
          v-for="folder in subFolders"
          :key="folder.id"
          class="group bg-gray-900/80 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-0.5"
          @click="navigateToFolder(folder.id)"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <span class="material-symbols text-xl">folder</span>
            </div>
            <!-- Menu Opzioni Cartella -->
            <div class="relative" @click.stop>
              <button
                type="button"
                class="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition opacity-0 group-hover:opacity-100"
                @click="openFolderMenu = openFolderMenu === folder.id ? null : folder.id"
              >
                <span class="material-symbols text-sm">more_vert</span>
              </button>
              <div
                v-if="openFolderMenu === folder.id"
                class="absolute right-0 top-7 w-36 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 z-30 text-xs text-white"
              >
                <button
                  type="button"
                  class="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center space-x-2"
                  @click="promptRenameFolder(folder); openFolderMenu = null"
                >
                  <span class="material-symbols text-sm text-blue-400">edit</span>
                  <span>Rinomina</span>
                </button>
                <button
                  type="button"
                  class="w-full px-3 py-1.5 text-left hover:bg-red-600/20 text-red-400 hover:text-red-300 flex items-center space-x-2"
                  @click="deleteFolder(folder); openFolderMenu = null"
                >
                  <span class="material-symbols text-sm">delete</span>
                  <span>Elimina</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 class="font-bold text-sm text-white group-hover:text-amber-300 transition truncate">{{ folder.name }}</h3>
            <p class="text-xxs text-gray-400 mt-0.5">{{ countNotesInFolder(folder.id) }} note</p>
          </div>
        </div>
      </div>
    </div>

    <!-- NOTE NELLA CARTELLA CORRENTE -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
          <span class="material-symbols text-sm text-blue-400">description</span>
          <span>Note & Taccuini ({{ displayedNotes.length }})</span>
        </h2>
      </div>

      <!-- Grid Note -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <!-- Action Card: + Nuova Nota -->
        <button
          v-if="!searchQuery"
          type="button"
          class="h-44 rounded-2xl border-2 border-dashed border-gray-700 hover:border-blue-500 bg-gray-900/40 hover:bg-blue-600/10 transition-all flex flex-col items-center justify-center p-4 text-center group cursor-pointer"
          @click="openCreateNoteModal"
        >
          <div class="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform mb-2">
            <span class="material-symbols text-2xl">add</span>
          </div>
          <span class="font-bold text-sm text-white group-hover:text-blue-300 transition">Nuova Nota</span>
          <span class="text-xxs text-gray-400 mt-0.5">Disegno, formule, testo</span>
        </button>

        <!-- Schede Note -->
        <div
          v-for="note in displayedNotes"
          :key="note.id"
          class="h-44 rounded-2xl bg-gray-900 border border-gray-800 hover:border-blue-500/60 p-4 flex flex-col justify-between transition-all group hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden cursor-pointer"
          :style="getNoteCardBackground(note)"
          @click="openNotebook(note)"
        >
          <!-- Top info & actions -->
          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-1.5">
              <span class="material-symbols text-base text-blue-400">edit_note</span>
              <span class="px-2 py-0.5 rounded-full text-xxs font-medium bg-black/40 border border-white/10 text-gray-300">
                {{ getTemplateLabel(note.sheetStyle?.template) }}
              </span>
            </div>

            <!-- Note Menu (⋮) -->
            <div class="relative" @click.stop>
              <button
                type="button"
                class="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition opacity-0 group-hover:opacity-100"
                @click="openNoteMenu = openNoteMenu === note.id ? null : note.id"
              >
                <span class="material-symbols text-sm">more_vert</span>
              </button>
              <div
                v-if="openNoteMenu === note.id"
                class="absolute right-0 top-7 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 z-30 text-xs text-white"
              >
                <button
                  type="button"
                  class="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center space-x-2"
                  @click="openNotebook(note); openNoteMenu = null"
                >
                  <span class="material-symbols text-sm text-emerald-400">open_in_new</span>
                  <span>Apri Studio Note</span>
                </button>
                <button
                  type="button"
                  class="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center space-x-2"
                  @click="promptRenameNote(note); openNoteMenu = null"
                >
                  <span class="material-symbols text-sm text-blue-400">edit</span>
                  <span>Rinomina</span>
                </button>
                <button
                  type="button"
                  class="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center space-x-2"
                  @click="promptMoveNote(note); openNoteMenu = null"
                >
                  <span class="material-symbols text-sm text-amber-400">drive_file_move</span>
                  <span>Sposta in cartella</span>
                </button>
                <button
                  type="button"
                  class="w-full px-3 py-1.5 text-left hover:bg-red-600/20 text-red-400 hover:text-red-300 flex items-center space-x-2"
                  @click="deleteNote(note); openNoteMenu = null"
                >
                  <span class="material-symbols text-sm">delete</span>
                  <span>Elimina</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Title & folder info -->
          <div>
            <h3 class="font-bold text-base text-white group-hover:text-blue-300 transition line-clamp-2 leading-tight">
              {{ note.title || 'Nuova Nota' }}
            </h3>
            <p v-if="searchQuery && note.folderId" class="text-xxs text-amber-400/80 mt-1 flex items-center space-x-1">
              <span class="material-symbols text-xxs">folder</span>
              <span>{{ getFolderName(note.folderId) }}</span>
            </p>
          </div>

          <!-- Bottom timestamp -->
          <div class="pt-2 border-t border-white/5 flex items-center justify-between text-xxs text-gray-400">
            <span>{{ formatDate(note.updatedAt || note.createdAt) }}</span>
            <span class="material-symbols text-sm text-gray-500 group-hover:text-blue-400 transition">arrow_forward</span>
          </div>
        </div>
      </div>

      <!-- Nessuna nota trovata -->
      <div v-if="displayedNotes.length === 0 && searchQuery" class="py-16 text-center text-gray-400">
        <span class="material-symbols text-4xl text-gray-600 mb-2">search_off</span>
        <p class="text-sm font-semibold">Nessuna nota trovata per "{{ searchQuery }}"</p>
      </div>
    </div>

    <!-- Modale Crea Nota -->
    <create-note-modal
      v-model="showCreateNoteModal"
      :default-folder-id="currentFolderId"
      @created="onNoteCreated"
    />

    <!-- Modale Crea / Rinomina Cartella -->
    <div v-if="showFolderModal" class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" @click.self="showFolderModal = false">
      <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-5 text-white animate-scale-up">
        <div class="flex items-center space-x-2 mb-4">
          <span class="material-symbols text-2xl text-amber-400">folder</span>
          <h3 class="font-bold text-base">{{ editingFolder ? 'Rinomina Cartella' : 'Nuova Cartella / Sottocartella' }}</h3>
        </div>
        <input
          ref="folderInput"
          v-model="folderNameInput"
          type="text"
          placeholder="Nome cartella..."
          class="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition text-sm mb-4"
          @keydown.enter="saveFolderModal"
        />
        <div class="flex justify-end space-x-2 text-xs">
          <button type="button" class="px-3.5 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition" @click="showFolderModal = false">Annulla</button>
          <button type="button" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 font-bold transition shadow" @click="saveFolderModal">
            {{ editingFolder ? 'Salva' : 'Crea Cartella' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modale Sposta Nota in Cartella -->
    <div v-if="movingNote" class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" @click.self="movingNote = null">
      <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-5 text-white animate-scale-up">
        <div class="flex items-center space-x-2 mb-3">
          <span class="material-symbols text-2xl text-blue-400">drive_file_move</span>
          <h3 class="font-bold text-base">Sposta Nota</h3>
        </div>
        <p class="text-xs text-gray-400 mb-3">Seleziona la cartella di destinazione per "{{ movingNote.title }}":</p>
        <select
          v-model="targetFolderId"
          class="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm mb-4 cursor-pointer"
        >
          <option :value="null">📁 Cartella Principale (Root)</option>
          <option v-for="f in allFolderOptions" :key="f.id" :value="f.id">{{ f.fullPath }}</option>
        </select>
        <div class="flex justify-end space-x-2 text-xs">
          <button type="button" class="px-3.5 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition" @click="movingNote = null">Annulla</button>
          <button type="button" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow" @click="confirmMoveNote">Sposta</button>
        </div>
      </div>
    </div>

    <!-- Fullscreen Standalone Note Studio Viewer/Editor Modal -->
    <note-studio-notebook-modal
      v-model="showNotebookModal"
      :notebook="activeNotebook"
      @updated="loadAllData"
      @closed="loadAllData"
      @note-created="handleNoteCreated"
    />
  </div>
</template>

<script>
import CreateNoteModal from './CreateNoteModal.vue'
import NoteStudioNotebookModal from './NoteStudioNotebookModal.vue'
import { noteStorage } from '@/services/noteStorage'

export default {
  components: {
    CreateNoteModal,
    NoteStudioNotebookModal
  },
  data() {
    return {
      currentFolderId: null,
      notes: [],
      folders: [],
      searchQuery: '',
      isSyncing: false,
      showCreateNoteModal: false,
      showNotebookModal: false,
      activeNotebook: null,
      openFolderMenu: null,
      openNoteMenu: null,
      showFolderModal: false,
      editingFolder: null,
      folderNameInput: '',
      movingNote: null,
      targetFolderId: null
    }
  },
  computed: {
    userId() {
      return this.$store.state.user.user?.id || 'default_user'
    },
    subFolders() {
      return this.folders.filter((f) => f.parentId === this.currentFolderId)
    },
    breadcrumbs() {
      if (!this.currentFolderId) return []
      const crumbs = []
      let curr = this.folders.find((f) => f.id === this.currentFolderId)
      while (curr) {
        crumbs.unshift(curr)
        curr = curr.parentId ? this.folders.find((f) => f.id === curr.parentId) : null
      }
      return crumbs
    },
    displayedNotes() {
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase()
        return this.notes.filter((n) => (n.title || '').toLowerCase().includes(q))
      }
      return this.notes.filter((n) => n.folderId === this.currentFolderId)
    },
    allFolderOptions() {
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
    }
  },
  mounted() {
    this.loadAllData(true)
    this.$eventBus?.$on('notes-synced', () => this.loadAllData(false))
  },
  beforeDestroy() {
    this.$eventBus?.$off('notes-synced', () => this.loadAllData(false))
  },
  methods: {
    async loadAllData(andSync = false) {
      this.notes = await noteStorage.getUserNotebooks(this.userId)
      this.folders = await noteStorage.getUserFolders(this.userId)
      if (andSync) {
        this.triggerSync(false)
      }
    },
    async triggerSync(showToast = true) {
      if (this.isSyncing) return
      this.isSyncing = true
      try {
        const client = this.$nativeHttp || this.$axios
        const res = await noteStorage.syncWithServer(this.userId, client)
        if (res && res.success) {
          this.notes = await noteStorage.getUserNotebooks(this.userId)
          this.folders = await noteStorage.getUserFolders(this.userId)
          if (showToast) this.$toast.success('Note sincronizzate con il NAS')
        } else if (res && res.offline) {
          if (showToast) this.$toast.info('Modalità offline attiva: le note verranno sincronizzate appena connesso')
        }
      } catch (err) {
        console.warn('Errore sync:', err)
      } finally {
        this.isSyncing = false
      }
    },
    navigateToFolder(folderId) {
      this.currentFolderId = folderId
      this.openFolderMenu = null
      this.openNoteMenu = null
    },
    openCreateNoteModal() {
      this.showCreateNoteModal = true
    },
    onNoteCreated(newNote) {
      this.loadAllData()
      this.triggerSync(false)
      this.openNotebook(newNote)
    },
    openNotebook(note) {
      this.activeNotebook = note
      this.showNotebookModal = true
    },
    openNewFolderModal() {
      this.editingFolder = null
      this.folderNameInput = ''
      this.showFolderModal = true
      this.$nextTick(() => {
        this.$refs.folderInput?.focus()
      })
    },
    promptRenameFolder(folder) {
      this.editingFolder = folder
      this.folderNameInput = folder.name
      this.showFolderModal = true
      this.$nextTick(() => {
        this.$refs.folderInput?.focus()
      })
    },
    async saveFolderModal() {
      const name = this.folderNameInput.trim()
      if (!name) return

      if (this.editingFolder) {
        await noteStorage.updateFolder(this.userId, this.editingFolder.id, { name })
        this.$toast.success('Cartella rinominata')
      } else {
        await noteStorage.createFolder(this.userId, name, this.currentFolderId)
        this.$toast.success('Cartella creata')
      }
      this.showFolderModal = false
      await this.loadAllData()
      this.triggerSync(false)
    },
    async deleteFolder(folder) {
      if (confirm(`Sei sicuro di voler eliminare la cartella "${folder.name}"? Le note contenute non verranno eliminate.`)) {
        await noteStorage.deleteFolder(this.userId, folder.id)
        this.$toast.success('Cartella eliminata')
        await this.loadAllData()
        this.triggerSync(false)
      }
    },
    promptRenameNote(note) {
      const newTitle = prompt('Modifica titolo nota:', note.title)
      if (newTitle && newTitle.trim()) {
        noteStorage.updateNotebook(this.userId, note.id, { title: newTitle.trim() }).then(async () => {
          this.$toast.success('Titolo aggiornato')
          await this.loadAllData()
          this.triggerSync(false)
        })
      }
    },
    promptMoveNote(note) {
      this.movingNote = note
      this.targetFolderId = note.folderId
    },
    async confirmMoveNote() {
      if (!this.movingNote) return
      await noteStorage.updateNotebook(this.userId, this.movingNote.id, { folderId: this.targetFolderId })
      this.$toast.success('Nota spostata')
      this.movingNote = null
      await this.loadAllData()
      this.triggerSync(false)
    },
    async deleteNote(note) {
      if (confirm(`Sei sicuro di voler eliminare la nota "${note.title}"?`)) {
        await noteStorage.deleteNotebook(this.userId, note.id)
        this.$toast.success('Nota eliminata')
        await this.loadAllData()
        this.triggerSync(false)
      }
    },
    countNotesInFolder(folderId) {
      return this.notes.filter((n) => n.folderId === folderId).length
    },
    getFolderName(folderId) {
      const fld = this.folders.find((f) => f.id === folderId)
      return fld ? fld.name : ''
    },
    getTemplateLabel(tpl) {
      const map = {
        blank: 'Foglio Bianco',
        ruled: 'Righe',
        ruled_narrow: 'Righe Strette',
        grid: 'Quadretti',
        music: 'Pentagramma',
        cornell: 'Cornell',
        millimeter: 'Millimetrata',
        dot: 'Puntinato'
      }
      return map[tpl] || 'Foglio'
    },
    getNoteCardBackground(note) {
      const bg = note.sheetStyle?.background
      if (bg === 'dark') {
        return { backgroundColor: '#111827' }
      } else if (bg === 'sepia') {
        return { backgroundColor: '#2d2218' }
      }
      return { backgroundColor: '#1e293b' }
    },
    formatDate(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    },
    async handleNoteCreated(newNote) {
      await this.loadAllData()
      this.triggerSync(false)
      if (newNote) {
        this.activeNotebook = newNote
        this.showNotebookModal = true
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
    transform: scale(0.95);
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
