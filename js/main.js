(function() {
    window.addEventListener('load', () => {
        ThemeManager.init();
        ToastSystem.init();
        EventDelegator.init();
        IconSystem.inject();

        // Encapsulated state (Private to main.js)
        const _pendingState = {
            quiz: null,
            savedId: null,
            loadOptions: null // replaces pendingQuizLoad
        };

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
            a.download = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            a.click();
        };

        const _finalizeExport = async () => {
            const quiz = CreatorManager.buildQuizObject();
            if (!quiz) return;

            const shouldSave = document.getElementById('saveToLibCheckbox')?.checked;
            _pendingState.quiz = quiz;
            _pendingState.savedId = null;

            if (shouldSave) {
                const check = await StorageManager.canStore(quiz);
                if (!check.allowed) {
                    ModalManager.close('exportOptionsModal');
                    ModalManager.alert('Armazenamento local cheio. Acesse a Biblioteca e exclua simulados para liberar espaço.');
                    return;
                }
                const result = StorageManager.addToLibrary(quiz);
                if (!result.success) {
                    ModalManager.alert('Erro ao salvar na biblioteca. Tente novamente.');
                    return;
                }
                _pendingState.savedId = result.id;
            }

            ModalManager.close('exportOptionsModal');
            ModalManager.open('builderActionModal');
        };

        EventDelegator.registerMultiple({
            'go-home': () => {
                const isResult = ScreenManager.currentScreen === CONFIG.ELEMENTS.RESULT_SCREEN;
                const state = QuizEngine.getState();
                const isQuizActive = state.quizData && !isResult;
                const isCreatorActive = document.getElementById('creatorScreen').offsetParent;

                if (!isQuizActive && !isCreatorActive) {
                    location.reload();
                    return;
                }

                const hasProgress = isQuizActive && state.questionAnswered.some(a => a);
                const isStudyMode = state.mode === CONFIG.QUIZ_MODES.STUDY;
                const progressIsSaved = isQuizActive && isStudyMode && hasProgress;

                const message = progressIsSaved
                    ? "Seu progresso está salvo. Você pode retomar este simulado pela biblioteca quando quiser."
                    : "Sair agora? O progresso atual não será salvo.";

                ModalManager.confirm(message, () => location.reload());
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
                        `Existe uma sessão de Estudo em andamento para "${item.data.nomeSimulado}" (${minutesAgo} min atrás). Como deseja prosseguir?`,
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
                const options = _pendingState.loadOptions;
                if (!options) return;

                const mode = document.querySelector('input[name="quizMode"]:checked')?.value || CONFIG.QUIZ_MODES.STUDY;
                const shuffleQuestions = document.getElementById('optShuffleQuestions')?.checked || false;
                const shuffleOptions = document.getElementById('optShuffleOptions')?.checked || false;

                ModalManager.close('quizOptionsModal');
                ScreenManager.loadQuiz(options.data, options.libraryId, { mode, shuffleQuestions, shuffleOptions });
                _pendingState.loadOptions = null;
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
            
            'toggle-compact': () => {
                const bar = document.getElementById('quizInfoBar');
                const btn = bar.querySelector('.toggle-compact-btn');
                const isCompact = bar.classList.toggle('compact');
                if (btn) btn.innerHTML = isCompact ? IconSystem.render('chevronDown', 'sm') : IconSystem.render('chevronUp', 'sm');
            },

            'toggle-collapse':    (e, target) => document.getElementById(target.dataset.target)?.classList.toggle('collapsed'),
            'select-file-trigger': () => document.getElementById('fileInput').click(),
            'confirm-export':     () => _finalizeExport(),
            
            'action-load': () => {
                ModalManager.close('builderActionModal');
                if (_pendingState.quiz) {
                    ScreenManager.loadQuiz(_pendingState.quiz, _pendingState.savedId);
                    _pendingState.quiz = null;
                    _pendingState.savedId = null;
                }
            },

            'toggle-selection-mode': () => LibraryManager.toggleSelectionMode(),
            'toggle-card-select':    (e, target) => LibraryManager.toggleCardSelection(target.dataset.id),
            'select-all-library':    () => LibraryManager.selectAll(),
            'deselect-all-library':  () => LibraryManager.deselectAll(),
            'delete-selected':       () => LibraryManager.bulkDelete()
        });

        // Redirect ScreenManager global calls to use our local state
        const originalLoadOptions = ScreenManager.loadQuizOptions;
        ScreenManager.loadQuizOptions = (data, libraryId) => {
            _pendingState.loadOptions = { data, libraryId };
            originalLoadOptions.call(ScreenManager, data, libraryId);
        };

        window.addEventListener('quizlab:timer-expired', () => {
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
        });

        document.getElementById('fileInput').onchange = (e) => {
            if (e.target.files.length) FileHandler.handleMultiple(e.target.files);
            e.target.value = '';
        };

        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer?.files;
                if (files?.length) FileHandler.handleMultiple(files);
            });
        }

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
