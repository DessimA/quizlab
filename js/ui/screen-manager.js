(function(window) {
    const ScreenManager = {
        currentScreen: null,

        change(screenId) {
            const landing = document.getElementById('landingPage');
            const app = document.getElementById('appContainer');

            if (screenId === 'landingPage') {
                if (landing) landing.classList.remove('hidden');
                if (app) app.classList.add('hidden');
                this.currentScreen = 'landingPage';
                return;
            }

            if (landing) landing.classList.add('hidden');
            if (app) app.classList.remove('hidden');

            document.querySelectorAll('.screen, [class$="Screen"], [id$="Screen"]').forEach(el => {
                el.classList.add('hidden');
            });

            const target = document.getElementById(screenId);
            if (target) target.classList.remove('hidden');

            this.currentScreen = screenId;

            if (screenId === CONFIG.ELEMENTS.QUIZ_SCREEN) {
                const badge = document.getElementById('quizBadgeTitle');
                const quizName = QuizEngine.getState()?.quizData?.nomeSimulado || 'App';
                if (badge) { badge.textContent = quizName; badge.title = quizName; }
            } else {
                const bar = document.getElementById('examTimerBar');
                if (bar) bar.classList.add('hidden');
            }
        },

        showLoading(text = 'PROCESSANDO...') {
            const overlay = document.getElementById('loading-overlay');
            const txt = document.getElementById('loadingText');
            if (overlay && txt) { txt.textContent = text; overlay.classList.remove('hidden'); }
        },

        hideLoading() {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.classList.add('hidden');
        },

        loadQuizOptions(data, libraryId) {
            window.pendingQuizLoad = { data, libraryId };

            const timerInfo = document.getElementById('quizTimerInfo');
            if (timerInfo) {
                const calcMinutes = Math.round((data.questoes.length * CONFIG.TIMINGS.SECONDS_PER_QUESTION) / 60);
                timerInfo.textContent = `Modo Exame: Tempo total de ${calcMinutes} min (${data.questoes.length} questões).`;
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

        resumeSession(session) {
            QuizEngine.restoreSession(session);
            this.change(CONFIG.ELEMENTS.QUIZ_SCREEN);
            if (window.QuizRenderer) QuizRenderer.renderQuestion();
            this._syncExamTimerBar();
        },

        _syncExamTimerBar() {
            const state = QuizEngine.getState();
            const bar = document.getElementById('examTimerBar');
            if (!bar) return;

            const isExam = state.mode === CONFIG.QUIZ_MODES.EXAM && state.timerSeconds > 0;
            bar.classList.toggle('hidden', !isExam);

            if (isExam) {
                const valEl = bar.querySelector('.exam-timer-value');
                if (valEl) valEl.textContent = Utils.formatTime(state.timerRemaining);
                bar.classList.remove('timer-warning');
            }
        }
    };

    window.ScreenManager = ScreenManager;
})(window);
