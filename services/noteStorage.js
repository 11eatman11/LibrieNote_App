/**
 * Servizio di memorizzazione persistente per Studio Note (LocalStorage + IndexedDB)
 * Supporta:
 * - Impostazioni strumenti (penna, evidenziatore, ecc.)
 * - Note e tratti per pagina/documento
 * - Taccuini e Note personali isolati per utente (userId)
 * - Cartelle e Sotto-cartelle gerarchiche per organizzazione note
 */

const STORAGE_KEY_SETTINGS = 'librie_note_tool_settings'
const DB_NAME = 'LibrieNoteStudioDB'
const DB_VERSION = 3
const STORE_NOTES = 'notes'
const STORE_NOTEBOOKS = 'user_notebooks'
const STORE_FOLDERS = 'user_folders'
const STORE_TOMBSTONES = 'user_tombstones'

export const DEFAULT_TOOL_SETTINGS = {
  activeTool: 'cursor', // Default cursore per navigazione e link
  pen: {
    strokeWidth: 2, // Default 2px come richiesto
    color: '#3b82f6',
    opacity: 1
  },
  highlighter: {
    strokeWidth: 16,
    color: '#facc15',
    opacity: 0.4,
    straightLine: false
  },
  eraser: {
    mode: 'stroke',
    radius: 15
  },
  sheetStyle: {
    background: 'white',
    customColor: '#ffffff',
    template: 'blank',
    pattern: 'none',
    customPatternImage: null,
    applyToAll: false
  },
  mathBox: {
    bgColor: '#10b981',
    textColor: '#059669',
    opacity: 0.95,
    displayMode: 'both'
  },
  textBox: {
    bgColor: '#1e293b',
    textColor: '#0f172a',
    opacity: 0.9,
    fontSize: 16
  }
}

/**
 * Inizializzazione database IndexedDB con supporto a taccuini, cartelle e sincronizzazione
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null)
      return
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        db.createObjectStore(STORE_NOTES, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_NOTEBOOKS)) {
        const nbStore = db.createObjectStore(STORE_NOTEBOOKS, { keyPath: 'id' })
        nbStore.createIndex('userId', 'userId', { unique: false })
        nbStore.createIndex('folderId', 'folderId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        const fStore = db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' })
        fStore.createIndex('userId', 'userId', { unique: false })
        fStore.createIndex('parentId', 'parentId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_TOMBSTONES)) {
        const tStore = db.createObjectStore(STORE_TOMBSTONES, { keyPath: 'id' })
        tStore.createIndex('userId', 'userId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const noteStorage = {
  /**
   * Carica le impostazioni salvate degli strumenti (o default)
   */
  loadSettings() {
    if (typeof window === 'undefined') return { ...DEFAULT_TOOL_SETTINGS }
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SETTINGS)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          ...DEFAULT_TOOL_SETTINGS,
          ...parsed,
          pen: { ...DEFAULT_TOOL_SETTINGS.pen, ...(parsed.pen || {}) },
          highlighter: { ...DEFAULT_TOOL_SETTINGS.highlighter, ...(parsed.highlighter || {}) },
          eraser: { ...DEFAULT_TOOL_SETTINGS.eraser, ...(parsed.eraser || {}) },
          sheetStyle: { ...DEFAULT_TOOL_SETTINGS.sheetStyle, ...(parsed.sheetStyle || {}) },
          mathBox: { ...DEFAULT_TOOL_SETTINGS.mathBox, ...(parsed.mathBox || {}) },
          textBox: { ...DEFAULT_TOOL_SETTINGS.textBox, ...(parsed.textBox || {}) }
        }
      }
    } catch (e) {
      console.warn('Errore lettura impostazioni:', e)
    }
    return { ...DEFAULT_TOOL_SETTINGS }
  },

  /**
   * Salva le impostazioni degli strumenti per il riavvio
   */
  saveSettings(settings) {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings))
    } catch (e) {
      console.warn('Errore salvataggio impostazioni:', e)
    }
  },

  /**
   * Genera chiave ID per pagina/documento
   */
  getNoteKey(itemId, pageKey) {
    return `${itemId || 'global'}_page_${pageKey || '1'}`
  },

  /**
   * Salva i dati della nota per la pagina corrente in IndexedDB
   */
  async savePageNotes(itemId, pageKey, data) {
    const key = this.getNoteKey(itemId, pageKey)
    try {
      const db = await openDB()
      if (!db) {
        localStorage.setItem(`note_${key}`, JSON.stringify(data))
        return
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NOTES, 'readwrite')
        const store = tx.objectStore(STORE_NOTES)
        store.put({ id: key, ...data, updatedAt: Date.now() })
        tx.oncomplete = () => resolve(true)
        tx.onerror = () => reject(tx.error)
      })
    } catch (e) {
      console.error('Errore salvataggio nota IndexedDB:', e)
    }
  },

  /**
   * Carica i dati della nota per la pagina corrente
   */
  async loadPageNotes(itemId, pageKey) {
    const key = this.getNoteKey(itemId, pageKey)
    try {
      const db = await openDB()
      if (!db) {
        const raw = localStorage.getItem(`note_${key}`)
        return raw ? JSON.parse(raw) : null
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NOTES, 'readonly')
        const store = tx.objectStore(STORE_NOTES)
        const req = store.get(key)
        req.onsuccess = () => resolve(req.result || null)
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      console.error('Errore caricamento nota IndexedDB:', e)
      return null
    }
  },

  /* ==========================================================================
     GESTIONE TACCUINI & NOTE PERSONALI (ISOLAMENTO PER UTENTE)
     ========================================================================== */

  /**
   * Recupera tutti i taccuini dell'utente corrente
   */
  async getUserNotebooks(userId) {
    if (!userId) return []
    try {
      const db = await openDB()
      if (!db) {
        const raw = localStorage.getItem(`notebooks_${userId}`)
        return raw ? JSON.parse(raw) : []
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NOTEBOOKS, 'readonly')
        const store = tx.objectStore(STORE_NOTEBOOKS)
        const req = store.getAll()
        req.onsuccess = () => {
          const all = req.result || []
          // Filtra strettamente per userId
          const userOnly = all.filter((n) => n.userId === userId)
          userOnly.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
          resolve(userOnly)
        }
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      console.error('Errore caricamento taccuini utente:', e)
      return []
    }
  },

  /**
   * Crea un nuovo taccuino/nota per l'utente
   */
  async createNotebook(userId, { title, folderId, sheetStyle, previewText } = {}) {
    if (!userId) return null
    const newNote = {
      id: 'nb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId,
      title: title && title.trim() ? title.trim() : 'Nuova Nota',
      folderId: folderId || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sheetStyle: sheetStyle || { ...DEFAULT_TOOL_SETTINGS.sheetStyle },
      previewText: previewText || ''
    }

    try {
      const db = await openDB()
      if (!db) {
        const list = await this.getUserNotebooks(userId)
        list.unshift(newNote)
        localStorage.setItem(`notebooks_${userId}`, JSON.stringify(list))
        return newNote
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite')
        const store = tx.objectStore(STORE_NOTEBOOKS)
        store.put(newNote)
        tx.oncomplete = () => resolve(newNote)
        tx.onerror = () => reject(tx.error)
      })
    } catch (e) {
      console.error('Errore creazione taccuino:', e)
      return null
    }
  },

  /**
   * Aggiorna metadati di un taccuino (titolo, folder, stile, updatedAt)
   */
  async updateNotebook(userId, noteId, updates = {}) {
    if (!userId || !noteId) return false
    try {
      const db = await openDB()
      if (!db) {
        const list = await this.getUserNotebooks(userId)
        const idx = list.findIndex((n) => n.id === noteId && n.userId === userId)
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...updates, updatedAt: Date.now() }
          localStorage.setItem(`notebooks_${userId}`, JSON.stringify(list))
          return true
        }
        return false
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite')
        const store = tx.objectStore(STORE_NOTEBOOKS)
        const getReq = store.get(noteId)
        getReq.onsuccess = () => {
          const item = getReq.result
          if (item && item.userId === userId) {
            const updated = { ...item, ...updates, updatedAt: Date.now() }
            store.put(updated)
            resolve(true)
          } else {
            resolve(false)
          }
        }
        getReq.onerror = () => reject(getReq.error)
      })
    } catch (e) {
      console.error('Errore aggiornamento taccuino:', e)
      return false
    }
  },

  /**
   * Elimina un taccuino e le sue pagine
   */
  async deleteNotebook(userId, noteId) {
    if (!userId || !noteId) return false
    try {
      await this.recordTombstone(userId, 'notebook', noteId)
      const db = await openDB()
      if (!db) {
        const list = await this.getUserNotebooks(userId)
        const filtered = list.filter((n) => !(n.id === noteId && n.userId === userId))
        localStorage.setItem(`notebooks_${userId}`, JSON.stringify(filtered))
        localStorage.removeItem(`note_${noteId}_page_1`)
        return true
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NOTEBOOKS, STORE_NOTES], 'readwrite')
        const nbStore = tx.objectStore(STORE_NOTEBOOKS)
        const notesStore = tx.objectStore(STORE_NOTES)

        nbStore.delete(noteId)
        notesStore.delete(`${noteId}_page_1`)

        tx.oncomplete = () => resolve(true)
        tx.onerror = () => reject(tx.error)
      })
    } catch (e) {
      console.error('Errore eliminazione taccuino:', e)
      return false
    }
  },

  /* ==========================================================================
     GESTIONE CARTELLE & SOTTO-CARTELLE (ISOLAMENTO PER UTENTE)
     ========================================================================== */

  /**
   * Recupera tutte le cartelle create dall'utente
   */
  async getUserFolders(userId) {
    if (!userId) return []
    try {
      const db = await openDB()
      if (!db) {
        const raw = localStorage.getItem(`folders_${userId}`)
        return raw ? JSON.parse(raw) : []
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FOLDERS, 'readonly')
        const store = tx.objectStore(STORE_FOLDERS)
        const req = store.getAll()
        req.onsuccess = () => {
          const all = req.result || []
          const userOnly = all.filter((f) => f.userId === userId)
          userOnly.sort((a, b) => a.name.localeCompare(b.name))
          resolve(userOnly)
        }
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      console.error('Errore caricamento cartelle utente:', e)
      return []
    }
  },

  /**
   * Crea una cartella o sotto-cartella
   */
  async createFolder(userId, name, parentId = null) {
    if (!userId || !name || !name.trim()) return null
    const newFolder = {
      id: 'fld_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId,
      name: name.trim(),
      parentId: parentId || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    try {
      const db = await openDB()
      if (!db) {
        const list = await this.getUserFolders(userId)
        list.push(newFolder)
        localStorage.setItem(`folders_${userId}`, JSON.stringify(list))
        return newFolder
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FOLDERS, 'readwrite')
        const store = tx.objectStore(STORE_FOLDERS)
        store.put(newFolder)
        tx.oncomplete = () => resolve(newFolder)
        tx.onerror = () => reject(tx.error)
      })
    } catch (e) {
      console.error('Errore creazione cartella:', e)
      return null
    }
  },

  /**
   * Rinomina o sposta una cartella
   */
  async updateFolder(userId, folderId, { name, parentId } = {}) {
    if (!userId || !folderId) return false
    try {
      const db = await openDB()
      if (!db) {
        const list = await this.getUserFolders(userId)
        const fld = list.find((f) => f.id === folderId && f.userId === userId)
        if (fld) {
          if (name !== undefined) fld.name = name.trim()
          if (parentId !== undefined) fld.parentId = parentId
          fld.updatedAt = Date.now()
          localStorage.setItem(`folders_${userId}`, JSON.stringify(list))
          return true
        }
        return false
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FOLDERS, 'readwrite')
        const store = tx.objectStore(STORE_FOLDERS)
        const req = store.get(folderId)
        req.onsuccess = () => {
          const item = req.result
          if (item && item.userId === userId) {
            if (name !== undefined) item.name = name.trim()
            if (parentId !== undefined) item.parentId = parentId
            item.updatedAt = Date.now()
            store.put(item)
            resolve(true)
          } else {
            resolve(false)
          }
        }
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      console.error('Errore aggiornamento cartella:', e)
      return false
    }
  },

  /**
   * Elimina una cartella e sposta le note al livello superiore
   */
  async deleteFolder(userId, folderId) {
    if (!userId || !folderId) return false
    try {
      await this.recordTombstone(userId, 'folder', folderId)
      const db = await openDB()
      if (!db) {
        let flds = await this.getUserFolders(userId)
        const target = flds.find((f) => f.id === folderId && f.userId === userId)
        const parentId = target ? target.parentId : null
        flds = flds.filter((f) => f.id !== folderId)
        localStorage.setItem(`folders_${userId}`, JSON.stringify(flds))

        // Ripristina note alla cartella genitore
        const nbs = await this.getUserNotebooks(userId)
        nbs.forEach((nb) => {
          if (nb.folderId === folderId) nb.folderId = parentId
        })
        localStorage.setItem(`notebooks_${userId}`, JSON.stringify(nbs))
        return true
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_FOLDERS, STORE_NOTEBOOKS], 'readwrite')
        const fStore = tx.objectStore(STORE_FOLDERS)
        const nbStore = tx.objectStore(STORE_NOTEBOOKS)

        const getFolderReq = fStore.get(folderId)
        getFolderReq.onsuccess = () => {
          const fld = getFolderReq.result
          const parentId = fld ? fld.parentId : null

          fStore.delete(folderId)

          // Aggiorna taccuini contenuti
          const nbIndex = nbStore.index('userId')
          const nbReq = nbIndex.getAll(userId)
          nbReq.onsuccess = () => {
            const list = nbReq.result || []
            list.forEach((nb) => {
              if (nb.folderId === folderId) {
                nb.folderId = parentId
                nbStore.put(nb)
              }
            })
          }
        }
        tx.oncomplete = () => resolve(true)
        tx.onerror = () => reject(tx.error)
      })
    } catch (e) {
      console.error('Errore eliminazione cartella:', e)
      return false
    }
  },

  /* ==========================================================================
     SINCRONIZZAZIONE SERVER NAS (DUE VIE)
     ========================================================================== */

  /**
   * Salva un record di eliminazione (tombstone) per sincronizzazione
   */
  async recordTombstone(userId, type, id) {
    if (!userId || !id) return
    const record = { id, type, userId, isDeleted: true, updatedAt: Date.now() }
    try {
      const db = await openDB()
      if (db && db.objectStoreNames.contains(STORE_TOMBSTONES)) {
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_TOMBSTONES, 'readwrite')
          tx.objectStore(STORE_TOMBSTONES).put(record)
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        })
      }
      const raw = localStorage.getItem(`tombstones_${userId}`)
      const list = raw ? JSON.parse(raw) : []
      list.push(record)
      localStorage.setItem(`tombstones_${userId}`, JSON.stringify(list))
    } catch (e) {
      console.warn('Errore salvataggio tombstone:', e)
    }
  },

  /**
   * Recupera tutti i dati locali (notebooks, folders, note pages) per sync
   */
  async getAllLocalData(userId) {
    if (!userId) return { notebooks: [], folders: [], notes: [] }
    let notebooks = await this.getUserNotebooks(userId)
    let folders = await this.getUserFolders(userId)
    let notes = []
    let tombstones = []

    try {
      const db = await openDB()
      if (db) {
        // Leggi tutte le pagine di note
        notes = await new Promise((resolve) => {
          const tx = db.transaction(STORE_NOTES, 'readonly')
          const req = tx.objectStore(STORE_NOTES).getAll()
          req.onsuccess = () => resolve(req.result || [])
          req.onerror = () => resolve([])
        })
        if (db.objectStoreNames.contains(STORE_TOMBSTONES)) {
          tombstones = await new Promise((resolve) => {
            const tx = db.transaction(STORE_TOMBSTONES, 'readonly')
            const req = tx.objectStore(STORE_TOMBSTONES).getAll()
            req.onsuccess = () => resolve((req.result || []).filter((t) => t.userId === userId))
            req.onerror = () => resolve([])
          })
        }
      } else {
        const raw = localStorage.getItem(`tombstones_${userId}`)
        tombstones = raw ? JSON.parse(raw) : []
      }
    } catch (e) {
      console.warn('Errore lettura dati completi:', e)
    }

    // Includi tombstones nei rispettivi elenchi
    const deletedNotebooks = tombstones.filter((t) => t.type === 'notebook')
    const deletedFolders = tombstones.filter((t) => t.type === 'folder')
    const deletedNotes = tombstones.filter((t) => t.type === 'note')

    return {
      notebooks: [...notebooks, ...deletedNotebooks],
      folders: [...folders, ...deletedFolders],
      notes: [...notes, ...deletedNotes]
    }
  },

  /**
   * Applica i dati sincronizzati dal server nel database locale
   */
  async applySyncedData(userId, syncedData) {
    if (!userId || !syncedData) return
    const { notebooks = [], folders = [], notes = [] } = syncedData

    try {
      const db = await openDB()
      if (!db) {
        localStorage.setItem(`notebooks_${userId}`, JSON.stringify(notebooks.filter((n) => !n.isDeleted && n.userId === userId)))
        localStorage.setItem(`folders_${userId}`, JSON.stringify(folders.filter((f) => !f.isDeleted && f.userId === userId)))
        localStorage.removeItem(`tombstones_${userId}`)
        return
      }

      // Salva notebooks, folders, notes
      const tx = db.transaction([STORE_NOTEBOOKS, STORE_FOLDERS, STORE_NOTES, STORE_TOMBSTONES], 'readwrite')
      const nbStore = tx.objectStore(STORE_NOTEBOOKS)
      const fStore = tx.objectStore(STORE_FOLDERS)
      const notesStore = tx.objectStore(STORE_NOTES)
      const tStore = tx.objectStore(STORE_TOMBSTONES)

      // Pulisci vecchi tombstones applicati
      tStore.clear()

      notebooks.forEach((nb) => {
        if (nb.userId === userId) {
          if (nb.isDeleted) {
            nbStore.delete(nb.id)
          } else {
            nbStore.put(nb)
          }
        }
      })

      folders.forEach((f) => {
        if (f.userId === userId) {
          if (f.isDeleted) {
            fStore.delete(f.id)
          } else {
            fStore.put(f)
          }
        }
      })

      notes.forEach((n) => {
        if (n.isDeleted) {
          notesStore.delete(n.id)
        } else {
          notesStore.put(n)
        }
      })

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(true)
        tx.onerror = () => reject(tx.error)
      })
    } catch (e) {
      console.error('Errore applicazione dati sincronizzati:', e)
    }
  },

  /**
   * Sincronizzazione a due vie con il server NAS
   */
  async syncWithServer(userId, apiClient) {
    if (!userId || !apiClient) return { success: false, reason: 'missing_params' }
    try {
      const localData = await this.getAllLocalData(userId)

      let res
      if (typeof apiClient.post === 'function') {
        res = await apiClient.post('/api/me/notes-sync', localData)
      } else if (typeof apiClient.$post === 'function') {
        res = await apiClient.$post('/api/me/notes-sync', localData)
      } else {
        return { success: false, reason: 'unsupported_client' }
      }

      const responseData = res && res.data ? res.data : res
      if (responseData && (responseData.success || responseData.notebooks)) {
        await this.applySyncedData(userId, responseData)
        return { success: true, ...responseData }
      }
      return { success: false, reason: 'invalid_response' }
    } catch (err) {
      console.warn('Sincronizzazione note con NAS non riuscita (possibile modalità offline):', err)
      return { success: false, offline: true, error: err }
    }
  },

  /**
   * Helper per sincronizzazione automatica invocabile da SmartNetworkManager
   */
  async syncOfflineNotes(userId) {
    if (typeof window === 'undefined') return { success: false }
    const client = window.$nuxt?.$nativeHttp || window.$nuxt?.$axios
    if (client) {
      return this.syncWithServer(userId, client)
    }
    return { success: false, reason: 'no_client' }
  }
}
