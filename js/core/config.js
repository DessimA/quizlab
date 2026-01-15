/**
 * Global Configuration & Constants
 */
(function(window) {
    const CONFIG = {
        STORAGE: {
            LIBRARY_KEY: 'quizlab_library',
            DRAFT_KEY: 'quizlab_draft',
            FIRST_VISIT_KEY: 'quizlab_first_visit'
        },
        LIMITS: {
            MAX_LIBRARY_SLOTS: 10,
            ENUNCIADO_MIN_LENGTH: 5,
            RECOMMENDED_MAX_QUESTIONS: 500
        },
        TIMINGS: {
            AUTOSAVE_INTERVAL: 30000,
            TOAST_DURATION: 4000,
            LOADING_MIN_DELAY: 500,
            DEBOUNCE_DELAY: 300
        },
        QUESTION_TYPES: {
            SINGLE: 'unica',
            MULTIPLE: 'multipla'
        },
        ELEMENTS: {
            QUIZ_SCREEN: 'quizScreen',
            UPLOAD_SCREEN: 'uploadScreen',
            CREATOR_SCREEN: 'creatorScreen',
            RESULT_SCREEN: 'resultScreen',
            LIBRARY_SCREEN: 'libraryScreen',
            REVIEW_SCREEN: 'reviewScreen',
            LANDING_PAGE: 'landingPage'
        }
    };

    window.CONFIG = CONFIG;
})(window);
