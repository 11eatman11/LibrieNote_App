<template>
  <div
    class="text-box absolute select-none rounded-lg"
    :class="[
      isDragging || isResizing ? 'transition-none pointer-events-auto' : 'transition-[background-color,border-color,box-shadow,opacity] duration-150',
      isEditing ? editorContainerClass : 'border-transparent shadow-none',
      isHovered && !isEditing ? (isDarkTheme ? 'border-dashed border-blue-400/40 bg-blue-500/5' : 'border-dashed border-blue-500/40 bg-blue-500/5') : ''
    ]"
    :style="boxStyle"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @mousedown="bringToFront"
    @touchstart="bringToFront"
    @click="onBoxClick"
  >
    <!-- Angolo in Alto a Sinistra: Maniglia Esclusiva di Spostamento (Mouse & Touch) -->
    <div
      v-if="isEditing || isHovered || isDragging"
      class="top-left-drag-handle absolute -top-3 -left-3 w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg flex items-center justify-center cursor-move z-30 transition-transform hover:scale-110 active:scale-95 touch-none select-none border border-white/40"
      title="Tieni premuto qui con mouse o dito per spostare la casella"
      @mousedown.stop.prevent="startDrag"
      @touchstart.stop.prevent="startTouchDrag"
    >
      <span class="material-symbols text-xs pointer-events-none">drag_pan</span>
    </div>

    <!-- Angolo in Basso a Destra: Maniglia di Ridimensionamento / Ingrandimento (Mouse & Touch) -->
    <div
      v-if="isEditing || isHovered || isResizing"
      class="bottom-right-resize-handle absolute -bottom-2.5 -right-2.5 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg flex items-center justify-center cursor-nwse-resize z-30 transition-transform hover:scale-110 active:scale-95 touch-none select-none border border-white/40"
      title="Trascina per ingrandire o rimpicciolire la casella"
      @mousedown.stop.prevent="startResize"
      @touchstart.stop.prevent="startTouchResize"
    >
      <span class="material-symbols text-xxs pointer-events-none">aspect_ratio</span>
    </div>

    <!-- Header & Controls (visibili in editing o hover) -->
    <div
      v-if="isEditing || isHovered"
      class="flex items-center justify-between px-2.5 py-1 rounded-t-lg select-none text-xs transition-colors"
      :class="headerClass"
      @mousedown.stop
      @touchstart.stop
    >
      <div class="flex items-center space-x-1 font-semibold pl-2">
        <span class="font-sans text-xxs opacity-90">📝 Testo</span>
      </div>
      <div class="flex items-center space-x-1">
        <!-- Palette & font size & background -->
        <button
          type="button"
          @click.stop="showConfig = !showConfig"
          class="p-1 rounded transition-colors"
          :class="showConfig ? 'bg-blue-500/20 text-blue-500 font-bold' : 'hover:bg-black/10 dark:hover:bg-white/20 opacity-80 hover:opacity-100'"
          title="Personalizza colore, sfondo, opacità e dimensioni"
        >
          <span class="material-symbols text-xs">palette</span>
        </button>
        <!-- Fine editing -->
        <button
          v-if="isEditing"
          type="button"
          @click.stop="finishEditing"
          class="p-1 hover:bg-emerald-500/20 rounded text-emerald-600 dark:text-emerald-400 font-bold transition-colors"
          title="Conferma testo"
        >
          <span class="material-symbols text-xs">check</span>
        </button>
        <!-- Delete -->
        <button
          type="button"
          @click.stop="$emit('delete', item.id)"
          class="p-1 hover:bg-red-500/20 rounded text-red-600 dark:text-red-400 transition-colors"
          title="Elimina nota"
        >
          <span class="material-symbols text-xs">close</span>
        </button>
      </div>
    </div>

    <!-- Content Area in Editing Mode -->
    <div v-if="isEditing" class="p-2.5 rounded-b-lg transition-colors">
      <textarea
        ref="textArea"
        v-model="item.content"
        @input="save"
        @blur="handleBlur"
        @keydown.esc="finishEditing"
        placeholder="Scrivi qui il tuo testo..."
        class="w-full rounded-md p-2 outline-none resize-y font-sans transition-all border"
        :class="textareaClass"
        :style="{
          color: item.textColor || defaultTextColor,
          fontSize: (item.fontSize || 15) + 'px',
          minHeight: '52px'
        }"
        rows="2"
        @mousedown.stop
        @touchstart.stop
      ></textarea>
    </div>

    <!-- Clean Text Display Mode (Solo il testo scritto, senza riquadri o bordi) -->
    <div
      v-else
      class="p-1 cursor-text min-w-[30px] rounded transition-all select-text"
      @click.stop="startEditing"
    >
      <p
        class="whitespace-pre-wrap font-sans leading-snug font-medium"
        :style="{
          color: item.textColor || defaultTextColor,
          fontSize: (item.fontSize || 15) + 'px'
        }"
      >
        {{ item.content }}
      </p>
    </div>

    <!-- Config Panel (Colori, Sfondo & Opacità & Dimensioni) -->
    <div
      v-if="showConfig && isEditing"
      class="config-panel p-3 text-xs rounded-b-lg border-t space-y-3 shadow-xl transition-colors"
      :class="configPanelClass"
      @mousedown.stop
      @touchstart.stop
    >
      <!-- Dimensione Testo & Larghezza Casella -->
      <div class="flex items-center justify-between">
        <span class="font-medium opacity-80">Dimensione Testo:</span>
        <div class="flex items-center space-x-1.5">
          <button
            type="button"
            class="px-2 py-0.5 rounded font-mono text-xs font-bold border transition-colors"
            :class="btnStyleClass"
            @click="adjustFontSize(-2)"
          >
            A-
          </button>
          <span class="font-mono text-xs w-6 text-center font-bold text-blue-500">{{ item.fontSize || 15 }}</span>
          <button
            type="button"
            class="px-2 py-0.5 rounded font-mono text-xs font-bold border transition-colors"
            :class="btnStyleClass"
            @click="adjustFontSize(2)"
          >
            A+
          </button>
        </div>
      </div>

      <!-- Larghezza Casella (Ingrandimento) -->
      <div class="flex items-center justify-between">
        <span class="font-medium opacity-80">Larghezza:</span>
        <div class="flex items-center space-x-1.5">
          <button
            type="button"
            class="px-2 py-0.5 rounded font-mono text-xs font-bold border transition-colors"
            :class="btnStyleClass"
            @click="adjustWidth(-40)"
          >
            -
          </button>
          <span class="font-mono text-xs w-12 text-center font-bold text-blue-500">{{ item.width || 260 }}px</span>
          <button
            type="button"
            class="px-2 py-0.5 rounded font-mono text-xs font-bold border transition-colors"
            :class="btnStyleClass"
            @click="adjustWidth(40)"
          >
            +
          </button>
        </div>
      </div>

      <!-- Colore Testo -->
      <div class="flex items-center justify-between">
        <span class="font-medium opacity-80">Colore Testo:</span>
        <div class="flex items-center space-x-1.5">
          <div class="flex space-x-1">
            <button
              v-for="tc in textColors"
              :key="tc"
              type="button"
              class="w-4 h-4 rounded-full border border-black/20 dark:border-white/40 hover:scale-125 transition-transform"
              :class="{ 'ring-2 ring-blue-500': item.textColor === tc }"
              :style="{ backgroundColor: tc }"
              @click="onSelectTextColor(tc)"
            />
          </div>
          <!-- Custom color picker -->
          <label class="w-4 h-4 rounded-full border border-black/30 dark:border-white/60 cursor-pointer relative overflow-hidden flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-pink-500 hover:scale-125 transition-transform">
            <span class="material-symbols text-xxs text-white">colorize</span>
            <input type="color" :value="item.textColor || defaultTextColor" class="opacity-0 absolute inset-0 cursor-pointer" @input="onSelectTextColor($event.target.value)" />
          </label>
        </div>
      </div>

      <!-- Colore Sfondo -->
      <div class="flex items-center justify-between">
        <span class="font-medium opacity-80">Colore Sfondo:</span>
        <div class="flex items-center space-x-1.5">
          <!-- Pulsante Trasparente -->
          <button
            type="button"
            @click="setBgColor('transparent')"
            class="px-1.5 py-0.5 rounded text-xxs border transition-colors flex items-center space-x-0.5"
            :class="isBgTransparent ? 'bg-blue-600 border-blue-500 text-white font-bold' : btnStyleClass"
            title="Sfondo Trasparente"
          >
            <span class="material-symbols text-xxs">block</span>
            <span>Trasp.</span>
          </button>

          <!-- Palette Sfondi -->
          <div class="flex space-x-1">
            <button
              v-for="bg in bgColors"
              :key="bg"
              type="button"
              class="w-4 h-4 rounded-full border border-black/20 dark:border-white/40 hover:scale-125 transition-transform"
              :class="{ 'ring-2 ring-blue-500': item.bgColor === bg && !isBgTransparent }"
              :style="{ backgroundColor: bg }"
              @click="setBgColor(bg)"
            />
          </div>
          <!-- Custom bg color picker -->
          <label class="w-4 h-4 rounded-full border border-black/30 dark:border-white/60 cursor-pointer relative overflow-hidden flex items-center justify-center bg-gradient-to-tr from-yellow-400 to-emerald-400 hover:scale-125 transition-transform">
            <span class="material-symbols text-xxs text-white">colorize</span>
            <input type="color" :value="item.bgColor === 'transparent' ? '#fef08a' : item.bgColor" class="opacity-0 absolute inset-0 cursor-pointer" @input="onCustomBgColor($event.target.value)" />
          </label>
        </div>
      </div>

      <!-- Opacità Sfondo (visibile se sfondo non trasparente) -->
      <div v-if="!isBgTransparent" class="flex items-center justify-between pt-1 border-t border-black/10 dark:border-white/10">
        <span class="font-medium opacity-80">Opacità Sfondo:</span>
        <div class="flex items-center space-x-2">
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            :value="Math.round((item.bgOpacity !== undefined ? item.bgOpacity : 0.85) * 100)"
            @input="onOpacityChange($event.target.value / 100)"
            class="w-20 accent-blue-500 cursor-pointer h-1.5 bg-black/20 dark:bg-white/20 rounded-lg"
          />
          <span class="font-mono text-xs w-8 text-right font-bold text-blue-500">{{ Math.round((item.bgOpacity !== undefined ? item.bgOpacity : 0.85) * 100) }}%</span>
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
    },
    sheetStyle: {
      type: Object,
      default: () => null
    }
  },
  data() {
    return {
      isEditing: !this.item.content || this.item.content.trim() === '' || this.item.isNew === true,
      isHovered: false,
      showConfig: false,
      isDragging: false,
      isResizing: false,
      dragOffset: { x: 0, y: 0 },
      textColors: ['#0f172a', '#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706', '#ffffff'],
      bgColors: ['#fef08a', '#bae6fd', '#bbf7d0', '#fbcfe8', '#f1f5f9', '#1e293b']
    }
  },
  computed: {
    isDarkTheme() {
      if (this.sheetStyle?.background === 'dark') return true
      if (this.sheetStyle?.background === 'sepia') return false
      if (this.sheetStyle?.background === 'white') return false
      if (this.sheetStyle?.customColor) {
        const hex = this.sheetStyle.customColor.replace('#', '')
        if (hex.length === 6) {
          const r = parseInt(hex.substr(0, 2), 16)
          const g = parseInt(hex.substr(2, 2), 16)
          const b = parseInt(hex.substr(4, 2), 16)
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
          return lum < 0.5
        }
      }
      if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
        if (this.sheetStyle?.background === 'white' || this.sheetStyle?.background === 'sepia') return false
        return true
      }
      return false
    },
    isSepiaTheme() {
      return this.sheetStyle?.background === 'sepia'
    },
    defaultTextColor() {
      if (this.isDarkTheme) return '#f8fafc'
      if (this.isSepiaTheme) return '#2c1810'
      return '#0f172a'
    },
    editorContainerClass() {
      if (this.isDarkTheme) {
        return 'border border-blue-500/50 shadow-2xl bg-slate-900/98 text-slate-100'
      } else if (this.isSepiaTheme) {
        return 'border border-[#c7b28a] shadow-xl bg-[#fbf3e0]/98 text-[#2c1810]'
      } else {
        return 'border border-slate-300 shadow-xl bg-slate-50/98 text-slate-900'
      }
    },
    headerClass() {
      if (this.isDarkTheme) {
        return 'bg-black/60 text-white border-b border-slate-700'
      } else if (this.isSepiaTheme) {
        return 'bg-[#eedfc0] text-[#3d2c1d] border-b border-[#ddccaa]'
      } else {
        return 'bg-slate-200/80 text-slate-800 border-b border-slate-200'
      }
    },
    textareaClass() {
      if (this.isDarkTheme) {
        return 'bg-white/10 text-white border-white/20 placeholder-white/40 focus:border-blue-400 focus:bg-white/15'
      } else if (this.isSepiaTheme) {
        return 'bg-[#f4e8d0] text-[#2c1810] border-[#d8c59f] placeholder-[#8a7558] focus:border-amber-600 focus:bg-white'
      } else {
        return 'bg-white text-slate-900 border-slate-300 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
      }
    },
    configPanelClass() {
      if (this.isDarkTheme) {
        return 'bg-slate-950 text-white border-slate-800'
      } else if (this.isSepiaTheme) {
        return 'bg-[#ede0c2] text-[#2c1810] border-[#d8c59f]'
      } else {
        return 'bg-slate-100 text-slate-900 border-slate-200'
      }
    },
    btnStyleClass() {
      if (this.isDarkTheme) {
        return 'bg-white/15 hover:bg-white/25 text-white border-white/20'
      } else if (this.isSepiaTheme) {
        return 'bg-[#dfcead] hover:bg-[#d0bd9a] text-[#2c1810] border-[#cbb792]'
      } else {
        return 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
      }
    },
    isBgTransparent() {
      return !this.item.bgColor || this.item.bgColor === 'transparent' || this.item.bgOpacity === 0
    },
    computedBackground() {
      if (this.isEditing) return ''
      if (this.isBgTransparent) return 'transparent'
      const opacity = this.item.bgOpacity !== undefined ? this.item.bgOpacity : 0.85
      return this.hexToRgba(this.item.bgColor || '#fef08a', opacity)
    },
    boxStyle() {
      return {
        left: `${this.item.x || 60}px`,
        top: `${this.item.y || 120}px`,
        width: `${this.item.width || 260}px`,
        minWidth: this.isEditing ? '160px' : 'auto',
        maxWidth: '100%',
        backgroundColor: this.computedBackground,
        zIndex: this.item.zIndex || 20,
        willChange: this.isDragging ? 'left, top' : (this.isResizing ? 'width' : 'auto')
      }
    }
  },
  mounted() {
    if (this.isEditing) {
      this.$nextTick(() => {
        this.$refs.textArea?.focus()
      })
    }
  },
  methods: {
    hexToRgba(hex, opacity) {
      if (!hex || hex === 'transparent') return 'transparent'
      let c = hex.replace('#', '')
      if (c.length === 3) c = c.split('').map((x) => x + x).join('')
      const r = parseInt(c.substring(0, 2), 16) || 0
      const g = parseInt(c.substring(2, 4), 16) || 0
      const b = parseInt(c.substring(4, 6), 16) || 0
      return `rgba(${r}, ${g}, ${b}, ${opacity !== undefined ? opacity : 1})`
    },
    notifyStyleChange() {
      this.$emit('update-style', {
        textColor: this.item.textColor,
        bgColor: this.item.bgColor,
        bgOpacity: this.item.bgOpacity,
        fontSize: this.item.fontSize,
        width: this.item.width
      })
    },
    onSelectTextColor(tc) {
      this.item.textColor = tc
      this.save()
      this.notifyStyleChange()
    },
    setBgColor(bg) {
      this.item.bgColor = bg
      if (bg === 'transparent') {
        this.item.bgOpacity = 0
      } else if (!this.item.bgOpacity || this.item.bgOpacity === 0) {
        this.item.bgOpacity = 0.85
      }
      this.save()
      this.notifyStyleChange()
    },
    onCustomBgColor(val) {
      this.item.bgColor = val
      if (!this.item.bgOpacity || this.item.bgOpacity === 0) {
        this.item.bgOpacity = 0.85
      }
      this.save()
      this.notifyStyleChange()
    },
    onOpacityChange(val) {
      this.item.bgOpacity = val
      this.save()
      this.notifyStyleChange()
    },
    onBoxClick() {
      if (!this.isEditing) {
        this.startEditing()
      }
    },
    startEditing() {
      this.isEditing = true
      this.$nextTick(() => {
        this.$refs.textArea?.focus()
      })
    },
    finishEditing() {
      if (!this.item.content || this.item.content.trim() === '') {
        this.$emit('delete', this.item.id)
        return
      }
      this.item.isNew = false
      this.isEditing = false
      this.showConfig = false
      this.save()
    },
    handleBlur(e) {
      // Don't blur if relatedTarget is inside this element (e.g. clicking buttons, palette, resize handle)
      if (e?.relatedTarget && this.$el && this.$el.contains(e.relatedTarget)) {
        return
      }
      setTimeout(() => {
        if (!this.showConfig && !this.isDragging && !this.isResizing) {
          this.finishEditing()
        }
      }, 200)
    },
    save() {
      this.$emit('update', this.item)
    },
    bringToFront() {
      this.$emit('bring-to-front', this.item.id)
    },
    adjustFontSize(delta) {
      this.item.fontSize = Math.max(10, Math.min(48, (this.item.fontSize || 15) + delta))
      this.save()
      this.notifyStyleChange()
    },
    adjustWidth(delta) {
      this.item.width = Math.max(140, Math.min(900, (this.item.width || 260) + delta))
      this.save()
      this.notifyStyleChange()
    },
    startResize(e) {
      this.isResizing = true
      const startX = e.clientX
      const startWidth = this.item.width || 260
      let rafId = null

      const onMouseMove = (ev) => {
        if (!this.isResizing) return
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          const deltaX = ev.clientX - startX
          this.item.width = Math.max(140, Math.min(900, Math.round(startWidth + deltaX)))
        })
      }

      const onMouseUp = () => {
        this.isResizing = false
        if (rafId) cancelAnimationFrame(rafId)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        this.save()
        this.notifyStyleChange()
      }

      window.addEventListener('mousemove', onMouseMove, { passive: true })
      window.addEventListener('mouseup', onMouseUp)
    },
    startTouchResize(e) {
      if (!e.touches || e.touches.length === 0) return
      this.isResizing = true
      const startX = e.touches[0].clientX
      const startWidth = this.item.width || 260
      let rafId = null

      const onTouchMove = (ev) => {
        if (!this.isResizing || !ev.touches || ev.touches.length === 0) return
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          const deltaX = ev.touches[0].clientX - startX
          this.item.width = Math.max(140, Math.min(900, Math.round(startWidth + deltaX)))
        })
      }

      const onTouchEnd = () => {
        this.isResizing = false
        if (rafId) cancelAnimationFrame(rafId)
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', onTouchEnd)
        this.save()
        this.notifyStyleChange()
      }

      window.addEventListener('touchmove', onTouchMove, { passive: true })
      window.addEventListener('touchend', onTouchEnd)
    },
    startDrag(e) {
      this.isDragging = true
      this.dragOffset.x = e.clientX - (this.item.x || 60)
      this.dragOffset.y = e.clientY - (this.item.y || 120)
      let rafId = null

      const onMouseMove = (ev) => {
        if (!this.isDragging) return
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          this.item.x = Math.max(0, ev.clientX - this.dragOffset.x)
          this.item.y = Math.max(0, ev.clientY - this.dragOffset.y)
        })
      }

      const onMouseUp = () => {
        this.isDragging = false
        if (rafId) cancelAnimationFrame(rafId)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        this.save()
      }

      window.addEventListener('mousemove', onMouseMove, { passive: true })
      window.addEventListener('mouseup', onMouseUp)
    },
    startTouchDrag(e) {
      if (!e.touches || e.touches.length === 0) return
      const touch = e.touches[0]
      this.isDragging = true
      this.dragOffset.x = touch.clientX - (this.item.x || 60)
      this.dragOffset.y = touch.clientY - (this.item.y || 120)
      let rafId = null

      const onTouchMove = (ev) => {
        if (!this.isDragging || !ev.touches || ev.touches.length === 0) return
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          const t = ev.touches[0]
          this.item.x = Math.max(0, t.clientX - this.dragOffset.x)
          this.item.y = Math.max(0, t.clientY - this.dragOffset.y)
        })
      }

      const onTouchEnd = () => {
        this.isDragging = false
        if (rafId) cancelAnimationFrame(rafId)
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', onTouchEnd)
        this.save()
      }

      window.addEventListener('touchmove', onTouchMove, { passive: true })
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
