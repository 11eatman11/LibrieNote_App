<template>
  <div v-if="value && notebook" class="note-studio-modal fixed inset-0 z-60 bg-gray-950 flex flex-col select-none">
    <!-- Top Navigation & Title Bar -->
    <div class="h-14 bg-gray-900/95 border-b border-gray-800 px-3 sm:px-4 flex items-center justify-between z-50 backdrop-blur-md">
      <!-- Left: Back Button & Editable Title -->
      <div class="flex items-center space-x-2 sm:space-x-3">
        <button
          type="button"
          class="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition flex items-center space-x-1"
          @click="close"
          title="Chiudi e torna alle note"
        >
          <span class="material-symbols text-xl">arrow_back</span>
          <span class="text-xs font-semibold hidden md:inline">Torna alle Note</span>
        </button>

        <div class="h-5 w-px bg-gray-700 hidden sm:block"></div>

        <!-- Editable Title -->
        <div class="flex items-center space-x-1.5">
          <div v-if="!isEditingTitle" class="flex items-center space-x-1.5 cursor-pointer group" @click="startEditTitle">
            <h1 class="text-sm sm:text-base md:text-lg font-bold text-white group-hover:text-blue-400 transition truncate max-w-[140px] sm:max-w-xs md:max-w-sm">
              {{ notebook.title || 'Nuova Nota' }}
            </h1>
            <span class="material-symbols text-xs sm:text-sm text-gray-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition">edit</span>
          </div>
          <div v-else class="flex items-center space-x-1">
            <input
              ref="titleInput"
              v-model="tempTitle"
              type="text"
              class="bg-gray-950 border border-blue-500 rounded-lg px-2 py-1 text-xs sm:text-sm font-bold text-white outline-none"
              @keydown.enter="saveTitle"
              @keydown.esc="isEditingTitle = false"
              @blur="saveTitle"
            />
            <button type="button" class="p-1 rounded bg-blue-600 text-white hover:bg-blue-500" @click="saveTitle">
              <span class="material-symbols text-xs">check</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Center: Multi-Page Navigator & Actions -->
      <div class="flex items-center space-x-1.5 sm:space-x-2">
        <!-- Page Flip Controls -->
        <div class="flex items-center bg-gray-950/80 border border-gray-800 rounded-xl p-0.5 text-xs text-gray-300">
          <button
            type="button"
            class="p-1.5 rounded-lg hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition"
            :disabled="currentPage <= 1"
            @click="prevPage"
            title="Pagina precedente"
          >
            <span class="material-symbols text-base">chevron_left</span>
          </button>
          <span class="px-2 font-mono font-bold text-xs text-blue-400 whitespace-nowrap">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            type="button"
            class="p-1.5 rounded-lg hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition"
            :disabled="currentPage >= totalPages"
            @click="nextPage"
            title="Pagina successiva"
          >
            <span class="material-symbols text-base">chevron_right</span>
          </button>
        </div>

        <!-- + Nuova Pagina Button -->
        <button
          type="button"
          class="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold flex items-center space-x-1 transition"
          @click="addNewPage"
          title="Aggiungi una nuova pagina a questa nota"
        >
          <span class="material-symbols text-base">add_to_photos</span>
          <span class="hidden sm:inline">+ Nuova Pagina</span>
        </button>

        <!-- + Nuova Nota Button -->
        <button
          type="button"
          class="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-semibold flex items-center space-x-1 transition"
          @click="openNewNoteModal"
          title="Crea un'altra nota o taccuino"
        >
          <span class="material-symbols text-base text-emerald-400">note_add</span>
          <span class="hidden md:inline">+ Nuova Nota</span>
        </button>
      </div>

      <!-- Right: Status, Page Info & Close -->
      <div class="flex items-center space-x-2 sm:space-x-3">
        <div class="hidden lg:flex items-center space-x-1.5 text-xs text-gray-400 bg-gray-950/80 px-2.5 py-1 rounded-lg border border-gray-800">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Salvataggio Automatico</span>
        </div>

        <button
          type="button"
          class="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
          @click="close"
          title="Chiudi"
        >
          <span class="material-symbols text-xl">close</span>
        </button>
      </div>
    </div>

    <!-- Main Canvas / Note Studio Area -->
    <div class="relative flex-1 w-full h-full overflow-hidden bg-gray-950">
      <note-studio-overlay
        :key="`${notebook.id}_page_${currentPage}`"
        :active="true"
        :item-id="notebook.id"
        :page-key="String(currentPage)"
        :is-transparent-background="false"
        :initial-sheet-style="notebook ? notebook.sheetStyle : null"
        @add-new-page="addNewPage"
        @add-new-note="openNewNoteModal"
        @add-new-document="openNewNoteModal"
      />
    </div>

    <!-- Modale Crea Nuova Nota -->
    <create-note-modal
      v-model="showCreateNoteModal"
      :default-folder-id="notebook ? notebook.folderId : null"
      @created="onNoteCreated"
    />
  </div>
</template>

<script>
import NoteStudioOverlay from './NoteStudioOverlay.vue'
import CreateNoteModal from './CreateNoteModal.vue'
import { noteStorage } from '@/services/noteStorage'

export default {
  components: {
    NoteStudioOverlay,
    CreateNoteModal
  },
  props: {
    value: Boolean,
    notebook: {
      type: Object,
      default: () => null
    }
  },
  data() {
    return {
      isEditingTitle: false,
      tempTitle: '',
      currentPage: 1,
      totalPages: 1,
      showCreateNoteModal: false
    }
  },
  computed: {
    userId() {
      return this.$store.state.user.user?.id || 'default_user'
    }
  },
  watch: {
    notebook: {
      immediate: true,
      handler(val) {
        if (val) {
          this.tempTitle = val.title || ''
          this.currentPage = 1
          this.totalPages = Math.max(1, val.pageCount || 1)
        }
      }
    }
  },
  methods: {
    close() {
      this.$emit('input', false)
      this.$emit('closed')
    },
    startEditTitle() {
      this.tempTitle = this.notebook?.title || ''
      this.isEditingTitle = true
      this.$nextTick(() => {
        this.$refs.titleInput?.focus()
      })
    },
    async saveTitle() {
      if (!this.notebook || !this.tempTitle.trim()) {
        this.isEditingTitle = false
        return
      }
      const newTitle = this.tempTitle.trim()
      this.notebook.title = newTitle
      await noteStorage.updateNotebook(this.userId, this.notebook.id, { title: newTitle })
      this.isEditingTitle = false
      this.$emit('updated', this.notebook)
    },
    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--
      }
    },
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
      }
    },
    async addNewPage() {
      this.totalPages++
      this.currentPage = this.totalPages
      if (this.notebook) {
        this.notebook.pageCount = this.totalPages
        await noteStorage.updateNotebook(this.userId, this.notebook.id, { pageCount: this.totalPages })
        this.$toast?.success(`Aggiunta Pagina ${this.currentPage}`)
      }
    },
    openNewNoteModal() {
      this.showCreateNoteModal = true
    },
    onNoteCreated(newNote) {
      if (newNote) {
        this.$emit('note-created', newNote)
      }
    }
  }
}
</script>

<style scoped>
.note-studio-modal {
  touch-action: none;
}
</style>

