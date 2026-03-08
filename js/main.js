(function() {
    window.addEventListener('load', () => {
        ThemeManager.init();
        ToastSystem.init();
        EventDelegator.init();
        IconSystem.inject();

        const _navigateQuiz = (engineAction) => {
            engineAction();
            QuizRenderer.renderQuestion();
        };

        const _saveDraft = () => {
            const draft = CreatorManager.buildDraftObject?.();
            if (draft) StorageManager.saveDraft(draft);
        };

        const _downloadJson = (data, name) => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${name}.json`;
            a.click();
        };

        const _finalizeExport = () => {
            const quiz = CreatorManager.buildQuizObject();
            if (!quiz) return;
            const shouldSave = document.getElementById('optSaveLibrary')?.checked;
            let savedId = null;

            if (shouldSave) {
                const result = StorageManager.addToLibrary(quiz);
                if (!result.success && result.reason === 'LIMIT_REACHED') {
                    window.pendingSaveQuiz = quiz;
                    const oldest = StorageManager.getLibrary().sort((a, b) => a.meta.addedAt - b.meta.addedAt)[0];
                    document.getElementById('limitOldestTitle').textContent = oldest.data.nomeSimulado;
                    document.getElementById('limitOldestDate').textContent = `Adicionado em: ${new Date(oldest.meta.addedAt).toLocaleDateString('pt-BR')}`;
                    ModalManager.close('exportOptionsModal');
                    ModalManager.open('limitModal');
                    return;
                }
                savedId = result.id;
            }

            ModalManager.close('exportOptionsModal');

            const actionModal = document.getElementById('builderActionModal');
            document.getElementById('btnActionLoad').onclick = () => {
                ModalManager.close('builderActionModal');
                ScreenManager.loadQuiz(quiz, savedId);
            };
            ModalManager.open('builderActionModal');
        };

        EventDelegator.registerMultiple({
            'go-home': () => {
                const isResult = ScreenManager.currentScreen === CONFIG.ELEMENTS.RESULT_SCREEN;
                const isBusy = (QuizEngine.getState().quizData && !isResult)
                    || document.getElementById('creatorScreen').offsetParent;
                if (isBusy) {
                    ModalManager.confirm("Sair agora? Progresso não salvo será perdido.", () => location.reload());
                } else {
                    location.reload();
                }
            },

            'enter-app': () => {
                ScreenManager.change('uploadScreen');
                if (StorageManager.isFirstVisit()) {
                    ModalManager.open('onboardingModal');
                    StorageManager.markFirstVisit();
                }
            },

            'show-library': () => { ScreenManager.change('libraryScreen'); LibraryManager.render(); },
            'show-creator': () => { CreatorManager.reset(); ScreenManager.change('creatorScreen'); },

            'confirm-meta': () => CreatorManager.confirmMeta(),
            'edit-meta': () => CreatorManager.editMeta(),
            'validate-meta': () => {
                const title = document.getElementById('builderTitle').value.trim();
                document.getElementById('btnConfirmMeta').disabled = !title;
            },
            'validate-builder': (e, target) => {
                if (target.classList.contains('q-enunciado')) {
                    const counter = target.previousElementSibling?.querySelector('.char-counter');
                    if (counter) counter.textContent = `${target.value.length}/${target.maxLength}`;
                }
                CreatorManager.validateGlobal();
            },
            'add-question': () => CreatorManager.addQuestion(),
            'remove-question': (e, target) => {
                document.getElementById(target.dataset.target)?.remove();
                CreatorManager.renumberQuestions();
                CreatorManager.validateGlobal();
            },
            'add-alternative': (e, target) => CreatorManager.addAlternative(target.dataset.target),
            'remove-alternative': (e, target) => {
                document.getElementById(target.dataset.target)?.remove();
                CreatorManager.validateGlobal();
            },
            'preview-json': () => CreatorManager.preview(),

            'export-json': () => {
                const quiz = CreatorManager.buildQuizObject();
                if (!quiz) return;
                window.pendingSaveQuiz = quiz;

                if (CreatorManager._editingId) {
                    ModalManager.confirm(
                        'Atualizar o simulado na biblioteca com as alterações?',
                        () => {
                            StorageManager.replaceInLibrary(CreatorManager._editingId, quiz);
                            ToastSystem.show('Simulado atualizado na biblioteca!');
                            CreatorManager._editingId = null;
                        }
                    );
                    return;
                }
                ModalManager.open('exportOptionsModal');
            },

            'confirm-answer': () => _navigateQuiz(() => QuizEngine.confirm()),
            'next-question':  () => _navigateQuiz(() => QuizEngine.next()),
            'prev-question':  () => _navigateQuiz(() => QuizEngine.prev()),
            'select-alternative': (e, target) => _navigateQuiz(() => QuizEngine.select(target.dataset.id)),

            'jump-to-question': (e, target) => {
                QuizEngine.goTo(parseInt(target.dataset.index));
                ScreenManager.change(CONFIG.ELEMENTS.QUIZ_SCREEN);
                QuizRenderer.renderQuestion();
            },

            'finish-quiz':      () => ReviewManager.renderFinalReview(),
            'finalize-process': () => ReviewManager.finalizeProcess(),
            'back-to-quiz':     () => _navigateQuiz(() => ScreenManager.change(CONFIG.ELEMENTS.QUIZ_SCREEN)),
            'reset-quiz':       () => { QuizEngine.reset(); ScreenManager.change(CONFIG.ELEMENTS.QUIZ_SCREEN); QuizRenderer.renderQuestion(); },

            'load-quiz': (e, target) => {
                const item = StorageManager.getById(target.dataset.id);
                if (!item) return;

                const session = StorageManager.getSession();
                if (session && session.libraryId === item.id && session.mode === CONFIG.QUIZ_MODES.STUDY) {
                    const minutesAgo = Math.round((Date.now() - session.savedAt) / 60000);
                    ModalManager.confirm(
                        `Sessão de Estudo em andamento para "${item.data.nomeSimulado}" (${minutesAgo} min atrás). Como deseja prosseguir?`,
                        () => ScreenManager.resumeSession(session),
                        {
                            title: "RETOMAR PROGRESSO",
                            confirmText: "RETOMAR",
                            cancelText: "NOVA TENTATIVA",
                            onCancel: () => {
                                StorageManager.clearSession();
                                ScreenManager.loadQuizOptions(item.data, item.id);
                            }
                        }
                    );
                } else {
                    ScreenManager.loadQuizOptions(item.data, item.id);
                }
            },

            'resume-quiz': (e, target) => {
                const session = StorageManager.getSession();
                if (!session || session.libraryId !== target.dataset.id) return;
                ScreenManager.resumeSession(session);
            },

            'confirm-quiz-options': () => {
                const { data, libraryId } = window.pendingQuizLoad || {};
                if (!data) return;

                const mode = document.querySelector('input[name="quizMode"]:checked')?.value || CONFIG.QUIZ_MODES.STUDY;
                const shuffleQuestions = document.getElementById('optShuffleQuestions')?.checked || false;
                const shuffleOptions = document.getElementById('optShuffleOptions')?.checked || false;

                ModalManager.close('quizOptionsModal');
                ScreenManager.loadQuiz(data, libraryId, { mode, shuffleQuestions, shuffleOptions });
                window.pendingQuizLoad = null;
            },

            'flag-question': () => {
                const idx = QuizEngine.getState().currentQuestion;
                QuizEngine.flagQuestion(idx);
                QuizRenderer.renderQuestion();
            },

            'edit-quiz': (e, target) => {
                const item = StorageManager.getById(target.dataset.id);
                if (!item) return;
                CreatorManager.loadForEdit(item);
                ScreenManager.change(CONFIG.ELEMENTS.CREATOR_SCREEN);
            },

            'download-quiz': (e, target) => {
                const item = StorageManager.getById(target.dataset.id);
                if (item) _downloadJson(item.data, item.data.nomeSimulado);
            },

            'delete-quiz':    (e, target) => LibraryManager.delete(target.dataset.id),
            'search-library': () => LibraryManager.render(),
            'toggle-theme':   () => ThemeManager.toggle(),

            'close-modal':    (e, target) => ModalManager.close(target.dataset.target),
            'modal-confirm':  () => ModalManager.close('customModal'),

            'copy-clipboard': () => {
                navigator.clipboard.writeText(document.getElementById('previewCode').textContent)
                    .then(() => ToastSystem.show("Copiado!", "success"));
            },

            'toggle-visibility': () => {
                const bar = document.getElementById('quizInfoBar');
                const btn = bar.querySelector('.toggle-visibility-btn');
                const isHidden = bar.classList.toggle('hidden-panel');
                btn.innerHTML = isHidden ? IconSystem.render('eyeOff', 'xs') : IconSystem.render('eye', 'xs');
                btn.setAttribute('aria-label', isHidden ? 'Exibir painel de informações' : 'Ocultar painel de informações');
            },

            'toggle-collapse':    (e, target) => document.getElementById(target.dataset.target)?.classList.toggle('collapsed'),
            'select-file-trigger': () => document.getElementById('fileInput').click(),
            'confirm-export':     () => _finalizeExport(),

            'limit-export': () => {
                const oldest = StorageManager.getLibrary().sort((a, b) => a.meta.addedAt - b.meta.addedAt)[0];
                _downloadJson(oldest.data, oldest.data.nomeSimulado);
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
        });

        window.addEventListener('quizlab:timer-expired', () => {
            const examBar = document.getElementById('examTimerBar');
            if (examBar) examBar.classList.add('hidden');
            const inlineTimer = document.getElementById('timerDisplay');
            if (inlineTimer) inlineTimer.style.display = 'none';
            ToastSystem.show('Tempo esgotado! Finalizando simulado...', 'error');
            setTimeout(() => ReviewManager.renderFinalReview(), 1000);
        });

        window.addEventListener('quizlab:timer-tick', (e) => {
            const timeStr = Utils.formatTime(e.detail.remaining);
            const isWarning = e.detail.remaining <= 60;

            const inlineTimer = document.getElementById('timerDisplay');
            if (inlineTimer) {
                inlineTimer.textContent = timeStr;
                inlineTimer.style.display = 'inline';
                inlineTimer.classList.toggle('timer-warning', isWarning);
            }

            const examBar = document.getElementById('examTimerBar');
            if (examBar) {
                const valEl = examBar.querySelector('.exam-timer-value');
                if (valEl) valEl.textContent = timeStr;
                examBar.classList.toggle('timer-warning', isWarning);
            }
        });

        document.getElementById('fileInput').onchange = (e) => FileHandler.handle(e.target.files[0]);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') ModalManager.closeAll();
            if (e.ctrlKey && e.key === 's') {
                const creator = document.getElementById(CONFIG.ELEMENTS.CREATOR_SCREEN);
                if (creator && !creator.classList.contains('hidden')) {
                    e.preventDefault();
                    _saveDraft();
                    ToastSystem.show("Rascunho salvo!");
                }
            }
        });

        let _autosaveTimer = null;
        const _scheduleAutosave = () => {
            clearTimeout(_autosaveTimer);
            _autosaveTimer = setTimeout(_saveDraft, CONFIG.TIMINGS.AUTOSAVE_INTERVAL);
        };
        document.addEventListener('input', _scheduleAutosave);
    });
})();
