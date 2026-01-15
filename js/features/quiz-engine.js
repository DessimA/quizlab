/**
 * QuizEngine - Core logic for quiz navigation and scoring
 */
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
            libraryId: null
        },

        init(quizData, libraryId = null) {
            this._state.quizData = quizData;
            this._state.libraryId = libraryId;
            this._state.currentQuestion = 0;
            this._state.userAnswers = new Array(quizData.questoes.length).fill(null);
            this._state.questionAnswered = new Array(quizData.questoes.length).fill(false);
            this._state.visitedQuestions = new Array(quizData.questoes.length).fill(false);
            this._state.visitedQuestions[0] = true;
            this._state.correctCount = 0;
            this._state.incorrectCount = 0;
        },

        reset() {
            if (this._state.quizData) {
                this.init(this._state.quizData, this._state.libraryId);
            }
        },

        getQuestionStatus(index) {
            if (!this._state.questionAnswered[index]) return 'pending';
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
                isLast: idx === this._state.quizData.questoes.length - 1
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
                } else {
                    if (this._state.userAnswers[idx].length < q.respostasCorretas.length) {
                        this._state.userAnswers[idx].push(alternativeId);
                    }
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

        next() {
            return this.goTo(this._state.currentQuestion + 1);
        },

        prev() {
            return this.goTo(this._state.currentQuestion - 1);
        },

        getStats() {
            return {
                correct: this._state.correctCount,
                incorrect: this._state.incorrectCount,
                total: this._state.quizData.questoes.length,
                percent: Math.round((this._state.correctCount / this._state.quizData.questoes.length) * 100),
                unanswered: this._state.questionAnswered.filter(a => !a).length
            };
        },

        updateLibraryStats() {
            if (!this._state.libraryId) return;
            const stats = this.getStats();
            
            const library = StorageManager.getLibrary();
            const index = library.findIndex(item => item.id === this._state.libraryId);
            
            if (index !== -1) {
                const meta = library[index].meta;
                if (meta.timesPlayed === undefined) meta.timesPlayed = 0;
                if (meta.averageScore === undefined) meta.averageScore = 0;

                const oldTotal = meta.timesPlayed * meta.averageScore;
                meta.timesPlayed++;
                meta.lastPlayed = Date.now();
                meta.averageScore = Math.round((oldTotal + stats.percent) / meta.timesPlayed);
                
                StorageManager.saveLibrary(library);
            }
        },

        saveStatsToLibrary() {
            this.updateLibraryStats();
        }
    };

    window.QuizEngine = QuizEngine;
})(window);
