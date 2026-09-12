<template>
  <div class="sheet-background absolute inset-0 pointer-events-none overflow-hidden transition-colors duration-300" :style="containerStyle">
    <!-- SVG Pattern & Template Layer -->
    <svg class="w-full h-full absolute inset-0" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <!-- Griglia Quadretti Standard 24px (5mm) -->
        <pattern id="pat-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" :stroke="lineColor" stroke-width="0.8" />
        </pattern>

        <!-- Righe Standard 32px -->
        <pattern id="pat-ruled" width="100" height="32" patternUnits="userSpaceOnUse">
          <line x1="0" y1="32" x2="100" y2="32" :stroke="lineColor" stroke-width="0.9" />
        </pattern>

        <!-- Righe Universitarie Strette 24px -->
        <pattern id="pat-ruled-narrow" width="100" height="24" patternUnits="userSpaceOnUse">
          <line x1="0" y1="24" x2="100" y2="24" :stroke="lineColor" stroke-width="0.8" />
        </pattern>

        <!-- Puntinato Bullet Journal 24px -->
        <pattern id="pat-dot" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="1.2" :fill="lineColor" />
        </pattern>

        <!-- Carta Millimetrata (Doppia griglia 40px e 8px) -->
        <pattern id="pat-sub-millimeter" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 8 0 L 0 0 0 8" fill="none" :stroke="subLineColor" stroke-width="0.4" />
        </pattern>
        <pattern id="pat-millimeter" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="url(#pat-sub-millimeter)" />
          <path d="M 40 0 L 0 0 0 40" fill="none" :stroke="lineColor" stroke-width="1.1" />
        </pattern>

        <!-- Griglia Assonometrica / 3D Isometric (30°/60°) -->
        <pattern id="pat-isometric" width="60" height="103.923" patternUnits="userSpaceOnUse">
          <path d="M30 0 L60 17.32 L60 51.96 L30 69.28 L0 51.96 L0 17.32 Z M30 0 L30 69.28 M0 17.32 L60 51.96 M60 17.32 L0 51.96" fill="none" :stroke="lineColor" stroke-width="0.6" opacity="0.6" />
        </pattern>

        <!-- Blueprint Tecnico Reticolo -->
        <pattern id="pat-blueprint" width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="50" height="50" fill="none" stroke="#38bdf8" stroke-width="0.7" stroke-opacity="0.35" />
          <path d="M 10 0 L 10 50 M 20 0 L 20 50 M 30 0 L 30 50 M 40 0 L 40 50 M 0 10 L 50 10 M 0 20 L 50 20 M 0 30 L 50 30 M 0 40 L 50 40" fill="none" stroke="#38bdf8" stroke-width="0.3" stroke-opacity="0.2" />
        </pattern>

        <!-- Pentagramma Musicale (5 righe spaziate 8px, respiro 48px tra i righi = modulo 80px) -->
        <pattern id="pat-music" width="1000" height="80" patternUnits="userSpaceOnUse">
          <line x1="0" y1="16" x2="1000" y2="16" :stroke="lineColor" stroke-width="1" />
          <line x1="0" y1="24" x2="1000" y2="24" :stroke="lineColor" stroke-width="1" />
          <line x1="0" y1="32" x2="1000" y2="32" :stroke="lineColor" stroke-width="1" />
          <line x1="0" y1="40" x2="1000" y2="40" :stroke="lineColor" stroke-width="1" />
          <line x1="0" y1="48" x2="1000" y2="48" :stroke="lineColor" stroke-width="1" />
        </pattern>
      </defs>

      <!-- Riempimento Texture / Pattern Speciale -->
      <rect v-if="styleConfig.pattern === 'isometric'" width="100%" height="100%" fill="url(#pat-isometric)" />
      <rect v-else-if="styleConfig.pattern === 'blueprint'" width="100%" height="100%" fill="url(#pat-blueprint)" />
      <rect v-else-if="styleConfig.pattern === 'dots'" width="100%" height="100%" fill="url(#pat-dot)" />

      <!-- Riempimento Modello Foglio -->
      <rect v-if="styleConfig.template === 'grid'" width="100%" height="100%" fill="url(#pat-grid)" />
      <rect v-else-if="styleConfig.template === 'ruled'" width="100%" height="100%" fill="url(#pat-ruled)" />
      <rect v-else-if="styleConfig.template === 'ruled_narrow'" width="100%" height="100%" fill="url(#pat-ruled-narrow)" />
      <rect v-else-if="styleConfig.template === 'dot'" width="100%" height="100%" fill="url(#pat-dot)" />
      <rect v-else-if="styleConfig.template === 'millimeter'" width="100%" height="100%" fill="url(#pat-millimeter)" />
      <rect v-else-if="styleConfig.template === 'music'" width="100%" height="100%" fill="url(#pat-music)" />

      <!-- Template Metodo Cornell -->
      <g v-else-if="styleConfig.template === 'cornell'">
        <!-- Righe per l'area centrale -->
        <rect x="180" y="60" width="100%" height="calc(100% - 200px)" fill="url(#pat-ruled)" />
        <!-- Linea divisoria verticale colonna sinistra (parole chiave) -->
        <line x1="180" y1="0" x2="180" y2="100%" :stroke="accentLineColor" stroke-width="1.8" stroke-dasharray="4,4" />
        <!-- Linea orizzontale intestazione superiore -->
        <line x1="0" y1="60" x2="100%" y2="60" :stroke="accentLineColor" stroke-width="1.5" />
        <!-- Linea orizzontale sezione inferiore (riassunto) -->
        <line x1="0" y1="calc(100% - 140px)" x2="100%" y2="calc(100% - 140px)" :stroke="accentLineColor" stroke-width="1.8" />
        
        <!-- Etichette sezioni Cornell -->
        <text x="20" y="40" :fill="lineColor" font-size="12" font-weight="600" opacity="0.7">PAROLE CHIAVE & NOTE</text>
        <text x="200" y="40" :fill="lineColor" font-size="12" font-weight="600" opacity="0.7">APPUNTI DI LEZIONE / STUDIO</text>
        <text x="20" y="calc(100% - 110px)" :fill="lineColor" font-size="12" font-weight="600" opacity="0.7">RIASSUNTO FINALE</text>
      </g>
    </svg>
  </div>
</template>

<script>
export default {
  props: {
    styleConfig: {
      type: Object,
      default: () => ({
        background: 'white',
        customColor: '#ffffff',
        template: 'blank',
        pattern: 'none',
        customPatternImage: null
      })
    },
    isOverlayTransparent: {
      type: Boolean,
      default: true // Trasparente di default se sovrapposto al testo del reader
    }
  },
  computed: {
    bgColor() {
      if (this.isOverlayTransparent) return 'transparent'
      if (this.styleConfig.background === 'dark') return '#18191c'
      if (this.styleConfig.background === 'sepia') return '#fbf0d9'
      if (this.styleConfig.background === 'custom') return this.styleConfig.customColor || '#ffffff'
      return '#ffffff'
    },
    isDarkBg() {
      if (this.styleConfig.background === 'dark') return true
      if (this.styleConfig.background === 'sepia') return false
      if (this.styleConfig.background === 'white') return false
      // Calcolo luminosità per colore custom
      const hex = (this.styleConfig.customColor || '#ffffff').replace('#', '')
      if (hex.length === 6) {
        const r = parseInt(hex.substr(0, 2), 16)
        const g = parseInt(hex.substr(2, 2), 16)
        const b = parseInt(hex.substr(4, 2), 16)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return luminance < 0.5
      }
      return false
    },
    isSepiaBg() {
      return this.styleConfig.background === 'sepia'
    },
    lineColor() {
      if (this.isDarkBg) return 'rgba(226, 232, 240, 0.28)'
      if (this.isSepiaBg) return 'rgba(139, 90, 43, 0.28)'
      return 'rgba(51, 65, 85, 0.28)'
    },
    subLineColor() {
      if (this.isDarkBg) return 'rgba(226, 232, 240, 0.12)'
      if (this.isSepiaBg) return 'rgba(139, 90, 43, 0.12)'
      return 'rgba(51, 65, 85, 0.12)'
    },
    accentLineColor() {
      if (this.isDarkBg) return 'rgba(56, 189, 248, 0.5)'
      if (this.isSepiaBg) return 'rgba(180, 83, 9, 0.5)'
      return 'rgba(239, 68, 68, 0.45)'
    },
    containerStyle() {
      const styles = {
        backgroundColor: this.bgColor
      }
      if (this.styleConfig.customPatternImage) {
        styles.backgroundImage = `url(${this.styleConfig.customPatternImage})`
        styles.backgroundRepeat = 'repeat'
      } else if (this.styleConfig.pattern === 'parchment') {
        styles.backgroundImage = `radial-gradient(circle, rgba(200, 160, 110, 0.15) 10%, transparent 11%), radial-gradient(circle at 50% 50%, rgba(180, 140, 90, 0.1) 5%, transparent 6%)`
        styles.backgroundSize = '20px 20px'
      }
      return styles
    }
  }
}
</script>

<style scoped>
.sheet-background {
  pointer-events: none;
  user-select: none;
}
</style>
