(function(window) {
    const ScreenManager = {
        currentScreen: 'landingPage',

        change(screenId) {
            const screens = Object.values(CONFIG.ELEMENTS);
            const appContainer = document.getElementById('appContainer');

            if (screenId === CONFIG.ELEMENTS.LANDING_PAGE) {
                appContainer.classList.add('hidden');
                document.getElementById(CONFIG.ELEMENTS.LANDING_PAGE).style.display = 'block';
            } else {
                document.getElementById(CONFIG.ELEMENTS.LANDING_PAGE).style.display = 'none';
                appContainer.classList.remove('hidden');
                screens.forEach(id => {
                    const el = document.getElementById(id);
                    if (el && id !== CONFIG.ELEMENTS.LANDING_PAGE) {
                        el.classList.toggle('hidden', id !== screenId);
                    }
                });
            }
            this.currentScreen = screenId;
            this._updateSubtitle();
            this._manageFocus(screenId);
        },

        _manageFocus(screenId) {
            requestAnimationFrame(() => {
                const screen = document.getElementById(screenId);
                if (!screen) return;
                const heading = screen.querySelector('h1, h2');
                if (heading) {
                    heading.setAttribute('tabindex', '-1');
                    heading.focus();
                }
            });
        },

        _updateSubtitle() {
            const sub = document.getElementById('headerSubtitle');
            const quizBadge = document.getElementById('quizBadgeTitle');
            if (!sub) return;

            const quizName = QuizEngine.getState().quizData?.nomeSimulado || 'Quiz';
            const titles = {
                uploadScreen: 'Importar',
                libraryScreen: 'Biblioteca',
                creatorScreen: 'Criador',
                quizScreen: quizName,
                reviewScreen: 'Revisão',
                resultScreen: 'Resultado'
            };

            sub.textContent = titles[this.currentScreen] || 'App';
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
                if (data.tempoLimiteMinutos) {
                    timerInfo.textContent = `Este simulado tem limite de ${data.tempoLimiteMinutos} min. O timer ativa apenas no Modo Exame.`;
                    timerInfo.classList.remove('hidden');
                } else {
                    timerInfo.classList.add('hidden');
                }
            }

            ModalManager.open('quizOptionsModal');
        },

        loadQuiz(data, libraryId, options = {}) {
            QuizEngine.init(data, libraryId, options);
            StorageManager.clearSession();
            setTimeout(() => {
                this.change(CONFIG.ELEMENTS.QUIZ_SCREEN);
                if (window.QuizRenderer) QuizRenderer.renderQuestion();
            }, 300);
        }
    };

    window.ScreenManager = ScreenManager;
})(window);
