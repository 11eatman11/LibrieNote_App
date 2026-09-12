<template>
  <div
    class="voice-memo absolute select-none rounded-lg shadow-xl border border-white/20 bg-gray-900/95 text-white"
    :style="boxStyle"
    @mousedown="bringToFront"
    @touchstart="bringToFront"
  >
    <!-- Drag Bar -->
    <div
      class="drag-handle flex items-center justify-between px-2 py-1 bg-black/40 rounded-t-lg cursor-move select-none"
      @mousedown.stop="startDrag"
      @touchstart.stop="startTouchDrag"
    >
      <div class="flex items-center space-x-1.5 text-xs opacity-80">
        <span class="material-symbols text-sm">mic</span>
        <span class="font-sans font-semibold">🎙️ Memo Vocale</span>
      </div>
      <button
        type="button"
        @click.stop="$emit('delete', item.id)"
        class="p-1 hover:bg-red-500/50 rounded text-red-300 hover:text-white"
        title="Elimina memo vocale"
      >
        <span class="material-symbols text-sm">close</span>
      </button>
    </div>

    <!-- Recorder / Player Content -->
    <div class="p-3 flex flex-col space-y-2">
      <!-- Sezione Registrazione in corso -->
      <div v-if="isRecording" class="flex items-center justify-between bg-red-950/60 border border-red-500/30 rounded-lg p-2">
        <div class="flex items-center space-x-2">
          <span class="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
          <span class="text-xs text-red-300 font-mono">REC: {{ recordingTimeFormatted }}</span>
        </div>
        <button
          type="button"
          @click.stop="stopRecording"
          class="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold"
        >
          Stop
        </button>
      </div>

      <!-- Nessun audio: pulsante Avvia Registrazione -->
      <div v-else-if="!item.audioBase64" class="flex items-center justify-center p-2">
        <button
          type="button"
          @click.stop="startRecording"
          class="flex items-center space-x-2 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition"
        >
          <span class="material-symbols text-base">mic</span>
          <span>Registra Memo Vocale</span>
        </button>
      </div>

      <!-- Audio registrato: Player integrato -->
      <div v-else class="flex flex-col space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-300">{{ item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Memo' }}</span>
          <span class="text-xs font-mono text-gray-400">{{ formatTime(item.duration || 0) }}</span>
        </div>
        <audio
          v-if="item.audioBase64"
          ref="audioPlayer"
          :src="item.audioBase64"
          controls
          class="w-full h-8 accent-cyan-400"
          @mousedown.stop
          @touchstart.stop
        ></audio>
        <div class="flex justify-end pt-1">
          <button
            type="button"
            @click.stop="reRecord"
            class="text-xxs text-gray-400 hover:text-white underline"
          >
            Sovrascrivi registrazione
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    item: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      isRecording: false,
      recordingSeconds: 0,
      recordingInterval: null,
      mediaRecorder: null,
      audioChunks: [],
      isDragging: false,
      dragOffset: { x: 0, y: 0 }
    }
  },
  computed: {
    boxStyle() {
      return {
        left: `${this.item.x || 60}px`,
        top: `${this.item.y || 160}px`,
        width: `${this.item.width || 280}px`,
        zIndex: this.item.zIndex || 20
      }
    },
    recordingTimeFormatted() {
      return this.formatTime(this.recordingSeconds)
    }
  },
  beforeDestroy() {
    this.stopRecordingTimer()
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
    }
  },
  methods: {
    bringToFront() {
      this.$emit('bring-to-front', this.item.id)
    },
    formatTime(sec) {
      const m = Math.floor(sec / 60)
      const s = Math.floor(sec % 60)
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    },
    async startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        this.mediaRecorder = new MediaRecorder(stream)
        this.audioChunks = []

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.audioChunks.push(e.data)
        }

        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.audioChunks, { type: 'audio/webm' })
          const reader = new FileReader()
          reader.onloadend = () => {
            this.item.audioBase64 = reader.result
            this.item.duration = this.recordingSeconds
            this.item.createdAt = Date.now()
            this.$emit('update', this.item)
          }
          reader.readAsDataURL(blob)
          stream.getTracks().forEach((track) => track.stop())
        }

        this.mediaRecorder.start()
        this.isRecording = true
        this.recordingSeconds = 0
        this.recordingInterval = setInterval(() => {
          this.recordingSeconds++
        }, 1000)
      } catch (err) {
        console.error('Errore accesso microfono:', err)
        alert('Impossibile accedere al microfono per registrare il memo vocale.')
      }
    },
    stopRecording() {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop()
        this.isRecording = false
        this.stopRecordingTimer()
      }
    },
    stopRecordingTimer() {
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval)
        this.recordingInterval = null
      }
    },
    reRecord() {
      this.item.audioBase64 = null
      this.startRecording()
    },
    startDrag(e) {
      this.isDragging = true
      this.dragOffset.x = e.clientX - (this.item.x || 60)
      this.dragOffset.y = e.clientY - (this.item.y || 160)

      const onMouseMove = (ev) => {
        if (!this.isDragging) return
        this.item.x = Math.max(10, ev.clientX - this.dragOffset.x)
        this.item.y = Math.max(10, ev.clientY - this.dragOffset.y)
      }

      const onMouseUp = () => {
        this.isDragging = false
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        this.$emit('update', this.item)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    startTouchDrag(e) {
      if (!e.touches || e.touches.length === 0) return
      const touch = e.touches[0]
      this.isDragging = true
      this.dragOffset.x = touch.clientX - (this.item.x || 60)
      this.dragOffset.y = touch.clientY - (this.item.y || 160)

      const onTouchMove = (ev) => {
        if (!this.isDragging || !ev.touches || ev.touches.length === 0) return
        const t = ev.touches[0]
        this.item.x = Math.max(10, t.clientX - this.dragOffset.x)
        this.item.y = Math.max(10, t.clientY - this.dragOffset.y)
      }

      const onTouchEnd = () => {
        this.isDragging = false
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', onTouchEnd)
        this.$emit('update', this.item)
      }

      window.addEventListener('touchmove', onTouchMove)
      window.addEventListener('touchend', onTouchEnd)
    }
  }
}
</script>

<style scoped>
.text-xxs {
  font-size: 0.65rem;
}
</style>
