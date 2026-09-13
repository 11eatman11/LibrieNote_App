<template>
  <div class="w-full h-full min-h-full relative">
    <div v-if="attemptingConnection" class="w-full pt-4 flex items-center justify-center">
      <widgets-loading-spinner />
      <p class="pl-4">{{ $strings.MessageAttemptingServerConnection }}</p>
    </div>
    <div v-if="shelves.length && isLoading" class="w-full pt-4 flex items-center justify-center">
      <widgets-loading-spinner />
      <p class="pl-4">{{ $strings.MessageLoadingServerData }}</p>
    </div>

    <!-- Sezione Note & Appunti Personali (In Primo Piano) -->
    <div v-if="isNotesEnabled" class="w-full px-4 pt-3 pb-2 select-none">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-2">
          <span class="material-symbols text-xl text-blue-400">edit_note</span>
          <h2 class="font-bold text-base text-gray-100">Le Mie Note & Appunti</h2>
        </div>
        <nuxt-link
          to="/bookshelf/collections?tab=notes"
          class="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1"
        >
          <span>Cartelle Note</span>
          <span class="material-symbols text-sm">folder_open</span>
        </nuxt-link>
      </div>

      <!-- Azioni e Carousel Note Recenti -->
      <div class="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-none">
        <!-- Pulsante + Nuova Nota -->
        <button
          type="button"
          class="flex-shrink-0 w-36 h-24 rounded-2xl border-2 border-dashed border-blue-500/50 hover:border-blue-400 bg-blue-900/30 active:scale-95 transition-all flex flex-col items-center justify-center p-2.5 text-center cursor-pointer shadow-lg"
          @click="showCreateNoteModal = true"
        >
          <div class="w-8 h-8 rounded-xl bg-blue-600/40 border border-blue-400/50 flex items-center justify-center text-blue-300 mb-1">
            <span class="material-symbols text-xl">note_add</span>
          </div>
          <span class="font-bold text-xs text-white">+ Nuova Nota</span>
          <span class="text-xxs text-blue-200/80">Crea appunto</span>
        </button>

        <!-- Pulsante Cartelle & Taccuini -->
        <nuxt-link
          to="/bookshelf/collections?tab=notes"
          class="flex-shrink-0 w-36 h-24 rounded-2xl border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/40 active:scale-95 transition-all flex flex-col items-center justify-center p-2.5 text-center cursor-pointer shadow-lg"
        >
          <div class="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-400/50 flex items-center justify-center text-purple-300 mb-1">
            <span class="material-symbols text-xl">folder_special</span>
          </div>
          <span class="font-bold text-xs text-white">Cartelle Note</span>
          <span class="text-xxs text-purple-200/80">Tutti i taccuini</span>
        </nuxt-link>

        <!-- Schede Note Recenti dell'Utente -->
        <div
          v-for="note in userNotes.slice(0, 10)"
          :key="note.id"
          class="flex-shrink-0 w-36 h-24 rounded-2xl bg-gray-900/95 border border-gray-800 hover:border-blue-500/60 active:scale-95 p-2.5 flex flex-col justify-between transition-all cursor-pointer relative shadow-lg"
          @click="openNotebook(note)"
        >
          <div class="flex items-start justify-between">
            <span class="material-symbols text-base text-blue-400">description</span>
            <span class="px-1.5 py-0.5 rounded text-xxs font-medium bg-black/50 text-gray-400 border border-white/5">
              {{ formatNoteDate(note.updatedAt || note.createdAt) }}
            </span>
          </div>
          <div>
            <h3 class="font-bold text-xs text-white truncate leading-tight">{{ note.title || 'Nuova Nota' }}</h3>
            <span class="text-xxs text-gray-400 truncate block mt-0.5">{{ getTemplateLabel(note.sheetStyle && note.sheetStyle.template) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modali Note Studio -->
    <create-note-modal v-model="showCreateNoteModal" @created="onNoteCreated" />
    <note-studio-notebook-modal
      v-model="showNotebookModal"
      :notebook="activeNotebook"
      @updated="loadUserNotes"
      @closed="loadUserNotes"
      @note-created="onNoteCreated"
    />

    <div class="w-full" :class="{ 'py-6': altViewEnabled }">
      <template v-for="(shelf, index) in shelves">
        <bookshelf-shelf :key="shelf.id" :label="getShelfLabel(shelf)" :entities="shelf.entities" :type="shelf.type" :style="{ zIndex: shelves.length - index }" />
      </template>
    </div>

    <div v-if="!shelves.length && !isLoading && !userNotes.length" class="absolute top-0 left-0 w-full h-full flex items-center justify-center">
      <div>
        <p class="mb-4 text-center text-xl">
          {{ $strings.MessageBookshelfEmpty }}
        </p>
        <div class="w-full" v-if="!user">
          <div class="flex justify-center items-center mb-3">
            <span class="material-symbols text-error text-lg">cloud_off</span>
            <p class="pl-2 text-error text-sm">{{ $strings.MessageAudiobookshelfServerNotConnected }}</p>
          </div>
        </div>
        <div class="flex justify-center">
          <ui-btn v-if="!user" small @click="$router.push('/connect')" class="w-32">{{ $strings.ButtonConnect }}</ui-btn>
        </div>
      </div>
    </div>
    <div v-else-if="!shelves.length && isLoading && !attemptingConnection" class="absolute top-0 left-0 z-50 w-full h-full flex items-center justify-center">
      <ui-loading-indicator :text="$strings.MessageLoading" />
    </div>
  </div>
</template>

<script>
import CreateNoteModal from '@/components/notes/CreateNoteModal.vue'
import NoteStudioNotebookModal from '@/components/notes/NoteStudioNotebookModal.vue'
import { noteStorage } from '@/services/noteStorage'

export default {
  components: {
    CreateNoteModal,
    NoteStudioNotebookModal
  },
  props: {},
  data() {
    return {
      shelves: [],
      isFirstNetworkConnection: true,
      lastServerFetch: 0,
      lastServerFetchLibraryId: null,
      lastLocalFetch: 0,
      localLibraryItems: [],
      isLoading: false,
      userNotes: [],
      showCreateNoteModal: false,
      showNotebookModal: false,
      activeNotebook: null
    }
  },
  watch: {
    networkConnected(newVal) {
      console.log('[categories] Network changed to ' + newVal + ' - fetch categories.')

      if (newVal) {
        if (this.isFirstNetworkConnection) {
          this.isFirstNetworkConnection = false
          this.fetchCategories()
          this.loadUserNotes()
          return
        }

        setTimeout(() => {
          this.fetchCategories()
          this.loadUserNotes()
        }, 3000)
      } else {
        this.fetchCategories()
        this.loadUserNotes()
      }
    }
  },
  computed: {
    user() {
      return this.$store.state.user.user
    },
    userId() {
      return this.user ? this.user.id : 'default_user'
    },
    isNotesEnabled() {
      return this.$store.getters['libraries/getLibraryNotesEnabled']
    },
    networkConnected() {
      return this.$store.state.networkConnected
    },
    isIos() {
      return this.$platform === 'ios'
    },
    currentLibraryName() {
      return this.$store.getters['libraries/getCurrentLibraryName']
    },
    currentLibraryId() {
      return this.$store.state.libraries.currentLibraryId
    },
    currentLibraryMediaType() {
      return this.$store.getters['libraries/getCurrentLibraryMediaType']
    },
    currentLibraryIsPodcast() {
      return this.currentLibraryMediaType === 'podcast'
    },
    altViewEnabled() {
      return this.$store.getters['getAltViewEnabled']
    },
    localMediaProgress() {
      return this.$store.state.globals.localMediaProgress
    },
    attemptingConnection() {
      return this.$store.state.attemptingConnection
    }
  },
  methods: {
    async loadUserNotes() {
      try {
        this.userNotes = await noteStorage.getUserNotebooks(this.userId)
        if (this.networkConnected && this.user) {
          const client = this.$nativeHttp || this.$axios
          noteStorage.syncWithServer(this.userId, client).then((res) => {
            if (res && res.success) {
              noteStorage.getUserNotebooks(this.userId).then((nbs) => {
                this.userNotes = nbs
              })
            }
          })
        }
      } catch (e) {
        console.warn('Errore caricamento note:', e)
      }
    },
    openNotebook(note) {
      this.activeNotebook = note
      this.showNotebookModal = true
    },
    onNoteCreated(newNote) {
      this.loadUserNotes()
      this.activeNotebook = newNote
      this.showNotebookModal = true
    },
    formatNoteDate(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
    },
    getTemplateLabel(tpl) {
      const map = {
        blank: 'Bianco',
        ruled: 'Righe',
        ruled_narrow: 'Righe Strette',
        grid: 'Quadretti',
        music: 'Pentagramma',
        cornell: 'Cornell',
        millimeter: 'Millimetrata',
        dot: 'Puntinato'
      }
      return map[tpl] || 'Nota'
    },
    getShelfLabel(shelf) {
      if (shelf.labelStringKey && this.$strings[shelf.labelStringKey]) return this.$strings[shelf.labelStringKey]
      return shelf.label
    },
    getLocalMediaItemCategories() {
      const localMedia = this.localLibraryItems

      const categories = []
      const booksContinueListening = []
      const podcastEpisodesContinueListening = []
      const books = []
      const podcasts = []

      localMedia.forEach((item) => {
        if (item.mediaType === 'book') {
          if (item.progress && !item.progress.isFinished) {
            booksContinueListening.push(item)
          }
          books.push(item)
        } else if (item.mediaType === 'podcast') {
          item.episodes = item.episodes.map((ep) => {
            const podcastEpisodeItemCloner = { ...item }
            delete podcastEpisodeItemCloner.episodes
            if (ep.progress && !ep.progress.isFinished) {
              podcastEpisodesContinueListening.push({
                ...podcastEpisodeItemCloner,
                recentEpisode: ep
              })
            }
            return ep
          })
          podcasts.push(item)
        }
      })

      if (booksContinueListening.length) {
        categories.push({
          id: 'local-books-continue',
          label: this.$strings.LabelContinueBooks,
          type: 'book',
          localOnly: true,
          entities: booksContinueListening.sort((a, b) => {
            if (a.progress && b.progress) {
              return b.progress.lastUpdate > a.progress.lastUpdate ? 1 : -1
            }
            return 0
          })
        })
      }
      if (podcastEpisodesContinueListening.length) {
        categories.push({
          id: 'local-episodes-continue',
          label: this.$strings.LabelContinueEpisodes,
          type: 'episode',
          localOnly: true,
          entities: podcastEpisodesContinueListening.sort((a, b) => {
            if (a.recentEpisode.progress && b.recentEpisode.progress) {
              return b.recentEpisode.progress.lastUpdate > a.recentEpisode.progress.lastUpdate ? 1 : -1
            }
            return 0
          })
        })
      }

      if (books.length) {
        categories.push({
          id: 'local-books',
          label: this.$strings.LabelLocalBooks,
          type: 'book',
          entities: books.sort((a, b) => {
            if (a.progress && a.progress.isFinished) return 1
            else if (b.progress && b.progress.isFinished) return -1
            else if (a.progress && b.progress) {
              return b.progress.lastUpdate > a.progress.lastUpdate ? 1 : -1
            }
            return 0
          })
        })
      }
      if (podcasts.length) {
        categories.push({
          id: 'local-podcasts',
          label: this.$strings.LabelLocalPodcasts,
          type: 'podcast',
          entities: podcasts
        })
      }

      return categories
    },
    async fetchCategories() {
      const isConnectedToServerWithInternet = this.user && this.currentLibraryId && this.networkConnected
      if (isConnectedToServerWithInternet) {
        if (this.lastServerFetch && Date.now() - this.lastServerFetch < 5000 && this.lastServerFetchLibraryId == this.currentLibraryId) {
          return
        } else {
          this.lastServerFetchLibraryId = this.currentLibraryId
          this.lastServerFetch = Date.now()
          this.lastLocalFetch = 0
        }
      } else {
        if (this.lastLocalFetch && Date.now() - this.lastLocalFetch < 5000) {
          return
        } else {
          this.lastServerFetchLibraryId = null
          this.lastServerFetch = 0
          this.lastLocalFetch = Date.now()
        }
      }

      this.isLoading = true

      this.localLibraryItems = await this.$db.getLocalLibraryItems()
      const localCategories = this.getLocalMediaItemCategories()
      this.shelves = localCategories

      if (isConnectedToServerWithInternet) {
        const categories = await this.$nativeHttp.get('/api/libraries/' + this.currentLibraryId + '/personalized?minified=1&include=rssfeed,numEpisodesIncomplete', { connectTimeout: 10000 }).catch((error) => {
          console.error('[categories] Failed to fetch categories', error)
          return []
        })
        if (!categories.length) {
          this.lastServerFetch = 0
          this.lastLocalFetch = Date.now()
          this.isLoading = false
          return
        }

        this.shelves = categories.map((cat) => {
          if (cat.type == 'book' || cat.type == 'podcast' || cat.type == 'episode') {
            cat.entities = cat.entities.map((entity) => {
              const localLibraryItem = this.localLibraryItems.find((lli) => {
                return lli.libraryItemId == entity.id
              })
              if (localLibraryItem) {
                entity.localLibraryItem = localLibraryItem
              }
              return entity
            })
          }
          return cat
        })

        const localShelves = localCategories.filter((cat) => cat.type === this.currentLibraryMediaType && !cat.localOnly)
        this.shelves.push(...localShelves)
      }

      this.isLoading = false
    },
    libraryChanged() {
      if (this.currentLibraryId) {
        this.fetchCategories()
        this.loadUserNotes()
      }
    },
    audiobookAdded(audiobook) {
      if (!this.search) {
        this.fetchCategories()
        this.loadUserNotes()
      }
    },
    audiobookUpdated(audiobook) {
      this.shelves.forEach((shelf) => {
        if (shelf.type === 'books') {
          shelf.entities = shelf.entities.map((ent) => {
            if (ent.id === audiobook.id) {
              return audiobook
            }
            return ent
          })
        } else if (shelf.type === 'series') {
          shelf.entities.forEach((ent) => {
            ent.books = ent.books.map((book) => {
              if (book.id === audiobook.id) return audiobook
              return book
            })
          })
        }
      })
    },
    removeBookFromShelf(audiobook) {
      this.shelves.forEach((shelf) => {
        if (shelf.type === 'books') {
          shelf.entities = shelf.entities.filter((ent) => {
            return ent.id !== audiobook.id
          })
        } else if (shelf.type === 'series') {
          shelf.entities.forEach((ent) => {
            ent.books = ent.books.filter((book) => {
              return book.id !== audiobook.id
            })
          })
        }
      })
    },
    initListeners() {
      this.$eventBus.$on('library-changed', this.libraryChanged)
    },
    removeListeners() {
      this.$eventBus.$off('library-changed', this.libraryChanged)
    }
  },
  async mounted() {
    if (this.$route.query.error) {
      this.$toast.error(this.$route.query.error)
    }

    this.initListeners()
    await this.$store.dispatch('globals/loadLocalMediaProgress')
    this.fetchCategories()
    this.loadUserNotes()
  },
  beforeDestroy() {
    this.removeListeners()
  }
}
</script>

<style scoped>
.text-xxs {
  font-size: 0.65rem;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
