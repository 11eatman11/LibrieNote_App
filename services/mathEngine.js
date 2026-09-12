/**
 * Motore di calcolo matematico deterministico e sicuro per Libri & Note
 */

export function evaluateExpression(expr) {
  if (!expr || typeof expr !== 'string') return ''
  
  let cleaned = expr.trim()
  if (!cleaned) return ''

  try {
    // 1. Gestione gradi in trigonometria: es. 30 deg -> (30 * __PI__ / 180)
    cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*deg\b/gi, '($1 * __PI__ / 180)')

    // 2. Sostituzione sicura e atomica di funzioni e costanti in un unico passaggio
    cleaned = cleaned.replace(/\b(log10|log2|sqrt|cbrt|sin|cos|tan|ln|log|abs|phi|pi|e)\b/gi, (match) => {
      const m = match.toLowerCase()
      switch (m) {
        case 'pi': return 'Math.PI'
        case 'e': return 'Math.E'
        case 'phi': return '((1 + Math.sqrt(5)) / 2)'
        case 'sqrt': return 'Math.sqrt'
        case 'cbrt': return 'Math.cbrt'
        case 'sin': return 'Math.sin'
        case 'cos': return 'Math.cos'
        case 'tan': return 'Math.tan'
        case 'ln': return 'Math.log'
        case 'log10': return 'Math.log10'
        case 'log2': return 'Math.log2'
        case 'log': return 'Math.log10'
        case 'abs': return 'Math.abs'
        default: return match
      }
    })

    // Sostituzione token gradi
    cleaned = cleaned.replace(/__PI__/g, 'Math.PI')

    // 3. Gestione percentuali: es. 25% -> (25/100)
    cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)')

    // 4. Gestione potenze: x^y -> Math.pow(x, y)
    while (cleaned.includes('^')) {
      const powRegex = /([0-9.]+|\([0-9.+\-*/%^Math.PIE_ ]+\))\s*\^\s*([0-9.]+|\([0-9.+\-*/%^Math.PIE_ ]+\))/
      const match = cleaned.match(powRegex)
      if (!match) break
      cleaned = cleaned.replace(powRegex, `Math.pow(${match[1]}, ${match[2]})`)
    }

    // 5. Gestione fattoriale: es. 5! -> factorial(5)
    cleaned = cleaned.replace(/(\d+)!/g, (_, num) => {
      let n = parseInt(num, 10)
      if (n < 0 || n > 170) return 'Infinity'
      let f = 1
      for (let i = 2; i <= n; i++) f *= i
      return f.toString()
    })

    // 6. Sicurezza: verificare che contenga solo caratteri matematici ammessi
    const safeRegex = /^[0-9+\-*/().,MathPIEsqrtcbrtsincostanlogabspow \t]+$/i
    if (!safeRegex.test(cleaned)) {
      return 'Errore sintassi'
    }

    // 7. Valutazione sicura tramite Function
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${cleaned})`)()

    if (typeof result === 'number') {
      if (isNaN(result)) return 'Indefinito'
      if (!isFinite(result)) return result > 0 ? '+∞' : '-∞'
      // Arrotondamento elegante
      return Math.abs(result) < 1e-10 ? '0' : Number(result.toFixed(6)).toString()
    }
    return result != null ? String(result) : ''
  } catch (err) {
    return 'Errore'
  }
}
