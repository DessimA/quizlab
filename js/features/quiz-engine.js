(function(window) {
    const QuizEngine = {
        _state: {
            quizData: null,
            currentQuestion: 0,
            userAnswers: [],
            questionAnswered: [],
            visitedQuestions: [],
            correctCount: 0,
            incorrectCount: 0,
            libraryId: null,
            mode: 'study',
            flagged: [],
            timerSeconds: 0,
            timerRemaining: 0
        },
        _timerInterval: null,

        init(quizData, libraryId = null, options = {}) {
            const {
                mode = CONFIG.QUIZ_MODES.STUDY,
                shuffleQuestions = false,
                shuffleOptions = false
            } = options;

            let questoes = quizData.questoes;
            if (shuffleQuestions) questoes = this._shuffle(questoes);
            if (shuffleOptions) questoes = questoes.map(q => ({ ...q, alternativas: this._shuffle(q.alternativas) }));

            const processedData = { ...quizData, questoes };

            this._state.quizData = processedData;
            this._state.libraryId = libraryId;
            this._state.mode = mode;
            this._state.currentQuestion = 0;
            this._state.userAnswers = new Array(questoes.length).fill(null);
            this._state.questionAnswered = new Array(questoes.length).fill(false);
            this._state.visitedQuestions = new Array(questoes.length).fill(false);
            this._state.visitedQuestions[0] = true;
            this._state.correctCount = 0;
            this._state.incorrectCount = 0;
            this._state.flagged = [];

            this.stopTimer();

            const timerMin = quizData.tempoLimiteMinutos;
            if (timerMin && mode === CONFIG.QUIZ_MODES.EXAM) {
                this._state.timerSeconds = timerMin * 60;
                this._state.timerRemaining = timerMin * 60;
                this.startTimer();
            } else {
                this._state.timerSeconds = 0;
                this._state.timerRemaining = 0;
            }
        },

        reset() {
            if (!this._state.quizData) return;
            const { quizData, libraryId, mode, timerSeconds } = this._state;

            this._state.currentQuestion = 0;
            this._state.userAnswers = new Array(quizData.questoes.length).fill(null);
            this._state.questionAnswered = new Array(quizData.questoes.length).fill(false);
            this._state.visitedQuestions = new Array(quizData.questoes.length).fill(false);
            this._state.visitedQuestions[0] = true;
            this._state.correctCount = 0;
            this._state.incorrectCount = 0;
            this._state.flagged = [];

            this.stopTimer();
            if (timerSeconds > 0 && mode === CONFIG.QUIZ_MODES.EXAM) {
                this._state.timerRemaining = timerSeconds;
                this.startTimer();
            }

            StorageManager.clearSession();
        },

        _shuffle(arr) {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        },

        startTimer() {
            this.stopTimer();
            this._timerInterval = setInterval(() => {
                this._state.timerRemaining--;
                window.dispatchEvent(new CustomEvent('quizlab:timer-tick', {
                    detail: { remaining: this._state.timerRemaining }
                }));
                if (this._state.timerRemaining <= 0) {
                    this.stopTimer();
                    window.dispatchEvent(new CustomEvent('quizlab:timer-expired'));
                }
            }, 1000);
        },

        stopTimer() {
            if (this._timerInterval) {
                clearInterval(this._timerInterval);
                this._timerInterval = null;
            }
            const el = document.getElementById('timerDisplay');
            if (el) el.style.display = 'none';
        },

        flagQuestion(index) {
            const pos = this._state.flagged.indexOf(index);
            if (pos > -1) {
                this._state.flagged.splice(pos, 1);
            } else {
                this._state.flagged.push(index);
            }
        },

        isFlagged(index) {
            return this._state.flagged.includes(index);
        },

        getQuestionStatus(index) {
            if (!this._state.questionAnswered[index]) {
                return this._state.visitedQuestions[index] ? 'skipped' : 'pending';
            }
            return this.checkAnswer(index) ? 'correct' : 'incorrect';
        },

        getState() {
            return this._state;
        },

        getCurrentQuestion() {
            return this._state.quizData.questoes[this._state.currentQuestion];
        },

        getCurrentData() {
            const idx = this._state.currentQuestion;
            return {
                question: this.getCurrentQuestion(),
                index: idx,
                total: this._state.quizData.questoes.length,
                isAnswered: this._state.questionAnswered[idx],
                userAnswer: this._state.userAnswers[idx],
                isLast: idx === this._state.quizData.questoes.length - 1,
                isFlagged: this.isFlagged(idx),
                mode: this._state.mode
            };
        },

        select(alternativeId) {
            const idx = this._state.currentQuestion;
            const q = this.getCurrentQuestion();
            if (q.tipo === 'unica') {
                this._state.userAnswers[idx] = alternativeId;
            } else {
                if (!this._state.userAnswers[idx]) this._state.userAnswers[idx] = [];
                const ansIdx = this._state.userAnswers[idx].indexOf(alternativeId);
                if (ansIdx > -1) {
                    this._state.userAnswers[idx].splice(ansIdx, 1);
                } else if (this._state.userAnswers[idx].length < q.respostasCorretas.length) {
                    this._state.userAnswers[idx].push(alternativeId);
                }
            }
        },

        confirm() {
            const idx = this._state.currentQuestion;
            if (this._state.questionAnswered[idx]) return null;
            this._state.questionAnswered[idx] = true;
            const isCorrect = this.checkAnswer(idx);
            if (isCorrect) this._state.correctCount++;
            else this._state.incorrectCount++;
            this._saveSession();
            return isCorrect;
        },

        checkAnswer(idx) {
            const q = this._state.quizData.questoes[idx];
            const ans = this._state.userAnswers[idx];
            if (!ans) return false;
            if (q.tipo === 'unica') return q.respostasCorretas.includes(ans);
            return [...ans].sort().join() === [...q.respostasCorretas].sort().join();
        },

        canConfirmCurrent() {
            const idx = this._state.currentQuestion;
            const q = this.getCurrentQuestion();
            const ans = this._state.userAnswers[idx];
            if (!ans) return false;
            if (q.tipo === 'unica') return !!ans;
            const correctCount = Array.isArray(q.respostasCorretas) ? q.respostasCorretas.length : 1;
            return Array.isArray(ans) && ans.length === correctCount;
        },

        goTo(index) {
            if (index >= 0 && index < this._state.quizData.questoes.length) {
                this._state.currentQuestion = index;
                this._state.visitedQuestions[index] = true;
                return true;
            }
            return false;
        },

        next() { return this.goTo(this._state.currentQuestion + 1); },
        prev() { return this.goTo(this._state.currentQuestion - 1); },

        getStats() {
            return {
                correct: this._state.correctCount,
                incorrect: this._state.incorrectCount,
                total: this._state.quizData.questoes.length,
                percent: Math.round((this._state.correctCount / this._state.quizData.questoes.length) * 100),
                unanswered: this._state.questionAnswered.filter(a => !a).length,
                skipped: this._state.visitedQuestions.filter((v, i) => v && !this._state.questionAnswered[i]).length,
                flagged: [...this._state.flagged]
            };
        },

        saveStatsToLibrary() {
            if (!this._state.libraryId) return;
            StorageManager.updateQuizStats(this._state.libraryId, this.getStats());
            StorageManager.clearSession();
        },

        restoreSession(session) {
            this.stopTimer();
            Object.assign(this._state, {
                quizData: session.quizData,
                libraryId: session.libraryId,
                mode: session.mode || CONFIG.QUIZ_MODES.STUDY,
                currentQuestion: session.currentQuestion,
                userAnswers: session.userAnswers,
                questionAnswered: session.questionAnswered,
                visitedQuestions: session.visitedQuestions,
                correctCount: session.correctCount,
                incorrectCount: session.incorrectCount,
                flagged: session.flagged || [],
                timerSeconds: session.timerSeconds || 0,
                timerRemaining: session.timerRemaining || 0
            });
            if (this._state.timerRemaining > 0 && this._state.mode === CONFIG.QUIZ_MODES.EXAM) {
                this.startTimer();
            }
        },

        _saveSession() {
            StorageManager.saveSession({
                quizData: this._state.quizData,
                libraryId: this._state.libraryId,
                mode: this._state.mode,
                currentQuestion: this._state.currentQuestion,
                userAnswers: this._state.userAnswers,
                questionAnswered: this._state.questionAnswered,
                visitedQuestions: this._state.visitedQuestions,
                correctCount: this._state.correctCount,
                incorrectCount: this._state.incorrectCount,
                flagged: this._state.flagged,
                timerSeconds: this._state.timerSeconds,
                timerRemaining: this._state.timerRemaining,
                savedAt: Date.now()
            });
        }
    };

    window.QuizEngine = QuizEngine;
})(window);
