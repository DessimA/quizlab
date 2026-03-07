/**
 * StorageManager - Centralized LocalStorage operations
 */
(function(window) {
    const StorageManager = {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error(`Error reading ${key} from storage`, e);
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error(`Error saving ${key} to storage`, e);
                return false;
            }
        },

        remove(key) {
            localStorage.removeItem(key);
        },

        // Domain specific methods
        getLibrary() {
            return this.get(CONFIG.STORAGE.LIBRARY_KEY, []);
        },

        saveLibrary(lib) {
            return this.set(CONFIG.STORAGE.LIBRARY_KEY, lib);
        },

        addToLibrary(quiz) {
            const library = this.getLibrary();
            const newId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const newItem = {
                id: newId,
                data: quiz,
                meta: {
                    addedAt: Date.now(),
                    questionsCount: quiz.questoes.length,
                    timesPlayed: 0,
                    lastPlayed: null,
                    averageScore: 0
                }
            };
            library.push(newItem);
            this.saveLibrary(library);
            return { success: true, id: newId };
        },

        removeFromLibrary(id) {
            const library = this.getLibrary().filter(item => item.id !== id);
            return this.saveLibrary(library);
        },

        updateLibraryMeta(id, updates) {
            const library = this.getLibrary();
            const index = library.findIndex(item => item.id === id);
            if (index !== -1) {
                library[index].meta = { ...library[index].meta, ...updates };
                return this.saveLibrary(library);
            }
            return false;
        },

        getDraft() {
            return this.get(CONFIG.STORAGE.DRAFT_KEY);
        },

        saveDraft(draft) {
            return this.set(CONFIG.STORAGE.DRAFT_KEY, draft);
        },

        clearDraft() {
            this.remove(CONFIG.STORAGE.DRAFT_KEY);
        },

        isFirstVisit() {
            return !localStorage.getItem(CONFIG.STORAGE.FIRST_VISIT_KEY);
        },

        markFirstVisit() {
            localStorage.setItem(CONFIG.STORAGE.FIRST_VISIT_KEY, 'true');
        }
    };

    window.StorageManager = StorageManager;
})(window);
