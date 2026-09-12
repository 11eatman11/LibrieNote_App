# Direttiva: Architettura Modulare dei Reader

## Principio di Isolamento
Ogni formato di documento (PDF, EPUB, Comic/CBZ, MOBI) possiede un proprio componente dedicato (`PdfReader.vue`, `EpubReader.vue`, `ComicReader.vue`, `MobiReader.vue`).

## Regole di Modifica
1. **Nessuna commistione**: Non inserire logica specifica del PDF dentro l'EPUB reader o viceversa.
2. **Componente Overlay Condiviso**: Tutti i reader integrano il modulo `NoteStudioOverlay.vue` passando via props o store:
   - `itemId`: ID dell'elemento corrente.
   - `pageNumber` / `location`: Riferimento alla pagina o capitolo corrente.
   - `dimensions`: Larghezza e altezza del canvas/viewport.
3. **Event Bus & State**: La comunicazione tra il reader e il modulo note avviene tramite eventi e reactive store.
