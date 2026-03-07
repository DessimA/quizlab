(function() {
    window.addEventListener('load', () => {
        ToastSystem.init();
        EventDelegator.init();
        IconSystem.inject();

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
            'enter-app': () => ScreenManager.change('uploadScreen'),
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
                ModalManager.open('exportOptionsModal');
            },

            'confirm-answer': () => { QuizEngine.confirm(); QuizRenderer.renderQuestion(); },
            'next-question': () => { QuizEngine.next(); QuizRenderer.renderQuestion(); },
            'prev-question': () => { QuizEngine.prev(); QuizRenderer.renderQuestion(); },
            'select-alternative': (e, target) => { QuizEngine.select(target.dataset.id); QuizRenderer.renderQuestion(); },
            'jump-to-question': (e, target) => {
                QuizEngine.goTo(parseInt(target.dataset.index));
                ScreenManager.change(CONFIG.ELEMENTS.QUIZ_SCREEN);
                QuizRenderer.renderQuestion();
            },
            'finish-quiz': () => ReviewManager.renderFinalReview(),
            'finalize-process': () => ReviewManager.finalizeProcess(),
            'back-to-quiz': () => { ScreenManager.change(CONFIG.ELEMENTS.QUIZ_SCREEN); QuizRenderer.renderQuestion(); },
            'reset-quiz': () => { QuizEngine.reset(); ScreenManager.change(CONFIG.ELEMENTS.QUIZ_SCREEN); QuizRenderer.renderQuestion(); },

            'load-quiz': (e, target) => {
                const item = StorageManager.getLibrary().find(i => i.id === target.dataset.id);
                if (item) ScreenManager.loadQuiz(item.data, item.id);
            },
            'download-quiz': (e, target) => {
                const item = StorageManager.getLibrary().find(i => i.id === target.dataset.id);
                if (item) _downloadJson(item.data, item.data.nomeSimulado);
            },
            'delete-quiz': (e, target) => LibraryManager.delete(target.dataset.id),
            'search-library': () => LibraryManager.render(),

            'close-modal': (e, target) => ModalManager.close(target.dataset.target),
            'modal-confirm': () => ModalManager.close('customModal'),
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
            'toggle-collapse': (e, target) => document.getElementById(target.dataset.target)?.classList.toggle('collapsed'),
            'select-file-trigger': () => document.getElementById('fileInput').click(),
            'confirm-export': () => _finalizeExport()
        });

        document.getElementById('fileInput').onchange = (e) => FileHandler.handle(e.target.files[0]);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') ModalManager.closeAll();
            if (e.ctrlKey && e.key === 's') {
                const creator = document.getElementById(CONFIG.ELEMENTS.CREATOR_SCREEN);
                if (creator && !creator.classList.contains('hidden')) {
                    e.preventDefault();
                    _saveDraft();
                    ToastSystem.show("Rascunho salvo!", "info");
                }
            }
        });

        document.addEventListener('mousedown', (e) => {
            const button = e.target.closest('.btn');
            if (!button) return;
            const circle = document.createElement('span');
            const diameter = Math.max(button.clientWidth, button.clientHeight);
            circle.style.cssText = `width:${diameter}px;height:${diameter}px;left:${e.clientX - button.getBoundingClientRect().left - diameter / 2}px;top:${e.clientY - button.getBoundingClientRect().top - diameter / 2}px`;
            circle.className = 'ripple';
            button.querySelectorAll('.ripple').forEach(r => r.remove());
            button.appendChild(circle);
        });

        setInterval(_saveDraft, CONFIG.TIMINGS.AUTOSAVE_INTERVAL);

        window.renderQuestion = () => QuizRenderer.renderQuestion();

        function _downloadJson(data, filename) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
            a.download = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
            a.click();
        }

        function _finalizeExport() {
            const quiz = CreatorManager.buildQuizObject();
            if (!quiz) return;
            _downloadJson(quiz, quiz.nomeSimulado);
            const savedId = document.getElementById('saveToLibCheckbox').checked
                ? StorageManager.addToLibrary(quiz).id
                : null;
            ModalManager.close('exportOptionsModal');
            document.getElementById('btnActionLoad').onclick = () => {
                ModalManager.close('builderActionModal');
                ScreenManager.loadQuiz(quiz, savedId);
            };
            ModalManager.open('builderActionModal');
        }

        function _saveDraft() {
            const creator = document.getElementById(CONFIG.ELEMENTS.CREATOR_SCREEN);
            if (!creator || creator.classList.contains('hidden')) return;
            const title = document.getElementById('builderTitle').value;
            const desc = document.getElementById('builderDesc').value;
            if (title || desc) StorageManager.saveDraft({ title, desc, timestamp: Date.now() });
        }
    });
})();