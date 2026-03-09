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
            this._extractAndSaveWrongQuestions();
            const stats = QuizEngine.getStats();
            QuizEngine.saveStatsToLibrary();
            QuizEngine.stopTimer();

            document.getElementById('resultScore').textContent = `${stats.correct}/${stats.total}`;
            document.getElementById('resultPercentage').textContent = `${stats.percent}%`;

            const rev = document.getElementById('reviewContainer');
            if (!rev) return;

            rev.innerHTML = '';

            if (stats.flagged.length > 0) {
                rev.appendChild(this._buildFlaggedSection(stats.flagged));
            }

            const statusMap = {
                correct: { text: 'ACERTO', cls: 'correct' },
                incorrect: { text: 'ERRO', cls: 'incorrect' },
                skipped: { text: 'PULOU', cls: 'pending' },
                pending: { text: 'NÃO VIU', cls: 'pending' }
            };

            QuizEngine.getState().quizData.questoes.forEach((q, i) => {
                const status = QuizEngine.getQuestionStatus(i);
                rev.appendChild(this._buildResultCard(q, i, statusMap[status]));
            });

            this._renderHistory(rev);
            ScreenManager.change(CONFIG.ELEMENTS.RESULT_SCREEN);
        },

        _extractAndSaveWrongQuestions() {
            const state = QuizEngine.getState();
            const quizData = state.quizData;

            if (state.libraryId) {
                this._updateWrongForQuiz(state.libraryId, quizData, state);
                return;
            }

            if (quizData._reviewSources) {
                this._updateWrongFromReview(quizData, state);
            }
        },

        _updateWrongForQuiz(libraryId, quizData, state) {
            const item = StorageManager.getById(libraryId);
            if (!item) return;

            const existingMap = new Map(
                (item.meta.wrongQuestions || []).map(wq => [String(wq.questao.id), wq])
            );

            quizData.questoes.forEach((q, i) => {
                if (!state.questionAnswered[i]) return;

                const key = String(q.id);
                if (QuizEngine.checkAnswer(i)) {
                    existingMap.delete(key);
                } else {
                    const prev = existingMap.get(key);
                    existingMap.set(key, {
                        sourceQuizId: libraryId,
                        sourceQuizName: quizData.nomeSimulado,
                        questao: q,
                        errorCount: prev ? prev.errorCount + 1 : 1
                    });
                }
            });

            StorageManager.saveWrongQuestions(libraryId, _capWrongList([...existingMap.values()]));
        },

        _updateWrongFromReview(quizData, state) {
            const bySource = {};

            quizData.questoes.forEach((q, i) => {
                if (!state.questionAnswered[i]) return;

                const sourceQuizId = quizData._reviewSources[String(q.id)];
                if (!sourceQuizId) return;

                if (!bySource[sourceQuizId]) bySource[sourceQuizId] = [];
                bySource[sourceQuizId].push({ questao: q, isCorrect: QuizEngine.checkAnswer(i) });
            });

            Object.entries(bySource).forEach(([sourceQuizId, entries]) => {
                const item = StorageManager.getById(sourceQuizId);
                if (!item) return;

                const existingMap = new Map(
                    (item.meta.wrongQuestions || []).map(wq => [String(wq.questao.id), wq])
                );

                entries.forEach(({ questao, isCorrect }) => {
                    const key = String(questao.id);
                    if (isCorrect) {
                        existingMap.delete(key);
                    } else {
                        const prev = existingMap.get(key);
                        existingMap.set(key, {
                            sourceQuizId,
                            sourceQuizName: item.data.nomeSimulado,
                            questao,
                            errorCount: prev ? prev.errorCount + 1 : 1
                        });
                    }
                });

                StorageManager.saveWrongQuestions(sourceQuizId, _capWrongList([...existingMap.values()]));
            });
        },

        _buildFlaggedSection(flaggedIndexes) {
            const flagIcon = IconSystem.render('flag', 'sm', 'color:var(--error);vertical-align:middle;');
            const section = document.createElement('div');
            section.style.cssText = 'margin-bottom:var(--space-lg);padding:var(--space-md);border:1px solid var(--error);border-radius:var(--radius-md);background:var(--error-bg);';
            section.innerHTML = `
                <div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--error);margin-bottom:var(--space-sm);display:flex;align-items:center;gap:4px;">
                    ${flagIcon} QUESTÕES MARCADAS (${flaggedIndexes.length})
                </div>
                <div style="font-size:0.85rem;color:var(--text-secondary);">
                    ${flaggedIndexes.map(i => `<span class="badge" style="margin-right:4px;">Q.${i + 1}</span>`).join('')}
                </div>`;
            return section;
        },

        _renderHistory(container) {
            if (!QuizEngine.getState().libraryId) return;
            const lib = StorageManager.getLibrary();
            const item = lib.find(i => i.id === QuizEngine.getState().libraryId);
            if (!item || !item.meta.history || item.meta.history.length < 2) return;

            const section = document.createElement('div');
            section.style.cssText = 'margin-top:var(--space-xl);padding-top:var(--space-lg);border-top:1px solid var(--border-glass);';
            section.innerHTML = `
                <div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted);margin-bottom:var(--space-md);">HISTÓRICO DE TENTATIVAS</div>
                <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;">
                    ${item.meta.history.map((h, idx) => `
                        <div style="flex:1;min-width:80px;text-align:center;padding:var(--space-sm);background:var(--bg-glass);border:1px solid var(--border-glass);border-radius:var(--radius-sm);">
                            <div style="font-family:var(--font-mono);font-size:1.1rem;font-weight:700;color:${h.score >= 70 ? 'var(--success)' : h.score >= 50 ? 'var(--primary-500)' : 'var(--error)'};">${h.score}%</div>
                            <div style="font-size:0.65rem;color:var(--text-muted);">${new Date(h.playedAt).toLocaleDateString()}</div>
                            <div style="font-size:0.65rem;color:var(--text-muted);">${h.correct}/${h.total}</div>
                        </div>
                    `).join('')}
                </div>`;
            container.appendChild(section);
        },

        _buildPendingCard(q, i) {
            const btn = document.createElement('button');
            btn.className = 'review-card';
            btn.type = 'button';
            btn.style.cssText = 'cursor:pointer;border-color:var(--primary-500);width:100%;text-align:left;';
            btn.setAttribute('aria-label', `Questão ${i + 1} pendente. Clique para responder.`);
            btn.dataset.action = 'jump-to-question';
            btn.dataset.index = i;

            btn.innerHTML = `
                <div class="review-card-header">
                    <span style="font-family:var(--font-mono);font-size:0.75rem;">Q.${String(i + 1).padStart(2, '0')}</span>
                    <span class="badge" style="background:rgba(255,215,0,0.1);color:#ffd700;border-color:#ffd700;">PENDENTE</span>
                </div>
                <div class="review-card-body">${Utils.truncate(q.enunciado)}</div>`;
            return btn;
        },

        _buildResultCard(q, i, statusInfo) {
            const div = document.createElement('div');
            div.className = 'review-card';
            const isFlagged = QuizEngine.isFlagged(i);
            const flagIcon = isFlagged 
                ? IconSystem.render('flag', 'xs', 'color:var(--error);vertical-align:middle;margin-left:4px;') 
                : '';

            const showDetail = statusInfo.cls !== 'correct';
            const detailHtml = showDetail ? this._buildAnswerDetail(q, i) : '';

            div.innerHTML = `
                <div class="review-card-header">
                    <span style="font-family:var(--font-mono);font-size:0.75rem;display:flex;align-items:center;">
                        Q.${String(i + 1).padStart(2, '0')}${flagIcon}
                    </span>
                    <span class="badge ${statusInfo.cls}">${statusInfo.text}</span>
                </div>
                <div class="review-card-body">${showDetail ? q.enunciado : Utils.truncate(q.enunciado)}</div>
                ${detailHtml}`;
            return div;
        },

        _buildAnswerDetail(q, i) {
            const state = QuizEngine.getState();
            const raw = state.userAnswers[i];
            const userIds = Array.isArray(raw) ? raw : (raw ? [raw] : []);

            const altsHtml = q.alternativas.map((alt, idx) => {
                const isCorrect = q.respostasCorretas.includes(alt.id);
                const isChosen = userIds.includes(alt.id);

                if (!isCorrect && !isChosen) return '';

                const letter = String.fromCharCode(65 + idx);
                const color = isCorrect ? 'var(--success)' : 'var(--error)';
                const bg = isCorrect ? 'rgba(0, 255, 157, 0.05)' : 'rgba(255, 0, 85, 0.05)';
                const label = isCorrect ? 'CORRETA' : 'SUA RESPOSTA';

                return `
                    <div style="display:flex;align-items:flex-start;gap:8px;padding:8px;
                                border-radius:var(--radius-sm);background:${bg};
                                border:1px solid ${color};margin-top:6px;">
                        <span style="font-family:var(--font-mono);font-size:0.7rem;
                                     color:${color};font-weight:700;white-space:nowrap;
                                     padding-top:2px;">${letter}. ${label}</span>
                        <span style="font-size:0.85rem;color:var(--text-main);">${alt.texto}</span>
                    </div>`;
            }).join('');

            return `
                <div style="margin-top:var(--space-sm);padding-top:var(--space-sm);
                            border-top:1px solid var(--border-glass);">
                    ${altsHtml}
                </div>`;
        }
    };

    function _capWrongList(list) {
        if (list.length <= CONFIG.LIMITS.MAX_WRONG_PER_QUIZ) return list;
        return list
            .sort((a, b) => b.errorCount - a.errorCount)
            .slice(0, CONFIG.LIMITS.MAX_WRONG_PER_QUIZ);
    }

    window.ReviewManager = ReviewManager;
})(window);
