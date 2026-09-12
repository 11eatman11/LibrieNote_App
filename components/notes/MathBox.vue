<template>
  <div
    class="math-box absolute select-none rounded-lg"
    :class="[
      isDragging || isResizing ? 'transition-none pointer-events-auto' : 'transition-[background-color,border-color,box-shadow,opacity] duration-150',
      isEditing ? editorContainerClass : 'border-transparent shadow-none',
      isHovered && !isEditing ? (isDarkTheme ? 'border-dashed border-emerald-400/40 bg-emerald-500/5' : 'border-dashed border-emerald-500/40 bg-emerald-500/5') : ''
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
      class="top-left-drag-handle absolute -top-3 -left-3 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg flex items-center justify-center cursor-move z-30 transition-transform hover:scale-110 active:scale-95 touch-none select-none border border-white/40"
      title="Tieni premuto qui con mouse o dito per spostare la casella matematica"
      @mousedown.stop.prevent="startDrag"
      @touchstart.stop.prevent="startTouchDrag"
    >
      <span class="material-symbols text-xs pointer-events-none">drag_pan</span>
    </div>

    <!-- Angolo in Basso a Destra: Maniglia di Ridimensionamento / Ingrandimento (Mouse & Touch) -->
    <div
      v-if="isEditing || isHovered || isResizing"
      class="bottom-right-resize-handle absolute -bottom-2.5 -right-2.5 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg flex items-center justify-center cursor-nwse-resize z-30 transition-transform hover:scale-110 active:scale-95 touch-none select-none border border-white/40"
      title="Trascina per ingrandire o rimpicciolire la casella"
      @mousedown.stop.prevent="startResize"
      @touchstart.stop.prevent="startTouchResize"
    >
      <span class="material-symbols text-xxs pointer-events-none">aspect_ratio</span>
    </div>

    <!-- Header / Controls Bar (visibile in editing o hover) -->
    <div
      v-if="isEditing || isHovered"
      class="flex items-center justify-between px-2.5 py-1 rounded-t-lg select-none text-xs transition-colors"
      :class="headerClass"
      @mousedown.stop
      @touchstart.stop
    >
      <div class="flex items-center space-x-1 font-semibold pl-2">
        <span class="font-mono text-xxs opacity-90">🧮 Math</span>
      </div>
      <div class="flex items-center space-x-1">
        <!-- Display mode toggle -->
        <button
          type="button"
          @click.stop="cycleDisplayMode"
          class="p-1 rounded text-xxs font-mono transition-colors"
          :class="btnStyleClass"
          :title="'Modalità: ' + currentModeLabel"
        >
          {{ modeIcon }}
        </button>
        <!-- Palette & font size & background -->
        <button
          type="button"
          @click.stop="showConfig = !showConfig; if(showConfig) showDialpad = false"
          class="p-1 rounded transition-colors"
          :class="showConfig ? 'bg-emerald-500/20 text-emerald-500 font-bold' : 'hover:bg-black/10 dark:hover:bg-white/20 opacity-80 hover:opacity-100'"
          title="Personalizza colore, sfondo, opacità e dimensioni"
        >
          <span class="material-symbols text-xs">palette</span>
        </button>
        <!-- Tastierino Dialpad -->
        <button
          type="button"
          @click.stop="showDialpad = !showDialpad; if(showDialpad) showConfig = false"
          class="p-1 rounded transition-colors"
          :class="showDialpad ? 'bg-amber-500/20 text-amber-500 font-bold' : 'hover:bg-black/10 dark:hover:bg-white/20 opacity-80 hover:opacity-100'"
          title="Tastierino Matematico"
        >
          <span class="material-symbols text-xs">dialpad</span>
        </button>
        <!-- Fine editing -->
        <button
          v-if="isEditing"
          type="button"
          @click.stop="finishEditing"
          class="p-1 hover:bg-emerald-500/20 rounded text-emerald-600 dark:text-emerald-400 font-bold transition-colors"
          title="Conferma formula"
        >
          <span class="material-symbols text-xs">check</span>
        </button>
        <!-- Elimina casella -->
        <button
          type="button"
          @click.stop="$emit('delete', item.id)"
          class="p-1 hover:bg-red-500/20 rounded text-red-600 dark:text-red-400 transition-colors"
          title="Elimina casella"
        >
          <span class="material-symbols text-xs">close</span>
        </button>
      </div>
    </div>

    <!-- Body in Editing Mode -->
    <div v-if="isEditing" class="p-2.5 flex flex-col space-y-2 rounded-b-lg transition-colors">
      <!-- Input formula -->
      <div
        class="flex items-center rounded-md px-2 py-1.5 border transition-all"
        :class="inputClass"
      >
        <span class="text-xs text-emerald-500 mr-1.5 font-mono font-bold">f(x):</span>
        <input
          ref="formulaInput"
          v-model="item.formula"
          @input="evaluate"
          @blur="handleBlur"
          @keydown.enter="finishEditing"
          @keydown.esc="finishEditing"
          type="text"
          placeholder="es. 150 * 1.22 + sin(30 deg)"
          class="w-full bg-transparent outline-none text-sm font-mono font-medium"
          :style="{ color: item.textColor || defaultTextColor }"
          @mousedown.stop
          @touchstart.stop
        />
      </div>

      <!-- Risultato live -->
      <div class="flex items-baseline justify-between pt-0.5 px-1 font-mono">
        <span class="text-xxs opacity-70 font-semibold">Risultato:</span>
        <span class="text-sm font-bold tracking-wide text-emerald-600 dark:text-emerald-400">{{ evaluatedResult || '0' }}</span>
      </div>
    </div>

    <!-- Clean Display Mode (Solo la formula/risultato scritto, senza riquadri o bordi) -->
    <div
      v-else
      class="p-1 cursor-pointer font-mono font-bold select-text tracking-wide rounded transition-all"
      :style="{ color: item.textColor || defaultTextColor, fontSize: (item.fontSize || 16) + 'px' }"
      @click.stop="startEditing"
    >
      <span v-if="item.displayMode === 'both'">
        {{ item.formula }} = {{ evaluatedResult || '0' }}
      </span>
      <span v-else-if="item.displayMode === 'formula'">
        {{ item.formula }}
      </span>
      <span v-else>
        = {{ evaluatedResult || '0' }}
      </span>
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
          <span class="font-mono text-xs w-6 text-center font-bold text-emerald-500">{{ item.fontSize || 16 }}</span>
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
          <span class="font-mono text-xs w-12 text-center font-bold text-emerald-500">{{ item.width || 280 }}px</span>
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

      <!-- Colore Formula / Risultato -->
      <div class="flex items-center justify-between">
        <span class="font-medium opacity-80">Colore Testo:</span>
        <div class="flex items-center space-x-1.5">
          <div class="flex space-x-1">
            <button
              v-for="tc in mathColors"
              :key="tc"
              type="button"
              class="w-4 h-4 rounded-full border border-black/20 dark:border-white/40 hover:scale-125 transition-transform"
              :class="{ 'ring-2 ring-emerald-500': item.textColor === tc }"
              :style="{ backgroundColor: tc }"
              @click="onSelectTextColor(tc)"
            />
          </div>
          <!-- Custom color picker -->
          <label class="w-4 h-4 rounded-full border border-black/30 dark:border-white/60 cursor-pointer relative overflow-hidden flex items-center justify-center bg-gradient-to-tr from-emerald-500 to-cyan-500 hover:scale-125 transition-transform">
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
            :class="isBgTransparent ? 'bg-emerald-600 border-emerald-500 text-white font-bold' : btnStyleClass"
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
              :class="{ 'ring-2 ring-emerald-500': item.bgColor === bg && !isBgTransparent }"
              :style="{ backgroundColor: bg }"
              @click="setBgColor(bg)"
            />
          </div>
          <!-- Custom bg color picker -->
          <label class="w-4 h-4 rounded-full border border-black/30 dark:border-white/60 cursor-pointer relative overflow-hidden flex items-center justify-center bg-gradient-to-tr from-emerald-400 to-teal-400 hover:scale-125 transition-transform">
            <span class="material-symbols text-xxs text-white">colorize</span>
            <input type="color" :value="item.bgColor === 'transparent' ? '#bbf7d0' : item.bgColor" class="opacity-0 absolute inset-0 cursor-pointer" @input="onCustomBgColor($event.target.value)" />
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
            class="w-20 accent-emerald-500 cursor-pointer h-1.5 bg-black/20 dark:bg-white/20 rounded-lg"
          />
          <span class="font-mono text-xs w-8 text-right font-bold text-emerald-500">{{ Math.round((item.bgOpacity !== undefined ? item.bgOpacity : 0.85) * 100) }}%</span>
        </div>
      </div>
    </div>

    <!-- Tastierino Matematico Virtuale (Dialpad) in Editing Mode -->
    <div
      v-if="showDialpad && isEditing"
      class="dialpad-grid grid grid-cols-5 gap-1 p-2 rounded-b-lg border-t text-xs font-mono select-none transition-colors"
      :class="dialpadClass"
      @mousedown.stop
      @touchstart.stop
    >
      <button
        v-for="btn in dialpadButtons"
        :key="btn.label"
        type="button"
        @click="insertSymbol(btn.insert)"
        class="p-1.5 rounded text-center transition-colors font-semibold"
        :class="btn.class || dialpadBtnClass"
      >
        {{ btn.label }}
      </button>
      <button
        type="button"
        @click="backspace"
        class="p-1.5 rounded text-center bg-red-600/20 hover:bg-red-600/40 text-red-600 dark:text-red-300 font-bold"
        title="Cancella carattere"
      >
        ⌫
      </button>
      <button
        type="button"
        @click="clearFormula"
        class="p-1.5 rounded text-center bg-red-600/30 hover:bg-red-600/50 text-red-700 dark:text-white font-bold"
        title="Cancella tutto"
      >
        C
      </button>
    </div>
  </div>
</template>

<script>
import { evaluateExpression } from '@/services/mathEngine'

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
      isEditing: !this.item.formula || this.item.formula.trim() === '' || this.item.isNew === true,
      isHovered: false,
      showConfig: false,
      showDialpad: false,
      evaluatedResult: '',
      isDragging: false,
      isResizing: false,
      dragOffset: { x: 0, y: 0 },
      mathColors: ['#059669', '#0f172a', '#2563eb', '#dc2626', '#7c3aed', '#d97706', '#ffffff'],
      bgColors: ['#bbf7d0', '#bae6fd', '#fef08a', '#fbcfe8', '#f1f5f9', '#1e293b'],
      dialpadButtons: [
        { label: 'π', insert: 'pi' },
        { label: 'e', insert: 'e' },
        { label: '√x', insert: 'sqrt(' },
        { label: '∛x', insert: 'cbrt(' },
        { label: 'xʸ', insert: '^' },
        { label: 'sin', insert: 'sin(' },
        { label: 'cos', insert: 'cos(' },
        { label: 'tan', insert: 'tan(' },
        { label: 'deg', insert: ' deg' },
        { label: 'ln', insert: 'ln(' },
        { label: 'log', insert: 'log10(' },
        { label: 'x!', insert: '!' },
        { label: '%', insert: '%' },
        { label: '(', insert: '(' },
        { label: ')', insert: ')' },
        { label: '7', insert: '7', class: 'btn-num' },
        { label: '8', insert: '8', class: 'btn-num' },
        { label: '9', insert: '9', class: 'btn-num' },
        { label: '/', insert: ' / ', class: 'bg-emerald-600/30 text-emerald-800 dark:text-emerald-200 font-bold' },
        { label: '*', insert: ' * ', class: 'bg-emerald-700/50 text-emerald-200' },
        { label: '4', insert: '4', class: 'btn-num' },
        { label: '5', insert: '5', class: 'btn-num' },
        { label: '6', insert: '6', class: 'btn-num' },
        { label: '-', insert: ' - ', class: 'bg-emerald-600/30 text-emerald-800 dark:text-emerald-200 font-bold' },
        { label: '+', insert: ' + ', class: 'bg-emerald-600/30 text-emerald-800 dark:text-emerald-200 font-bold' },
        { label: '1', insert: '1', class: 'btn-num' },
        { label: '2', insert: '2', class: 'btn-num' },
        { label: '3', insert: '3', class: 'btn-num' },
        { label: '0', insert: '0', class: 'btn-num col-span-2' },
        { label: '.', insert: '.' }
      ]
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
      if (this.isDarkTheme) return '#34d399'
      if (this.isSepiaTheme) return '#065f46'
      return '#059669'
    },
    editorContainerClass() {
      if (this.isDarkTheme) {
        return 'border border-emerald-500/50 shadow-2xl bg-slate-900/98 text-slate-100'
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
    inputClass() {
      if (this.isDarkTheme) {
        return 'bg-white/10 text-white border-white/20 focus-within:border-emerald-400 focus-within:bg-white/15'
      } else if (this.isSepiaTheme) {
        return 'bg-[#f4e8d0] text-[#2c1810] border-[#d8c59f] focus-within:border-emerald-600 focus-within:bg-white'
      } else {
        return 'bg-white text-slate-900 border-slate-300 focus-within:border-emerald-500 focus-within:bg-white'
      }
    },
    dialpadClass() {
      if (this.isDarkTheme) {
        return 'bg-slate-950 text-white border-slate-800'
      } else if (this.isSepiaTheme) {
        return 'bg-[#ede0c2] text-[#2c1810] border-[#d8c59f]'
      } else {
        return 'bg-slate-100 text-slate-900 border-slate-200'
      }
    },
    dialpadBtnClass() {
      if (this.isDarkTheme) {
        return 'bg-white/10 hover:bg-white/25 active:bg-emerald-600/60 text-white'
      } else if (this.isSepiaTheme) {
        return 'bg-[#dfcead] hover:bg-[#d0bd9a] active:bg-emerald-600/60 text-[#2c1810]'
      } else {
        return 'bg-slate-200 hover:bg-slate-300 active:bg-emerald-600/60 text-slate-800'
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
      return this.hexToRgba(this.item.bgColor || '#bbf7d0', opacity)
    },
    boxStyle() {
      return {
        left: `${this.item.x || 60}px`,
        top: `${this.item.y || 100}px`,
        width: `${this.item.width || 280}px`,
        minWidth: this.isEditing ? '180px' : 'auto',
        maxWidth: '100%',
        backgroundColor: this.computedBackground,
        zIndex: this.item.zIndex || 20,
        willChange: this.isDragging ? 'left, top' : (this.isResizing ? 'width' : 'auto')
      }
    },
    modeIcon() {
      if (this.item.displayMode === 'result') return '=res'
      if (this.item.displayMode === 'formula') return 'f(x)'
      return 'f(x)='
    },
    currentModeLabel() {
      if (this.item.displayMode === 'result') return 'Solo Risultato'
      if (this.item.displayMode === 'formula') return 'Solo Formula'
      return 'Formula e Risultato'
    }
  },
  watch: {
    'item.formula'() {
      this.evaluate()
    }
  },
  mounted() {
    this.evaluate()
    if (this.isEditing) {
      this.$nextTick(() => {
        this.$refs.formulaInput?.focus()
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
        width: this.item.width,
        displayMode: this.item.displayMode
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
    adjustFontSize(delta) {
      this.item.fontSize = Math.max(10, Math.min(48, (this.item.fontSize || 16) + delta))
      this.save()
      this.notifyStyleChange()
    },
    adjustWidth(delta) {
      this.item.width = Math.max(140, Math.min(900, (this.item.width || 280) + delta))
      this.save()
      this.notifyStyleChange()
    },
    evaluate() {
      this.evaluatedResult = evaluateExpression(this.item.formula || '')
      this.save()
    },
    onBoxClick() {
      if (!this.isEditing) {
        this.startEditing()
      }
    },
    startEditing() {
      this.isEditing = true
      this.$nextTick(() => {
        this.$refs.formulaInput?.focus()
      })
    },
    finishEditing() {
      if (!this.item.formula || this.item.formula.trim() === '') {
        this.$emit('delete', this.item.id)
        return
      }
      this.item.isNew = false
      this.isEditing = false
      this.showDialpad = false
      this.showConfig = false
      this.save()
    },
    handleBlur(e) {
      // Don't blur if relatedTarget is inside this element (e.g. clicking dialpad, buttons, color picker, resize handle)
      if (e?.relatedTarget && this.$el && this.$el.contains(e.relatedTarget)) {
        return
      }
      setTimeout(() => {
        if (!this.showDialpad && !this.showConfig && !this.isDragging && !this.isResizing) {
          this.finishEditing()
        }
      }, 200)
    },
    save() {
      this.$emit('update', this.item)
    },
    cycleDisplayMode() {
      const modes = ['both', 'result', 'formula']
      const currentIdx = modes.indexOf(this.item.displayMode || 'both')
      this.item.displayMode = modes[(currentIdx + 1) % modes.length]
      this.save()
      this.notifyStyleChange()
    },
    insertSymbol(sym) {
      this.item.formula = (this.item.formula || '') + sym
      this.evaluate()
      this.$nextTick(() => {
        this.$refs.formulaInput?.focus()
      })
    },
    backspace() {
      if (this.item.formula && this.item.formula.length > 0) {
        this.item.formula = this.item.formula.slice(0, -1)
        this.evaluate()
      }
    },
    clearFormula() {
      this.item.formula = ''
      this.evaluate()
    },
    bringToFront() {
      this.$emit('bring-to-front', this.item.id)
    },
    startResize(e) {
      this.isResizing = true
      const startX = e.clientX
      const startWidth = this.item.width || 280
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
      const startWidth = this.item.width || 280
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
      this.dragOffset.y = e.clientY - (this.item.y || 100)
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
      this.dragOffset.y = touch.clientY - (this.item.y || 100)
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
.btn-num {
  background-color: rgba(0, 0, 0, 0.08);
}
.dark .btn-num {
  background-color: rgba(255, 255, 255, 0.15);
}
</style>
