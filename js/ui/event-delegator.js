/**
 * EventDelegator - Global event handling via delegation
 */
(function(window) {
    const EventDelegator = {
        init() {
            document.addEventListener('click', (e) => this._handleClick(e));
            document.addEventListener('input', (e) => this._handleInput(e));
            document.addEventListener('change', (e) => this._handleChange(e));
            
            // Drag and Drop for Builder
            document.addEventListener('dragover', (e) => e.preventDefault());
            document.addEventListener('drop', (e) => this._handleDrop(e));
        },

        _handleClick(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const handler = this.handlers[action];

            if (handler) {
                handler(e, target);
            }
        },

        _handleInput(e) {
            const target = e.target.closest('[data-oninput]');
            if (!target) return;
            
            const action = target.dataset.oninput;
            const handler = this.handlers[action];
            if (handler) handler(e, target);
        },

        _handleChange(e) {
            const target = e.target.closest('[data-onchange]');
            if (!target) return;
            
            const action = target.dataset.onchange;
            const handler = this.handlers[action];
            if (handler) handler(e, target);
        },

        _handleDrop(e) {
            // Drag logic will be specifically handled within CreatorManager if needed, 
            // or here if kept global.
        },

        registerMultiple(handlers) {
            Object.assign(this.handlers, handlers);
        },

        register(name, handler) {
            this.handlers[name] = handler;
        },

        handlers: {
            'enter-app': () => {
                ScreenManager.change('uploadScreen');
                if (StorageManager.isFirstVisit()) {
                    ModalManager.open('onboardingModal');
                    StorageManager.markFirstVisit();
                }
            },
            'go-home': () => {
                const isBusy = QuizEngine.getState().quizData || document.getElementById('creatorScreen').offsetParent;
                if (isBusy) {
                    ModalManager.confirm("Sair agora? Progresso não salvo será perdido.", () => location.reload());
                } else {
                    location.reload();
                }
            },
            'show-library': () => {
                ScreenManager.change('libraryScreen');
                LibraryManager.render();
            },
            'show-creator': () => {
                CreatorManager.reset();
                ScreenManager.change('creatorScreen');
            },
            'confirm-meta': () => CreatorManager.confirmMeta(),
            'edit-meta': () => CreatorManager.editMeta(),
            'add-question': () => CreatorManager.addQuestion(),
            'toggle-collapse': (e, target) => {
                const id = target.dataset.target;
                document.getElementById(id).classList.toggle('collapsed');
            },
            'toggle-compact': () => {
                const bar = document.getElementById('quizInfoBar');
                const btn = bar.querySelector('.toggle-compact-btn');
                const isCompact = bar.classList.toggle('compact');
                btn.innerHTML = isCompact ? IconSystem.render('chevronDown', 'sm') : IconSystem.render('chevronUp', 'sm');
            },
            'select-file-trigger': () => document.getElementById('fileInput').click(),
            'preview-json': () => CreatorManager.preview(),
            'copy-clipboard': () => {
                const text = document.getElementById('previewCode').textContent;
                navigator.clipboard.writeText(text).then(() => {
                    ToastSystem.show("Copiado para o clipboard!", "success");
                });
            },
            'export-json': () => {
                const quiz = CreatorManager.buildQuizObject();
                if (!quiz) return;
                window.pendingSaveQuiz = quiz;
                ModalManager.open('exportOptionsModal');
            },
            'confirm-export': () => {
                const quiz = window.pendingSaveQuiz;
                if (!quiz) return;
                
                // Download
                const blob = new Blob([JSON.stringify(quiz, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = quiz.nomeSimulado.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".json";
                a.click();

                // Save to Library (if checked)
                const shouldSave = document.getElementById('saveToLibCheckbox').checked;
                let savedId = null;
                if (shouldSave) {
                    savedId = StorageManager.addToLibrary(quiz).id;
                }

                ModalManager.close('exportOptionsModal');
                
                // Decision Modal
                const actionModal = document.getElementById('builderActionModal');
                document.getElementById('btnActionLoad').onclick = () => {
                    ModalManager.close('builderActionModal');
                    ScreenManager.loadQuiz(quiz, savedId);
                };
                ModalManager.open('builderActionModal');
            },
            'limit-export': () => {
                const oldest = StorageManager.getLibrary().sort((a, b) => a.meta.addedAt - b.meta.addedAt)[0];
                // Download oldest
                const blob = new Blob([JSON.stringify(oldest.data, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = oldest.data.nomeSimulado + ".json";
                a.click();
                
                StorageManager.removeFromLibrary(oldest.id);
                const result = StorageManager.addToLibrary(window.pendingSaveQuiz);
                ModalManager.close('limitModal');
                ScreenManager.loadQuiz(window.pendingSaveQuiz, result.id);
            },
            'limit-replace': () => {
                const oldest = StorageManager.getLibrary().sort((a, b) => a.meta.addedAt - b.meta.addedAt)[0];
                StorageManager.removeFromLibrary(oldest.id);
                const result = StorageManager.addToLibrary(window.pendingSaveQuiz);
                ModalManager.close('limitModal');
                ScreenManager.loadQuiz(window.pendingSaveQuiz, result.id);
            },
            'limit-cancel': () => {
                ModalManager.close('limitModal');
                ScreenManager.loadQuiz(window.pendingSaveQuiz, null);
            }
        }
    };

    window.EventDelegator = EventDelegator;
})(window);
