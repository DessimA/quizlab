(function(window) {
    const ScreenManager = {
        currentScreen: null,

        change(screenId) {
            // Handle landingPage vs appContainer transition
            const landing = document.getElementById('landingPage');
            const app = document.getElementById('appContainer');

            if (screenId === 'landingPage') {
                if (landing) landing.classList.remove('hidden');
                if (app) app.classList.add('hidden');
                this.currentScreen = 'landingPage';
                return;
            } else {
                if (landing) landing.classList.add('hidden');
                if (app) app.classList.remove('hidden');
            }

            document.querySelectorAll('.screen, [class$="Screen"], [id$="Screen"]').forEach(el => {
                el.classList.add('hidden');
            });

            const target = document.getElementById(screenId);
            if (target) target.classList.remove('hidden');

            this.currentScreen = screenId;

            const quizBadge = document.getElementById('quizBadgeTitle');
            const quizName = QuizEngine.getState()?.quizData?.nomeSimulado || 'App';
            if (quizBadge && this.currentScreen === 'quizScreen') {
                quizBadge.textContent = quizName;
                quizBadge.title = quizName;
            }

            if (screenId !== CONFIG.ELEMENTS.QUIZ_SCREEN) {
                const bar = document.getElementById('examTimerBar');
                if (bar) bar.classList.add('hidden');
            }
        },

        updateQuizBadge(quizName) {
            const quizBadge = document.getElementById('quizBadgeTitle');
            if (quizBadge && this.currentScreen === 'quizScreen') {
                quizBadge.textContent = quizName;
                quizBadge.title = quizName;
            }
        },

        showLoading(text = 'PROCESSANDO...') {
            const overlay = document.getElementById('loading-overlay');
            const txt = document.getElementById('loadingText');
            if (overlay && txt) {
                txt.textContent = text;
                overlay.classList.remove('hidden');
            }
        },

        hideLoading() {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.classList.add('hidden');
        },

        loadQuizOptions(data, libraryId) {
            window.pendingQuizLoad = { data, libraryId };

            const timerInfo = document.getElementById('quizTimerInfo');
            if (timerInfo) {
                // Cálculo proporcional: 2 min por questão
                const calcMinutes = data.questoes.length * 2;
                timerInfo.textContent = `Modo Exame: Tempo total de ${calcMinutes} min (${data.questoes.length} questões). O timer ativa apenas no Modo Exame.`;
                timerInfo.classList.remove('hidden');
            }

            ModalManager.open('quizOptionsModal');
        },

        loadQuiz(data, libraryId, options = {}) {
            QuizEngine.init(data, libraryId, options);
            StorageManager.clearSession();
            setTimeout(() => {
                this.change(CONFIG.ELEMENTS.QUIZ_SCREEN);
                if (window.QuizRenderer) QuizRenderer.renderQuestion();
                this._syncExamTimerBar();
            }, 300);
        },

        _syncExamTimerBar() {
            const state = QuizEngine.getState();
            const bar = document.getElementById('examTimerBar');
            if (!bar) return;

            const isExam = state.mode === CONFIG.QUIZ_MODES.EXAM && state.timerSeconds > 0;
            bar.classList.toggle('hidden', !isExam);

            if (isExam) {
                const r = state.timerRemaining;
                const m = Math.floor(r / 60).toString().padStart(2, '0');
                const s = (r % 60).toString().padStart(2, '0');
                const valEl = bar.querySelector('.exam-timer-value');
                if (valEl) valEl.textContent = `${m}:${s}`;
                bar.classList.remove('timer-warning');
            }
        }
    };

    window.ScreenManager = ScreenManager;
})(window);
