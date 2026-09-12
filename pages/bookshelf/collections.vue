<template>
  <div class="w-full h-full min-h-full">
    <!-- Tab Switcher per Raccolte Libri vs Note & Taccuini Personali -->
    <div v-if="isNotesEnabled" class="w-full bg-bg border-b border-border px-4 py-2 flex items-center space-x-3">
      <button
        type="button"
        class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
        :class="activeCollectionTab === 'collections' ? 'bg-primary text-white shadow' : 'bg-bg text-fg opacity-60 hover:opacity-100'"
        @click="setTab('collections')"
      >
        <span class="material-symbols text-sm">&#xe431;</span>
        <span>Raccolte Libri</span>
      </button>

      <button
        type="button"
        class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
        :class="activeCollectionTab === 'notes' ? 'bg-blue-600 text-white shadow' : 'bg-bg text-fg opacity-60 hover:opacity-100'"
        @click="setTab('notes')"
      >
        <span class="material-symbols text-sm">edit_note</span>
        <span>Note & Taccuini</span>
      </button>
    </div>

    <!-- Vista Note Personali con Cartelle e Sottocartelle -->
    <notes-collections-view v-if="activeCollectionTab === 'notes' && isNotesEnabled" />
    <bookshelf-lazy-bookshelf v-else page="collections" />
  </div>
</template>

<script>
import NotesCollectionsView from '@/components/notes/NotesCollectionsView.vue'

export default {
  components: {
    NotesCollectionsView
  },
  data() {
    return {
      activeCollectionTab: this.$route.query.tab === 'notes' ? 'notes' : 'collections'
    }
  },
  watch: {
    '$route.query.tab'(val) {
      this.activeCollectionTab = val === 'notes' && this.isNotesEnabled ? 'notes' : 'collections'
    },
    isNotesEnabled(enabled) {
      if (!enabled && this.activeCollectionTab === 'notes') {
        this.setTab('collections')
      }
    }
  },
  computed: {
    isNotesEnabled() {
      return this.$store.getters['libraries/getLibraryNotesEnabled']
    }
  },
  methods: {
    setTab(tab) {
      this.activeCollectionTab = tab
      const query = { ...this.$route.query }
      if (tab === 'notes') {
        query.tab = 'notes'
      } else {
        delete query.tab
      }
      this.$router.replace({ query })
    }
  }
}
</script>