<template>
  <div
    v-if="active"
    class="note-studio-overlay absolute inset-0 z-30 pointer-events-none overflow-hidden"
    :class="{ 'opacity-0': !notesVisible }"
  >
    <!-- Background Layer (modelli foglio, pentagramma, colori) solo per taccuini autonomi -->
    <sheet-background
      v-if="!isTransparentBackground"
      :style-config="sheetStyle"
      :is-overlay-transparent="false"
    />

    <!-- Interactive HTML5 Canvas Layer for Pen & Highlighter -->
    <canvas
      ref="drawingCanvas"
      class="drawing-canvas absolute inset-0 w-full h-full"
      :class="canvasPointerClass"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
    />

    <!-- Text Boxes Layer -->
    <text-box
      v-for="tbox in textNotes"
      :key="tbox.id"
      :item="tbox"
      :sheet-style="sheetStyle"
      class="pointer-events-auto"
      @update="saveCurrentPageData"
      @update-style="onUpdateBoxSettings('textBox', $event)"
      @delete="deleteTextBox"
      @bring-to-front="bringToFront"
    />

    <!-- Math Boxes Layer -->
    <math-box
      v-for="mbox in mathBoxes"
      :key="mbox.id"
      :item="mbox"
      :sheet-style="sheetStyle"
      class="pointer-events-auto"
      @update="saveCurrentPageData"
      @update-style="onUpdateBoxSettings('mathBox', $event)"
      @delete="deleteMathBox"
      @bring-to-front="bringToFront"
    />

    <!-- Voice Memos Layer -->
    <voice-memo-recorder
      v-for="vmemo in voiceMemos"
      :key="vmemo.id"
      :item="vmemo"
      class="pointer-events-auto"
      @update="saveCurrentPageData"
      @delete="deleteVoiceMemo"
      @bring-to-front="bringToFront"
    />

    <!-- Right Floating Toolbar -->
    <note-studio-toolbar
      class="pointer-events-auto"
      :active-tool="activeTool"
      :tool-settings="toolSettings"
      :can-undo="undoStack.length > 0"
      :can-redo="redoStack.length > 0"
      :notes-visible="notesVisible"
      :show-sheet-style="!isTransparentBackground"
      :is-standalone-notebook="!isTransparentBackground"
      @select-tool="onSelectTool"
      @update-settings="onUpdateSettings"
      @add-mathbox="addNewMathBox"
      @add-textbox="addNewTextBox"
      @add-voice="addNewVoiceMemo"
      @open-sheet-style="showSheetStyleModal = true"
      @open-ai-assist="showAiModal = true"
      @add-new-page="$emit('add-new-page')"
      @add-new-note="$emit('add-new-note')"
      @add-new-document="$emit('add-new-document')"
      @undo="undo"
      @redo="redo"
      @clear-canvas="clearAllStrokes"
      @toggle-visibility="notesVisible = !notesVisible"
    />

    <!-- Modale Stile & Modello Foglio -->
    <sheet-style-modal
      v-model="showSheetStyleModal"
      :current-config="sheetStyle"
      @update="onUpdateSheetStyle"
    />

    <!-- Modale Galaxy AI Assist -->
    <galaxy-a-i-assist-modal
      v-model="showAiModal"
      :page-data="{ textNotes, mathBoxes }"
    />
  </div>
</template>

<script>
import SheetBackground from './SheetBackground.vue'
import MathBox from './MathBox.vue'
import TextBox from './TextBox.vue'
import VoiceMemoRecorder from './VoiceMemoRecorder.vue'
import SheetStyleModal from './SheetStyleModal.vue'
import GalaxyAIAssistModal from './GalaxyAIAssistModal.vue'
import NoteStudioToolbar from './NoteStudioToolbar.vue'
import { noteStorage, DEFAULT_TOOL_SETTINGS } from '@/services/noteStorage'

export default {
  components: {
    SheetBackground,
    MathBox,
    TextBox,
    VoiceMemoRecorder,
    SheetStyleModal,
    GalaxyAIAssistModal,
    NoteStudioToolbar
  },
  props: {
    active: {
      type: Boolean,
      default: true
    },
    itemId: {
      type: String,
      default: 'default'
    },
    pageKey: {
      type: [String, Number],
      default: '1'
    },
    isTransparentBackground: {
      type: Boolean,
      default: true
    },
    initialSheetStyle: {
      type: Object,
      default: () => null
    }
  },
  data() {
    return {
      activeTool: 'pen',
      toolSettings: JSON.parse(JSON.stringify(DEFAULT_TOOL_SETTINGS)),
      strokes: [],
      undoStack: [],
      redoStack: [],
      textNotes: [],
      mathBoxes: [],
      voiceMemos: [],
      sheetStyle: { ...DEFAULT_TOOL_SETTINGS.sheetStyle },
      notesVisible: true,
      showSheetStyleModal: false,
      showAiModal: false,
      isDrawing: false,
      currentStroke: null,
      topZIndex: 30
    }
  },
  computed: {
    userId() {
      return this.$store?.state?.user?.user?.id || 'default_user'
    },
    canvasPointerClass() {
      if (['pen', 'highlighter', 'eraser'].includes(this.activeTool)) {
        return 'pointer-events-auto cursor-crosshair'
      }
      return 'pointer-events-none'
    }
  },
  watch: {
    pageKey() {
      this.loadCurrentPageData()
    },
    itemId() {
      this.loadCurrentPageData()
    },
    initialSheetStyle: {
      immediate: true,
      handler(val) {
        if (val) {
          this.sheetStyle = { ...this.sheetStyle, ...val }
        }
      }
    }
  },
  mounted() {
    this.toolSettings = noteStorage.loadSettings()
    this.activeTool = this.toolSettings.activeTool || 'pen'
    if (this.toolSettings.sheetStyle) {
      this.sheetStyle = { ...this.sheetStyle, ...this.toolSettings.sheetStyle }
    }
    if (this.initialSheetStyle) {
      this.sheetStyle = { ...this.sheetStyle, ...this.initialSheetStyle }
    }

    this.$nextTick(() => {
      this.initCanvas()
      this.loadCurrentPageData()
    })

    window.addEventListener('resize', this.resizeCanvas)
    window.addEventListener('keydown', this.handleGlobalKeydown)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeCanvas)
    window.removeEventListener('keydown', this.handleGlobalKeydown)
  },
  methods: {
    initCanvas() {
      const canvas = this.$refs.drawingCanvas
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      this.redrawCanvas()
    },
    resizeCanvas() {
      this.initCanvas()
    },
    handleGlobalKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) this.redo()
        else this.undo()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        this.redo()
      }
    },
    onSelectTool(tool) {
      this.activeTool = tool
      this.toolSettings.activeTool = tool
      noteStorage.saveSettings(this.toolSettings)
    },
    onUpdateSettings(newSettings) {
      this.toolSettings = { ...newSettings }
      noteStorage.saveSettings(this.toolSettings)
    },
    async onUpdateSheetStyle(newStyle) {
      this.sheetStyle = { ...newStyle }
      this.toolSettings.sheetStyle = { ...newStyle }
      noteStorage.saveSettings(this.toolSettings)
      await this.saveCurrentPageData()
      if (this.itemId && this.itemId.startsWith('nb_')) {
        await noteStorage.updateNotebook(this.userId, this.itemId, { sheetStyle: { ...newStyle } })
      }
    },
    onUpdateBoxSettings(type, settings) {
      if (!this.toolSettings[type]) {
        this.toolSettings[type] = {}
      }
      this.toolSettings[type] = {
        ...this.toolSettings[type],
        ...settings
      }
      noteStorage.saveSettings(this.toolSettings)
    },
    addNewMathBox() {
      const newBox = {
        id: 'math_' + Date.now(),
        x: 80 + Math.random() * 40,
        y: 120 + Math.random() * 40,
        width: this.toolSettings.mathBox?.width || 280,
        formula: '',
        bgColor: this.toolSettings.mathBox?.bgColor || 'transparent',
        bgOpacity: this.toolSettings.mathBox?.bgOpacity !== undefined ? this.toolSettings.mathBox.bgOpacity : 0,
        textColor: this.toolSettings.mathBox?.textColor || '#059669',
        displayMode: this.toolSettings.mathBox?.displayMode || 'both',
        fontSize: this.toolSettings.mathBox?.fontSize || 16,
        isNew: true,
        zIndex: ++this.topZIndex
      }
      this.mathBoxes.push(newBox)
      this.saveCurrentPageData()
    },
    addNewTextBox() {
      const newBox = {
        id: 'text_' + Date.now(),
        x: 80 + Math.random() * 40,
        y: 140 + Math.random() * 40,
        width: this.toolSettings.textBox?.width || 260,
        content: '',
        bgColor: this.toolSettings.textBox?.bgColor || 'transparent',
        bgOpacity: this.toolSettings.textBox?.bgOpacity !== undefined ? this.toolSettings.textBox.bgOpacity : 0,
        textColor: this.toolSettings.textBox?.textColor || '#0f172a',
        fontSize: this.toolSettings.textBox?.fontSize || 15,
        isNew: true,
        zIndex: ++this.topZIndex
      }
      this.textNotes.push(newBox)
      this.saveCurrentPageData()
    },
    addNewVoiceMemo() {
      const newMemo = {
        id: 'voice_' + Date.now(),
        x: 80 + Math.random() * 40,
        y: 180 + Math.random() * 40,
        width: 280,
        audioBase64: null,
        duration: 0,
        createdAt: null,
        zIndex: ++this.topZIndex
      }
      this.voiceMemos.push(newMemo)
      this.saveCurrentPageData()
    },
    deleteMathBox(id) {
      this.mathBoxes = this.mathBoxes.filter((b) => b.id !== id)
      this.saveCurrentPageData()
    },
    deleteTextBox(id) {
      this.textNotes = this.textNotes.filter((t) => t.id !== id)
      this.saveCurrentPageData()
    },
    deleteVoiceMemo(id) {
      this.voiceMemos = this.voiceMemos.filter((v) => v.id !== id)
      this.saveCurrentPageData()
    },
    bringToFront(id) {
      this.topZIndex++
      const mb = this.mathBoxes.find((m) => m.id === id)
      if (mb) mb.zIndex = this.topZIndex
      const tb = this.textNotes.find((t) => t.id === id)
      if (tb) tb.zIndex = this.topZIndex
      const vm = this.voiceMemos.find((v) => v.id === id)
      if (vm) vm.zIndex = this.topZIndex
    },
    // Drawing Logic
    getPointerPos(e) {
      const canvas = this.$refs.drawingCanvas
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    },
    handlePointerDown(e) {
      if (!['pen', 'highlighter', 'eraser'].includes(this.activeTool)) return
      e.preventDefault()
      this.isDrawing = true
      const pos = this.getPointerPos(e)

      if (this.activeTool === 'eraser') {
        this.eraseAt(pos)
        return
      }

      this.currentStroke = {
        tool: this.activeTool,
        color: this.activeTool === 'pen' ? this.toolSettings.pen.color : this.toolSettings.highlighter.color,
        width: this.activeTool === 'pen' ? this.toolSettings.pen.strokeWidth : this.toolSettings.highlighter.strokeWidth,
        opacity: this.activeTool === 'pen' ? 1 : (this.toolSettings.highlighter.opacity || 0.4),
        straightLine: this.activeTool === 'highlighter' && this.toolSettings.highlighter.straightLine,
        points: [pos]
      }
    },
    handlePointerMove(e) {
      if (!this.isDrawing) return
      e.preventDefault()
      const pos = this.getPointerPos(e)

      if (this.activeTool === 'eraser') {
        this.eraseAt(pos)
        return
      }

      if (this.currentStroke) {
        if (this.currentStroke.straightLine) {
          // Snap alla linea orizzontale
          const start = this.currentStroke.points[0]
          this.currentStroke.points = [start, { x: pos.x, y: start.y }]
        } else {
          this.currentStroke.points.push(pos)
        }
        this.redrawCanvas()
      }
    },
    handlePointerUp(e) {
      if (!this.isDrawing) return
      this.isDrawing = false
      if (this.currentStroke && this.currentStroke.points.length > 0) {
        this.strokes.push(this.currentStroke)
        this.undoStack.push({ type: 'add_stroke', stroke: this.currentStroke })
        this.redoStack = []
        this.currentStroke = null
        this.redrawCanvas()
        this.saveCurrentPageData()
      }
    },
    eraseAt(pos) {
      const mode = this.toolSettings.eraser.mode || 'stroke'
      if (mode === 'stroke') {
        const initialCount = this.strokes.length
        this.strokes = this.strokes.filter((stroke) => {
          return !stroke.points.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < 20)
        })
        if (this.strokes.length !== initialCount) {
          this.redrawCanvas()
          this.saveCurrentPageData()
        }
      } else {
        // Radius erase
        const radius = this.toolSettings.eraser.radius || 15
        const canvas = this.$refs.drawingCanvas
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    },
    clearAllStrokes() {
      if (this.strokes.length === 0) return
      this.undoStack.push({ type: 'clear', previousStrokes: [...this.strokes] })
      this.strokes = []
      this.redrawCanvas()
      this.saveCurrentPageData()
    },
    redrawCanvas() {
      const canvas = this.$refs.drawingCanvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      const allStrokes = this.currentStroke ? [...this.strokes, this.currentStroke] : this.strokes

      allStrokes.forEach((stroke) => {
        if (!stroke.points || stroke.points.length === 0) return
        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = stroke.width

        if (stroke.tool === 'highlighter') {
          ctx.globalAlpha = stroke.opacity || 0.4
          ctx.strokeStyle = stroke.color
          ctx.globalCompositeOperation = 'multiply'
        } else {
          ctx.globalAlpha = 1
          ctx.strokeStyle = stroke.color
          ctx.globalCompositeOperation = 'source-over'
        }

        ctx.beginPath()
        if (stroke.points.length === 1) {
          ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2)
          ctx.fillStyle = stroke.color
          ctx.fill()
        } else {
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
          }
          ctx.stroke()
        }
        ctx.restore()
      })
    },
    undo() {
      if (this.undoStack.length === 0) return
      const action = this.undoStack.pop()
      if (action.type === 'add_stroke') {
        const removed = this.strokes.pop()
        this.redoStack.push({ type: 'add_stroke', stroke: removed })
      } else if (action.type === 'clear') {
        this.redoStack.push({ type: 'clear', strokes: [...this.strokes] })
        this.strokes = action.previousStrokes || []
      }
      this.redrawCanvas()
      this.saveCurrentPageData()
    },
    redo() {
      if (this.redoStack.length === 0) return
      const action = this.redoStack.pop()
      if (action.type === 'add_stroke') {
        this.strokes.push(action.stroke)
        this.undoStack.push({ type: 'add_stroke', stroke: action.stroke })
      } else if (action.type === 'clear') {
        this.undoStack.push({ type: 'clear', previousStrokes: [...this.strokes] })
        this.strokes = action.strokes || []
      }
      this.redrawCanvas()
      this.saveCurrentPageData()
    },
    async saveCurrentPageData() {
      const data = {
        strokes: this.strokes,
        textNotes: this.textNotes,
        mathBoxes: this.mathBoxes,
        voiceMemos: this.voiceMemos,
        sheetStyle: this.sheetStyle
      }
      await noteStorage.savePageNotes(this.itemId, this.pageKey, data)
      this.triggerDebouncedSync()
    },
    triggerDebouncedSync() {
      if (this._syncTimer) clearTimeout(this._syncTimer)
      this._syncTimer = setTimeout(() => {
        const client = this.$nativeHttp || this.$axios
        if (client && this.userId) {
          noteStorage.syncWithServer(this.userId, client)
        }
      }, 2500)
    },
    async loadCurrentPageData() {
      const data = await noteStorage.loadPageNotes(this.itemId, this.pageKey)
      if (data) {
        this.strokes = data.strokes || []
        this.textNotes = data.textNotes || []
        this.mathBoxes = data.mathBoxes || []
        this.voiceMemos = data.voiceMemos || []
        if (data.sheetStyle && !this.toolSettings.sheetStyle?.applyToAll) {
          this.sheetStyle = { ...this.sheetStyle, ...data.sheetStyle }
        }
      } else {
        this.strokes = []
        this.textNotes = []
        this.mathBoxes = []
        this.voiceMemos = []
        if (this.initialSheetStyle) {
          this.sheetStyle = { ...this.sheetStyle, ...this.initialSheetStyle }
        } else if (this.itemId && this.itemId.startsWith('nb_')) {
          const notebooks = await noteStorage.getUserNotebooks(this.userId)
          const nb = notebooks.find((n) => n.id === this.itemId)
          if (nb && nb.sheetStyle) {
            this.sheetStyle = { ...this.sheetStyle, ...nb.sheetStyle }
          }
        }
      }
      this.undoStack = []
      this.redoStack = []
      this.$nextTick(() => {
        this.redrawCanvas()
      })
    }
  }
}
</script>

<style scoped>
.note-studio-overlay {
  touch-action: none;
}
</style>
