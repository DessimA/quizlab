(function(window) {
    const QuizRenderer = {
        renderQuestion() {
            const data = QuizEngine.getCurrentData();
            const container = document.getElementById('questionContainer');
            if (!container) return;

            container.innerHTML = '';
            container.appendChild(this._buildQuestionHeader(data));
            data.question.alternativas.forEach((alt, index) => {
                container.appendChild(this._buildAlternative(alt, data, index));
            });

            if (data.isAnswered) {
                const feedback = this._buildFeedback(data);
                if (feedback) container.appendChild(feedback);
            }

            this.renderGrid();
            this._updateNav(data);
            this._updateModeIndicator(data.mode);
            IconSystem.inject(container);
            this._focusContainer(container);
        },

        _buildQuestionHeader(data) {
            const div = document.createElement('div');
            div.className = 'question-text';

            const flagColor = data.isFlagged ? 'var(--error)' : 'var(--text-muted)';
            const flagTitle = data.isFlagged ? 'Remover marcação' : 'Marcar para revisão';
            const flagIcon = IconSystem.render('flag', 'sm');

            const badge = `<span class="badge" style="margin-bottom:var(--space-sm);display:block;width:fit-content;">QUESTÃO ${data.index + 1}/${data.total}</span>`;
            const flagBtn = `<button class="btn btn-ghost" data-action="flag-question" title="${flagTitle}"
                style="float:right;color:${flagColor};padding:2px 6px;" aria-label="${flagTitle}">${flagIcon}</button>`;
            const hint = data.question.tipo === CONFIG.QUESTION_TYPES.MULTIPLE
                ? `<div class="font-mono text-primary" style="font-size:var(--font-tiny);margin-top:var(--space-xs);" aria-live="polite">(SELECIONE EXATAMENTE ${data.question.respostasCorretas.length})</div>`
                : '';

            div.innerHTML = badge + flagBtn + data.question.enunciado + hint;
            return div;
        },

        _buildAlternative(alt, data, index = 0) {
            const { question, userAnswer, isAnswered, mode } = data;
            const inputType = question.tipo === CONFIG.QUESTION_TYPES.SINGLE ? 'radio' : 'checkbox';
            const isSelected = userAnswer && (Array.isArray(userAnswer) ? userAnswer.includes(alt.id) : userAnswer === alt.id);
            const isCorrect = question.respostasCorretas.includes(alt.id);
            const isExam = mode === CONFIG.QUIZ_MODES.EXAM;

            let cls = 'alternative';
            let ariaLabel = alt.texto;

            if (isAnswered) {
                cls += ' disabled';
                if (!isExam) {
                    if (isCorrect) { cls += ' correct'; ariaLabel += ' resposta correta'; }
                    else if (isSelected) { cls += ' incorrect'; ariaLabel += ' resposta incorreta'; }
                } else if (isSelected) {
                    cls += ' selected';
                }
            } else if (isSelected) {
                cls += ' selected';
            }

            const wrapper = document.createElement('label');
            wrapper.className = cls;
            wrapper.setAttribute('aria-label', ariaLabel);

            const input = document.createElement('input');
            input.type = inputType;
            input.name = 'quiz-question';
            input.checked = !!isSelected;
            input.disabled = isAnswered;
            input.setAttribute('aria-label', ariaLabel);

            if (!isAnswered) {
                input.dataset.action = 'select-alternative';
                input.dataset.id = alt.id;
            }

            const letter = String.fromCharCode(65 + index); // 0→A, 1→B, 2→C...
            const text = document.createElement('span');
            text.className = 'alternative-text';
            text.textContent = `${letter}. ${alt.texto}`;

            const icon = document.createElement('div');
            icon.style.marginLeft = 'auto';
            if (isAnswered && !isExam && (isSelected || isCorrect)) {
                icon.innerHTML = isCorrect
                    ? IconSystem.render('check', 'sm')
                    : IconSystem.render('cross', 'sm');
            }

            wrapper.append(input, text, icon);
            return wrapper;
        },

        _buildFeedback(data) {
            if (data.mode === CONFIG.QUIZ_MODES.EXAM) return null;

            const correct = QuizEngine.checkAnswer(data.index);
            const div = document.createElement('div');
            div.className = `feedback-message ${correct ? 'correct' : 'incorrect'}`;
            div.setAttribute('role', 'status');
            div.setAttribute('aria-live', 'assertive');
            
            const correctLetters = data.question.respostasCorretas.map(correctId => {
                const idx = data.question.alternativas.findIndex(a => a.id === correctId);
                return idx >= 0 ? String.fromCharCode(65 + idx) : correctId.toUpperCase();
            });

            div.innerHTML = `<div>${correct
                ? 'RESPOSTA CORRETA'
                : `RESPOSTA INCORRETA CORRETO: <strong>${correctLetters.join(', ')}</strong>`
            }</div>`;
            return div;
        },

        renderGrid() {
            const grid = document.getElementById('questionGrid');
            const state = QuizEngine.getState();
            if (!grid) return;

            const isExam = state.mode === CONFIG.QUIZ_MODES.EXAM;

            grid.innerHTML = '';
            grid.setAttribute('role', 'list');
            grid.setAttribute('aria-label', 'Navegação entre questões');

            state.quizData.questoes.forEach((_, i) => {
                const status = QuizEngine.getQuestionStatus(i);
                const isCurrent = i === state.currentQuestion;
                const isFlagged = QuizEngine.isFlagged(i);

                const item = document.createElement('button');
                item.className = 'grid-item';
                item.setAttribute('role', 'listitem');
                item.type = 'button';

                if (isCurrent) item.classList.add('current');
                if (status === 'correct') item.classList.add(isExam ? 'visited' : 'answered-correct');
                if (status === 'incorrect') item.classList.add(isExam ? 'visited' : 'answered-incorrect');
                if (status === 'skipped') item.classList.add('visited');
                if (isFlagged) item.style.outline = '2px solid var(--error)';

                const statusLabel = { correct: 'correta', incorrect: 'incorreta', skipped: 'pulada', pending: 'não visitada' };
                item.setAttribute('aria-label', `Questão ${i + 1}${isFlagged ? ' (marcada)' : ''}, ${isCurrent ? 'atual' : statusLabel[status]}`);
                item.setAttribute('aria-current', isCurrent ? 'true' : 'false');
                item.textContent = i + 1;
                item.dataset.action = 'jump-to-question';
                item.dataset.index = i;
                grid.appendChild(item);
            });
        },

        _updateModeIndicator(mode) {
            const el = document.getElementById('modeIndicator');
            if (!el) return;
            el.textContent = mode === CONFIG.QUIZ_MODES.EXAM ? 'EXAME' : 'ESTUDO';
            el.style.color = mode === CONFIG.QUIZ_MODES.EXAM ? 'var(--error)' : 'var(--success)';
        },

        _updateNav(data) {
            const state = QuizEngine.getState();
            const canConfirm = QuizEngine.canConfirmCurrent();
            const fill = document.getElementById('progressFill');
            const isExam = state.mode === CONFIG.QUIZ_MODES.EXAM;

            document.getElementById('prevBtn').disabled = data.index === 0;
            document.getElementById('confirmBtn').classList.toggle('hidden', data.isAnswered || !canConfirm);
            document.getElementById('skipBtn').classList.toggle('hidden', data.isAnswered || data.isLast);
            document.getElementById('nextBtn').classList.toggle('hidden', !data.isAnswered || data.isLast);
            document.getElementById('finishBtn').classList.toggle('hidden', !(data.isLast && data.isAnswered));

            const scoreDisplay = document.querySelector('.score-display');
            if (scoreDisplay) scoreDisplay.style.visibility = isExam ? 'hidden' : 'visible';

            if (fill) {
                const percent = ((data.index + 1) / data.total) * 100;
                fill.style.width = percent + '%';
                fill.setAttribute('aria-valuenow', Math.round(percent));
            }

            document.getElementById('correctCount').textContent = state.correctCount;
            document.getElementById('incorrectCount').textContent = state.incorrectCount;
        },

        _focusContainer(container) {
            const heading = container.querySelector('.question-text');
            if (heading) {
                heading.setAttribute('tabindex', '-1');
                heading.focus();
            }
        }
    };

    window.QuizRenderer = QuizRenderer;
})(window);
