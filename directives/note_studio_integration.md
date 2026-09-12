# Direttiva: Integrazione Studio Note Digitali (Libri & Note)

## Obiettivo
Fornire un'infrastruttura completa e modulare per l'annotazione digitale, disegno, calcoli matematici, modelli di foglio e memo vocali integrata nei lettori di Libri & Note (PDF, EPUB, Comic/CBZ/CBR, MOBI).

## Attivazione
- Lo Studio Note e la sua barra laterale destra (Toolbar) sono attivi **esclusivamente quando un lettore apre un documento**.
- Nelle sezioni di navigazione (Home, Libreria, Impostazioni, Audiolibri) la barra è disattivata per mantenere l'interfaccia pulita.

## Interazione Toolbar Destra
- **Singolo Clic**: Seleziona o attiva lo strumento (Penna, Evidenziatore, Gomma, Casella Testo, Casella Matematica, Modelli Foglio, Memo Vocale, Galaxy AI Assist).
- **Doppio Clic**: Apre il menu di configurazione esteso dello strumento (palette colori, spessore, modello foglio, tastierino matematico, ecc.).

## Persistenza & Offline-First
- **Impostazioni Strumenti**: Salvate in `localStorage` (`librie_note_tool_settings`). Vengono ripristinate automaticamente all'avvio.
- **Annotazioni e Tracciati**: Salvati per elemento/pagina in `IndexedDB` con supporto offline.
