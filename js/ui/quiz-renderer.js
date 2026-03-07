(function(window) {
    const QuizRenderer = {

        renderQuestion() {
            const data = QuizEngine.getCurrentData();
            const container = document.getElementById('questionContainer');
            if (!container) return;

            container.innerHTML = '';
            container.appendChild(this._buildQuestionHeader(data));
            data.question.alternativas.forEach(alt => {
                container.appendChild(this._buildAlternative(alt, data));
            });

            if (data.isAnswered) {
                container.appendChild(this._buildFeedback(data));
            }

            this.renderGrid();
            this._updateNav(data);
            IconSystem.inject(container);

            this._focusContainer(container);
        },

        _buildQuestionHeader(data) {
            const div = document.createElement('div');
            div.className = 'question-text';

            const badge = `<span class="badge" style="margin-bottom:var(--space-sm);display:block;width:fit-content;">QUESTÃO ${data.index + 1}/${data.total}</span>`;
            const hint = data.question.tipo === CONFIG.QUESTION_TYPES.MULTIPLE
                ? `<div class="font-mono text-primary" style="font-size:var(--font-tiny);margin-top:var(--space-xs);" aria-live="polite">(SELECIONE EXATAMENTE ${data.question.respostasCorretas.length})</div>`
                : '';

            div.innerHTML = badge + data.question.enunciado + hint;
            return div;
        },

        _buildAlternative(alt, data) {
            const { question, userAnswer, isAnswered } = data;
            const inputType = question.tipo === CONFIG.QUESTION_TYPES.SINGLE ? 'radio' : 'checkbox';
            const isSelected = userAnswer && (Array.isArray(userAnswer) ? userAnswer.includes(alt.id) : userAnswer === alt.id);
            const isCorrect = question.respostasCorretas.includes(alt.id);

            let cls = 'alternative';
            let ariaLabel = alt.texto;

            if (isAnswered) {
                cls += ' disabled';
                if (isCorrect) { cls += ' correct'; ariaLabel += ' — resposta correta'; }
                else if (isSelected) { cls += ' incorrect'; ariaLabel += ' — resposta incorreta'; }
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

            const text = document.createElement('span');
            text.className = 'alternative-text';
            text.textContent = alt.texto;

            const icon = document.createElement('div');
            icon.style.marginLeft = 'auto';
            if (isAnswered && (isSelected || isCorrect)) {
                icon.innerHTML = isCorrect
                    ? IconSystem.render('check', 'sm')
                    : IconSystem.render('cross', 'sm');
            }

            wrapper.append(input, text, icon);
            return wrapper;
        },

        _buildFeedback(data) {
            const correct = QuizEngine.checkAnswer(data.index);
            const div = document.createElement('div');
            div.className = `feedback-message ${correct ? 'correct' : 'incorrect'}`;
            div.setAttribute('role', 'status');
            div.setAttribute('aria-live', 'assertive');
            div.innerHTML = `<div>${!correct
                ? `CORRETO: <strong>${data.question.respostasCorretas.join(', ').toUpperCase()}</strong>`
                : 'RESPOSTA CORRETA'
            }</div>`;
            return div;
        },

        renderGrid() {
            const grid = document.getElementById('questionGrid');
            const state = QuizEngine.getState();
            if (!grid) return;

            grid.innerHTML = '';
            grid.setAttribute('role', 'list');
            grid.setAttribute('aria-label', 'Navegação entre questões');

            state.quizData.questoes.forEach((_, i) => {
                const item = document.createElement('button');
                item.className = 'grid-item';
                item.setAttribute('role', 'listitem');
                item.type = 'button';

                const isCurrent = i === state.currentQuestion;
                const isAnswered = state.questionAnswered[i];
                const isCorrect = isAnswered && QuizEngine.checkAnswer(i);
                const isVisited = state.visitedQuestions[i];

                if (isCurrent) item.classList.add('current');
                if (isAnswered) item.classList.add(isCorrect ? 'answered-correct' : 'answered-incorrect');
                else if (isVisited) item.classList.add('visited');

                const statusText = isCurrent ? 'atual' : isAnswered ? (isCorrect ? 'correta' : 'incorreta') : isVisited ? 'visitada' : 'não visitada';
                item.setAttribute('aria-label', `Questão ${i + 1}, ${statusText}`);
                item.setAttribute('aria-current', isCurrent ? 'true' : 'false');

                item.textContent = i + 1;
                item.dataset.action = 'jump-to-question';
                item.dataset.index = i;
                grid.appendChild(item);
            });
        },

        _updateNav(data) {
            const state = QuizEngine.getState();
            const canConfirm = QuizEngine.canConfirmCurrent();
            const fill = document.getElementById('progressFill');

            document.getElementById('prevBtn').disabled = data.index === 0;
            document.getElementById('confirmBtn').classList.toggle('hidden', data.isAnswered || !canConfirm);
            document.getElementById('skipBtn').classList.toggle('hidden', data.isAnswered || data.isLast);
            document.getElementById('nextBtn').classList.toggle('hidden', !data.isAnswered || data.isLast);
            document.getElementById('finishBtn').classList.toggle('hidden', !(data.isLast && data.isAnswered));

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