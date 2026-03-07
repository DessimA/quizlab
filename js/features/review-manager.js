(function(window) {
    const ReviewManager = {

        renderFinalReview() {
            const list = document.getElementById('finalReviewList');
            const state = QuizEngine.getState();
            if (!list) return;

            list.innerHTML = '';
            const pending = state.quizData.questoes
                .map((q, i) => ({ q, i }))
                .filter(({ i }) => !state.questionAnswered[i]);

            if (pending.length === 0) {
                list.innerHTML = `
                    <div style="text-align:center;padding:40px;color:var(--success);" role="status">
                        <span data-icon="check" data-size="xl" style="display:block;margin:0 auto 16px;"></span>
                        <h3>Tudo Respondido!</h3>
                        <p style="color:var(--text-secondary);margin-top:8px;">Você confirmou todas as questões.</p>
                    </div>`;
                IconSystem.inject(list);
            } else {
                pending.forEach(({ q, i }) => list.appendChild(this._buildPendingCard(q, i)));
                IconSystem.inject(list);
            }

            ScreenManager.change(CONFIG.ELEMENTS.REVIEW_SCREEN);
            document.getElementById('finalReviewList')?.querySelector('button, [tabindex]')?.focus();
        },

        finalizeProcess() {
            const stats = QuizEngine.getStats();
            QuizEngine.saveStatsToLibrary();

            document.getElementById('resultScore').textContent = `${stats.correct}/${stats.total}`;
            document.getElementById('resultPercentage').textContent = `${stats.percent}%`;

            const rev = document.getElementById('reviewContainer');
            if (!rev) return;

            rev.innerHTML = '';
            const statusMap = {
                correct:   { text: 'ACERTO', cls: 'correct' },
                incorrect: { text: 'ERRO',   cls: 'incorrect' },
                pending:   { text: 'PULOU',  cls: 'pending' }
            };

            QuizEngine.getState().quizData.questoes.forEach((q, i) => {
                const status = QuizEngine.getQuestionStatus(i);
                rev.appendChild(this._buildResultCard(q, i, statusMap[status]));
            });

            ScreenManager.change(CONFIG.ELEMENTS.RESULT_SCREEN);
        },

        _buildPendingCard(q, i) {
            const btn = document.createElement('button');
            btn.className = 'review-card';
            btn.type = 'button';
            btn.style.cssText = 'cursor:pointer;border-color:var(--primary-500);width:100%;text-align:left;';
            btn.setAttribute('aria-label', `Questão ${i + 1} pendente. Clique para responder.`);
            btn.dataset.action = 'jump-to-question';
            btn.dataset.index = i;

            const text = q.enunciado.length > 120 ? q.enunciado.substring(0, 120) + '...' : q.enunciado;
            btn.innerHTML = `
                <div class="review-card-header">
                    <span class="text-primary">QUESTÃO ${i + 1}</span>
                    <span class="badge pending">PENDENTE ⚠</span>
                </div>
                <div class="review-card-body">${text}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;font-style:italic;">Clique para responder</div>`;
            return btn;
        },

        _buildResultCard(q, i, status) {
            const div = document.createElement('div');
            div.className = 'review-card';
            div.setAttribute('aria-label', `Questão ${i + 1}: ${status.text}`);
            div.innerHTML = `
                <div class="review-card-header">
                    <span class="text-primary">QUESTÃO ${i + 1}</span>
                    <span class="badge ${status.cls}">${status.text}</span>
                </div>
                <div class="review-card-body">${q.enunciado}</div>`;
            return div;
        }
    };

    window.ReviewManager = ReviewManager;
})(window);