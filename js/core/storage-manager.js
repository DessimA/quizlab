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

        getLibrary() {
            return this.get(CONFIG.STORAGE.LIBRARY_KEY, []);
        },

        saveLibrary(lib) {
            return this.set(CONFIG.STORAGE.LIBRARY_KEY, lib);
        },

        getById(id) {
            return this.getLibrary().find(item => item.id === id) || null;
        },

        addToLibrary(quiz) {
            const library = this.getLibrary();
            if (library.length >= CONFIG.LIMITS.MAX_LIBRARY_SLOTS) {
                return { success: false, reason: 'LIMIT_REACHED' };
            }
            const newId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const newItem = {
                id: newId,
                data: quiz,
                meta: {
                    addedAt: Date.now(),
                    questionsCount: quiz.questoes.length,
                    timesPlayed: 0,
                    lastPlayed: null,
                    averageScore: 0,
                    history: []
                }
            };
            library.push(newItem);
            this.saveLibrary(library);
            return { success: true, id: newId };
        },

        replaceInLibrary(id, quiz) {
            const library = this.getLibrary();
            const index = library.findIndex(item => item.id === id);
            if (index === -1) return false;
            library[index].data = quiz;
            library[index].meta.questionsCount = quiz.questoes.length;
            return this.saveLibrary(library);
        },

        removeFromLibrary(id) {
            const session = this.getSession();
            if (session && session.libraryId === id) {
                this.clearSession();
            }
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

        updateQuizStats(id, stats) {
            const library = this.getLibrary();
            const index = library.findIndex(item => item.id === id);
            if (index === -1) return false;

            const meta = library[index].meta;
            const entry = {
                playedAt: Date.now(),
                score: stats.percent,
                correct: stats.correct,
                total: stats.total
            };

            if (!meta.history) meta.history = [];
            meta.history.unshift(entry);
            if (meta.history.length > CONFIG.LIMITS.MAX_HISTORY_ENTRIES) {
                meta.history = meta.history.slice(0, CONFIG.LIMITS.MAX_HISTORY_ENTRIES);
            }

            meta.timesPlayed = (meta.timesPlayed || 0) + 1;
            meta.lastPlayed = Date.now();
            meta.averageScore = Math.round(
                meta.history.reduce((sum, e) => sum + e.score, 0) / meta.history.length
            );

            library[index].meta = meta;
            return this.saveLibrary(library);
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

        getSession() {
            return this.get(CONFIG.STORAGE.SESSION_KEY);
        },

        saveSession(session) {
            return this.set(CONFIG.STORAGE.SESSION_KEY, session);
        },

        clearSession() {
            this.remove(CONFIG.STORAGE.SESSION_KEY);
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
