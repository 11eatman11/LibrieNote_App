<template>
  <div
    v-if="value"
    class="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
    style="position: fixed !important; inset: 0 !important; z-index: 999999 !important; pointer-events: auto !important; touch-action: none !important;"
    @touchmove.stop
    @click.self="$emit('input', false)"
  >
    <div class="bg-gray-900 border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-gray-100 flex flex-col max-h-[85vh]">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gradient-to-r from-purple-950/60 to-gray-950/80">
        <div class="flex items-center space-x-2.5">
          <span class="material-symbols text-2xl text-purple-400 animate-pulse">auto_awesome</span>
          <div>
            <h2 class="text-lg font-bold">Galaxy AI Assist</h2>
            <p class="text-xxs text-purple-300">Assistente intelligente per note e studio</p>
          </div>
        </div>
        <button type="button" @click="$emit('input', false)" class="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
          <span class="material-symbols text-xl">close</span>
        </button>
      </div>

      <!-- Action Buttons -->
      <div class="p-6 overflow-y-auto space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="flex items-center space-x-2 p-3 rounded-xl border border-purple-500/30 hover:border-purple-400 bg-purple-950/30 hover:bg-purple-900/40 text-left transition"
            @click="generateSummary"
          >
            <span class="material-symbols text-2xl text-purple-400">summarize</span>
            <div>
              <p class="text-xs font-bold text-white">Riassumi Note</p>
              <p class="text-xxs text-gray-400">Sintesi del testo e formule</p>
            </div>
          </button>
          <button
            type="button"
            class="flex items-center space-x-2 p-3 rounded-xl border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/40 text-left transition"
            @click="extractKeyPoints"
          >
            <span class="material-symbols text-2xl text-cyan-400">format_list_bulleted</span>
            <div>
              <p class="text-xs font-bold text-white">Punti Chiave</p>
              <p class="text-xxs text-gray-400">Elenco concetti salienti</p>
            </div>
          </button>
        </div>

        <!-- Output Result -->
        <div v-if="loading" class="p-8 flex flex-col items-center justify-center space-y-3">
          <span class="material-symbols text-3xl text-purple-400 animate-spin">sync</span>
          <p class="text-xs text-purple-200">Elaborazione Galaxy AI in corso...</p>
        </div>

        <div v-else-if="resultText" class="bg-gray-950/80 border border-gray-800 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line text-gray-200">
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-gray-800 text-xs text-purple-300 font-semibold">
            <span>{{ resultTitle }}</span>
            <button type="button" class="hover:text-white flex items-center space-x-1" @click="copyResult">
              <span class="material-symbols text-sm">content_copy</span>
              <span>Copia</span>
            </button>
          </div>
          {{ resultText }}
        </div>

        <div v-else class="text-center py-6 text-xs text-gray-400">
          Seleziona un'operazione per analizzare automaticamente gli appunti, le caselle matematiche e i testi di questa pagina.
        </div>
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
    pageData: {
      type: Object,
      default: () => ({ textNotes: [], mathBoxes: [] })
    }
  },
  data() {
    return {
      loading: false,
      resultText: '',
      resultTitle: ''
    }
  },
  methods: {
    collectAllText() {
      const texts = (this.pageData.textNotes || []).map((t) => t.content).filter(Boolean)
      const maths = (this.pageData.mathBoxes || []).map((m) => `Formula: ${m.formula}`).filter(Boolean)
      return { texts, maths }
    },
    generateSummary() {
      this.loading = true
      this.resultTitle = 'Sintesi Generale della Nota'
      setTimeout(() => {
        const { texts, maths } = this.collectAllText()
        if (texts.length === 0 && maths.length === 0) {
          this.resultText = 'Nessun testo o formula rilevato su questo foglio. Inserisci note di testo o caselle matematiche per generare il riassunto.'
        } else {
          let output = '📌 **Sintesi Contenuti:**\n'
          if (texts.length > 0) {
            output += `• Contenuti testuali (${texts.length} note): ${texts.join('; ')}\n\n`
          }
          if (maths.length > 0) {
            output += `• Calcoli ed equazioni presenti: ${maths.join(', ')}\n`
          }
          this.resultText = output
        }
        this.loading = false
      }, 600)
    },
    extractKeyPoints() {
      this.loading = true
      this.resultTitle = 'Punti Chiave & Concetti Principali'
      setTimeout(() => {
        const { texts, maths } = this.collectAllText()
        if (texts.length === 0 && maths.length === 0) {
          this.resultText = 'Nessun dato su questa pagina da cui estrarre punti chiave.'
        } else {
          let points = []
          texts.forEach((t) => {
            const sentences = t.split(/[.\n]/).map((s) => s.trim()).filter((s) => s.length > 5)
            points = points.concat(sentences)
          })
          if (points.length === 0 && texts.length > 0) points = texts

          let output = '✨ **Concetti Chiave Rilevati:**\n'
          points.forEach((p, idx) => {
            output += `${idx + 1}. ${p}\n`
          })
          if (maths.length > 0) {
            output += `\n🔢 **Espressioni da memorizzare:**\n`
            maths.forEach((m) => {
              output += `• ${m}\n`
            })
          }
          this.resultText = output
        }
        this.loading = false
      }, 600)
    },
    copyResult() {
      if (navigator.clipboard && this.resultText) {
        navigator.clipboard.writeText(this.resultText)
        alert('Copiato negli appunti!')
      }
    }
  }
}
</script>

<style scoped>
.text-xxs {
  font-size: 0.68rem;
}
</style>
