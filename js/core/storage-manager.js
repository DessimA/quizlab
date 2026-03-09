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
                this._statsCache = null;
                return true;
            } catch (e) {
                console.error(`Error saving ${key} to storage`, e);
                return false;
            }
        },

        remove(key) {
            localStorage.removeItem(key);
            this._statsCache = null;
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
            if (!this.saveLibrary(library)) return { success: false, reason: 'SAVE_FAILED' };
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
            if (session && session.libraryId === id) this.clearSession();
            const library = this.getLibrary().filter(item => item.id !== id);
            return this.saveLibrary(library);
        },

        removeManyFromLibrary(ids) {
            const session = this.getSession();
            const idsSet = new Set(ids);
            const library = this.getLibrary().filter(item => {
                if (idsSet.has(item.id)) {
                    if (session?.libraryId === item.id) this.clearSession();
                    return false;
                }
                return true;
            });
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

        _measureLocalStorageUsage() {
            let total = 0;
            for (const key of Object.keys(localStorage)) {
                total += new Blob([localStorage.getItem(key) || '']).size;
            }
            return total;
        },

        _statsCache: null,

        getStorageStats() {
            const now = Date.now();
            const currentKeys = Object.keys(localStorage);
            const keySum = currentKeys.reduce((acc, k) => acc + (localStorage.getItem(k) || '').length, 0);

            if (this._statsCache && 
                (now - this._statsCache.ts) < 2000 && 
                this._statsCache.keySum === keySum) {
                return this._statsCache.value;
            }

            const quota = CONFIG.LIMITS.STORAGE_SAFE_QUOTA_BYTES;
            const usage = this._measureLocalStorageUsage();
            const stats = { usage, quota, percent: usage / quota };
            
            this._statsCache = { value: stats, ts: now, keySum };
            return stats;
        },

        canStore(data) {
            const stats = this.getStorageStats();
            const dataSize = new Blob([JSON.stringify(data)]).size;
            const projectedPercent = (stats.usage + dataSize) / stats.quota;
            if (projectedPercent >= CONFIG.LIMITS.STORAGE_BLOCK_THRESHOLD) {
                return { allowed: false, reason: 'QUOTA_EXCEEDED', stats };
            }
            return { allowed: true, stats };
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
        },

        saveWrongQuestions(libraryId, wrongQuestions) {
            this.updateLibraryMeta(libraryId, { wrongQuestions });
        },

        getAggregatedWrong(quizIds) {
            const library = this.getLibrary();
            const items = quizIds
                ? library.filter(i => quizIds.includes(i.id))
                : library;

            const seen = new Set();
            const result = [];

            items.forEach(item => {
                (item.meta.wrongQuestions || []).forEach(wq => {
                    const key = `${wq.sourceQuizId}__${wq.questao.id}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        result.push(wq);
                    }
                });
            });

            return result;
        }
    };

    window.StorageManager = StorageManager;
})(window);
