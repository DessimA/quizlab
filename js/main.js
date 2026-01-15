/**
 * main.js - Application entry point and orchestration
 */
(function() {
    window.addEventListener('load', () => {
        // Initialize Components
        ToastSystem.init();
        EventDelegator.init();
        IconSystem.inject(); // Injeta ícones estáticos do HTML

        // Register feature-specific handlers
        EventDelegator.registerMultiple({
            // Navigation
            'go-home': () => {
                const isResult = ScreenManager.currentScreen === CONFIG.ELEMENTS.RESULT_SCREEN;
                const isBusy = (QuizEngine.getState().quizData && !isResult) || document.getElementById('creatorScreen').offsetParent;
                if (isBusy) {
                    ModalManager.confirm("Sair agora? Progresso não salvo será perdido.", () => location.reload());
                } else {
                    location.reload();
                }
            },
            'enter-app': () => ScreenManager.change('uploadScreen'),
            'show-library': () => {
                ScreenManager.change('libraryScreen');
                LibraryManager.render();
            },
            'show-creator': () => {
                CreatorManager.reset();
                ScreenManager.change('creatorScreen');
            },

            // Creator
            'confirm-meta': () => CreatorManager.confirmMeta(),
            'edit-meta': () => CreatorManager.editMeta(),
            'validate-meta': () => {
                const title = document.getElementById('builderTitle').value.trim();
                document.getElementById('btnConfirmMeta').disabled = !title;
            },
            'validate-builder': (e, target) => {
                if (target.classList.contains('q-enunciado')) {
                    const counter = target.previousElementSibling.querySelector('.char-counter');
                    if (counter) counter.textContent = `${target.value.length}/${target.maxLength}`;
                }
                CreatorManager.validateGlobal();
            },
            'add-question': () => CreatorManager.addQuestion(),
            'remove-question': (e, target) => {
                const id = target.dataset.target;
                document.getElementById(id).remove();
                CreatorManager.renumberQuestions();
                CreatorManager.validateGlobal();
            },
            'add-alternative': (e, target) => {
                CreatorManager.addAlternative(target.dataset.target);
            },
            'remove-alternative': (e, target) => {
                const id = target.dataset.target;
                document.getElementById(id).remove();
                CreatorManager.validateGlobal();
            },
            'preview-json': () => CreatorManager.preview(),
            'export-json': () => {
                const quiz = CreatorManager.buildQuizObject();
                if (!quiz) return;
                window.pendingSaveQuiz = quiz;
                ModalManager.open('exportOptionsModal');
            },

            // Quiz
            'confirm-answer': () => {
                QuizEngine.confirm();
                renderQuestion();
            },
            'next-question': () => {
                QuizEngine.next();
                renderQuestion();
            },
            'prev-question': () => {
                QuizEngine.prev();
                renderQuestion();
            },
            'select-alternative': (e, target) => {
                const id = target.dataset.id;
                QuizEngine.select(id);
                renderQuestion();
            },
            'jump-to-question': (e, target) => {
                const index = parseInt(target.dataset.index);
                QuizEngine.goTo(index);
                ScreenManager.change(CONFIG.ELEMENTS.QUIZ_SCREEN);
                renderQuestion();
            },
            'finish-quiz': () => finalizeQuiz(),
            'finalize-process': () => finalizeQuizProcess(),
            'back-to-quiz': () => {
                ScreenManager.change(CONFIG.ELEMENTS.QUIZ_SCREEN);
                renderQuestion();
            },
            'reset-quiz': () => {
                QuizEngine.reset();
                ScreenManager.change(CONFIG.ELEMENTS.QUIZ_SCREEN);
                renderQuestion();
            },

            // Library
            'load-quiz': (e, target) => {
                const id = target.dataset.id;
                const lib = StorageManager.getLibrary();
                const item = lib.find(i => i.id === id);
                if (item) ScreenManager.loadQuiz(item.data, id);
            },
            'download-quiz': (e, target) => {
                const id = target.dataset.id;
                const lib = StorageManager.getLibrary();
                const item = lib.find(i => i.id === id);
                if (item) {
                    const blob = new Blob([JSON.stringify(item.data, null, 2)], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = item.data.nomeSimulado + ".json";
                    a.click();
                }
            },
            'delete-quiz': (e, target) => LibraryManager.delete(target.dataset.id),
            'search-library': () => LibraryManager.render(),

            // Modals & UI
            'close-modal': (e, target) => ModalManager.close(target.dataset.target),
            'modal-cancel': () => ModalManager.close('customModal'),
            'modal-confirm': () => ModalManager.close('customModal'),
            'copy-clipboard': () => {
                const text = document.getElementById('previewCode').textContent;
                navigator.clipboard.writeText(text).then(() => {
                    ToastSystem.show("Copiado!", "success");
                });
            },
            'toggle-visibility': () => {
                const bar = document.getElementById('quizInfoBar');
                const btn = bar.querySelector('.toggle-visibility-btn');
                const isHidden = bar.classList.toggle('hidden-panel');
                btn.innerHTML = isHidden ? IconSystem.render('eyeOff', 'xs') : IconSystem.render('eye', 'xs');
            },
            'toggle-collapse': (e, target) => {
                const id = target.dataset.target;
                document.getElementById(id).classList.toggle('collapsed');
            },
            'select-file-trigger': () => document.getElementById('fileInput').click(),
            'confirm-export': () => finalizeExport()
        });

        // Decision Modal
        const actionModal = document.getElementById('builderActionModal');
        
        // Custom Modal OK button handler
        const modalConfirmBtn = document.getElementById('modalBtnConfirm');
        if (modalConfirmBtn) {
            modalConfirmBtn.addEventListener('click', () => {
                // If it's not a generic alert, the onclick will be handled by the logic that opened it
                // If it's generic, we just close.
                if (!modalConfirmBtn.onclick) ModalManager.close('customModal');
            });
        }

        // Global Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') ModalManager.closeAll();
            if (e.ctrlKey && e.key === 's') {
                const creator = document.getElementById(CONFIG.ELEMENTS.CREATOR_SCREEN);
                if (creator && !creator.classList.contains('hidden')) {
                    e.preventDefault();
                    saveDraft();
                    ToastSystem.show("Rascunho salvo!", "info");
                }
            }
        });

        // Double Tap Header Control
        let lastTap = 0;
        document.addEventListener('touchend', (e) => {
            if (window.innerWidth >= 768) return;
            if (e.target.closest('.btn') || e.target.closest('input') || e.target.closest('label') || e.target.closest('.header')) return;
            const currentTime = new Date().getTime();
            if (currentTime - lastTap < 300) {
                document.querySelectorAll('.header').forEach(h => h.classList.toggle('header-hidden'));
                e.preventDefault();
            }
            lastTap = currentTime;
        });

        // Intervals
        setInterval(saveDraft, CONFIG.TIMINGS.AUTOSAVE_INTERVAL);

        // Ripple Effect
        document.addEventListener('mousedown', (e) => {
            const button = e.target.closest('.btn');
            if (!button) return;
            const circle = document.createElement("span");
            const diameter = Math.max(button.clientWidth, button.clientHeight);
            const radius = diameter / 2;
            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${e.clientX - button.getBoundingClientRect().left - radius}px`;
            circle.style.top = `${e.clientY - button.getBoundingClientRect().top - radius}px`;
            circle.className = "ripple";
            button.querySelectorAll('.ripple').forEach(r => r.remove());
            button.appendChild(circle);
        });

        // File Listeners
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.onchange = (e) => FileHandler.handle(e.target.files[0]);

        // Helpers
        function renderQuestion() {
            const data = QuizEngine.getCurrentData();
            const q = data.question;
            const container = document.getElementById('questionContainer');
            if(!container) return;

            const inputType = q.tipo === CONFIG.QUESTION_TYPES.SINGLE ? 'radio' : 'checkbox';
            container.innerHTML = '';

            const textDiv = document.createElement('div');
            textDiv.className = 'question-text';
            textDiv.innerHTML = `<span class="badge" style="margin-bottom: var(--space-sm); display: block; width: fit-content;">QUESTÃO ${data.index + 1}/${data.total}</span>${q.enunciado}`;
            if (q.tipo === CONFIG.QUESTION_TYPES.MULTIPLE) {
                textDiv.innerHTML += `<div class="font-mono text-primary" style="font-size: var(--font-tiny); margin-top: var(--space-xs);">(SELECIONE EXATAMENTE ${q.respostasCorretas.length})</div>`;
            }
            container.appendChild(textDiv);

            q.alternativas.forEach(alt => {
                const checked = data.userAnswer && (Array.isArray(data.userAnswer) ? data.userAnswer.includes(alt.id) : data.userAnswer === alt.id);
                const isCorrect = q.respostasCorretas.includes(alt.id);
                let cls = 'alternative';
                if (data.isAnswered) {
                    cls += ' disabled';
                    if (isCorrect) cls += ' correct';
                    else if (checked) cls += ' incorrect';
                } else if (checked) cls += ' selected';

                const div = document.createElement('div');
                div.className = cls;
                if (!data.isAnswered) {
                    div.dataset.action = 'select-alternative';
                    div.dataset.id = alt.id;
                }
                div.innerHTML = `
                    <input type="${inputType}" ${checked ? 'checked' : ''} ${data.isAnswered ? 'disabled' : ''} style="pointer-events:none;">
                    <span class="alternative-text">${alt.texto}</span>
                    <div style="margin-left:auto">${data.isAnswered && (checked || isCorrect) ? (isCorrect ? IconSystem.render('check', 'sm') : IconSystem.render('cross', 'sm')) : ''}</div>
                `;
                container.appendChild(div);
            });

            if (data.isAnswered) {
                const correct = QuizEngine.checkAnswer(data.index);
                const fb = document.createElement('div');
                fb.className = `feedback-message ${correct ? 'correct' : 'incorrect'}`;
                fb.innerHTML = `<div>${!correct ? `CORRETO: <strong>${q.respostasCorretas.join(', ').toUpperCase()}</strong>` : 'RESPOSTA CORRETA'}</div>`;
                container.appendChild(fb);
            }
            renderGrid();
            updateNav(data);
            IconSystem.inject(container); // Injeta ícones dinâmicos nas alternativas
        }

        function renderGrid() {
            const grid = document.getElementById('questionGrid');
            const state = QuizEngine.getState();
            if (!grid) return;
            grid.innerHTML = '';
            state.quizData.questoes.forEach((_, i) => {
                const item = document.createElement('div');
                item.className = 'grid-item';
                if (i === state.currentQuestion) item.classList.add('current');
                if (state.questionAnswered[i]) {
                    item.classList.add(QuizEngine.checkAnswer(i) ? 'answered-correct' : 'answered-incorrect');
                } else if (state.visitedQuestions[i]) item.classList.add('visited');
                item.textContent = i + 1;
                item.dataset.action = 'jump-to-question';
                item.dataset.index = i;
                grid.appendChild(item);
            });
        }

        function updateNav(data) {
            const state = QuizEngine.getState();
            const canConfirm = QuizEngine.canConfirmCurrent();
            document.getElementById('prevBtn').disabled = data.index === 0;
            document.getElementById('confirmBtn').classList.toggle('hidden', data.isAnswered || !canConfirm);
            document.getElementById('skipBtn').classList.toggle('hidden', data.isAnswered || data.isLast); 
            document.getElementById('nextBtn').classList.toggle('hidden', !data.isAnswered || data.isLast);
            // Botão Finalizar só aparece na última questão SE ela estiver respondida/confirmada
            document.getElementById('finishBtn').classList.toggle('hidden', !(data.isLast && data.isAnswered));
            const fill = document.getElementById('progressFill');
            if(fill) fill.style.width = ((data.index + 1) / data.total * 100) + '%';
            document.getElementById('correctCount').textContent = state.correctCount;
            document.getElementById('incorrectCount').textContent = state.incorrectCount;
        }

        function finalizeQuiz() {
            renderFinalReview();
            ScreenManager.change(CONFIG.ELEMENTS.REVIEW_SCREEN);
        }

        // Helper for DRY Card Rendering
        function createReviewCard(q, i, badge, isClickable = false, extraContent = '') {
            const div = document.createElement('div');
            div.className = `review-card ${isClickable ? '' : badge.statusClass || ''}`;
            if (isClickable) {
                div.style.cursor = 'pointer';
                div.style.borderColor = 'var(--primary-500)';
                div.dataset.action = 'jump-to-question';
                div.dataset.index = i;
            }
            
            // Truncate text for cards, but maybe allow full text? 
            // Previous implementation used substring(0, 120) for pending and full for result.
            // Let's keep consistent short view for cards to save space, or use specific logic.
            // Result view previously showed full text. Let's respect that difference via extraContent or logic.
            const text = isClickable ? (q.enunciado.substring(0, 120) + (q.enunciado.length > 120 ? '...' : '')) : q.enunciado;

            div.innerHTML = `
                <div class="review-card-header">
                    <span class="text-primary">QUESTÃO ${i+1}</span>
                    <span class="badge ${badge.class}">${badge.text}</span>
                </div>
                <div class="review-card-body">${text}</div>
                ${extraContent}
            `;
            return div;
        }

        function renderFinalReview() {
            const list = document.getElementById('finalReviewList');
            const state = QuizEngine.getState();
            if (!list) return;
            list.innerHTML = '';
            
            // Filtra apenas questões não respondidas
            const pendingQuestions = state.quizData.questoes.map((q, i) => ({ q, i, answered: state.questionAnswered[i] }))
                                                        .filter(item => !item.answered);

            if (pendingQuestions.length === 0) {
                list.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--success);">
                        <span data-icon="check" data-size="xl" style="margin-bottom: 16px; display: block; margin: 0 auto 16px;"></span>
                        <h3>Tudo Respondido!</h3>
                        <p style="color: var(--text-secondary); margin-top: 8px;">Você confirmou todas as questões.</p>
                    </div>
                `;
                IconSystem.inject(list);
                return;
            }

            pendingQuestions.forEach(item => {
                const card = createReviewCard(
                    item.q, 
                    item.i, 
                    { text: 'PENDENTE ⚠', class: 'pending' }, 
                    true, 
                    '<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; font-style: italic;">Clique para responder</div>'
                );
                list.appendChild(card);
            });
            IconSystem.inject(list);
        }

        function finalizeQuizProcess() {
            const stats = QuizEngine.getStats();
            QuizEngine.saveStatsToLibrary();
            document.getElementById('resultScore').textContent = `${stats.correct}/${stats.total}`;
            document.getElementById('resultPercentage').textContent = `${stats.percent}%`;
            const rev = document.getElementById('reviewContainer');
            if(!rev) return;
            
            rev.innerHTML = ''; // Clear previous content
            
            QuizEngine.getState().quizData.questoes.forEach((q, i) => {
                const status = QuizEngine.getQuestionStatus(i);
                
                const statusMap = {
                    'correct': { text: 'ACERTO', class: 'correct', statusClass: 'correct' },
                    'incorrect': { text: 'ERRO', class: 'incorrect', statusClass: 'incorrect' },
                    'pending': { text: 'PULOU', class: 'pending', statusClass: 'skipped' }
                };

                const card = createReviewCard(q, i, statusMap[status], false);
                rev.appendChild(card);
            });
            ScreenManager.change(CONFIG.ELEMENTS.RESULT_SCREEN);
        }

        function finalizeExport() {
            const quiz = CreatorManager.buildQuizObject();
            if (!quiz) return;
            const blob = new Blob([JSON.stringify(quiz, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = quiz.nomeSimulado.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".json";
            a.click();
            const shouldSave = document.getElementById('saveToLibCheckbox').checked;
            let savedId = shouldSave ? StorageManager.addToLibrary(quiz).id : null;
            ModalManager.close('exportOptionsModal');
            document.getElementById('btnActionLoad').onclick = () => {
                ModalManager.close('builderActionModal');
                ScreenManager.loadQuiz(quiz, savedId);
            };
            ModalManager.open('builderActionModal');
        }

        function saveDraft() {
            const creator = document.getElementById(CONFIG.ELEMENTS.CREATOR_SCREEN);
            if (creator && !creator.classList.contains('hidden')) {
                const title = document.getElementById('builderTitle').value;
                const desc = document.getElementById('builderDesc').value;
                if (title || desc) StorageManager.saveDraft({ title, desc, timestamp: Date.now() });
            }
        }

        // Expose renderQuestion for FileHandler/Library
        window.renderQuestion = renderQuestion;
    });
})();