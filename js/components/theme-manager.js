(function(window) {
    const ThemeManager = {
        STORAGE_KEY: 'quizlab_theme',
        DARK: 'dark',
        LIGHT: 'light',

        init() {
            const saved = localStorage.getItem(this.STORAGE_KEY) || this.DARK;
            this.apply(saved);
        },

        apply(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem(this.STORAGE_KEY, theme);
            // Atualiza todos os botões de toggle na página
            document.querySelectorAll('[data-action="toggle-theme"]').forEach(btn => {
                btn.setAttribute('aria-label', theme === this.DARK ? 'Ativar tema claro' : 'Ativar tema escuro');
                btn.setAttribute('title',      theme === this.DARK ? 'Tema Claro' : 'Tema Escuro');
                const icon = btn.querySelector('[data-icon]');
                if (icon) icon.setAttribute('data-icon', theme === this.DARK ? 'sun' : 'moon');
                if (window.IconSystem) IconSystem.inject(btn);
            });
        },

        toggle() {
            const current = document.documentElement.getAttribute('data-theme') || this.DARK;
            this.apply(current === this.DARK ? this.LIGHT : this.DARK);
        },

        current() {
            return document.documentElement.getAttribute('data-theme') || this.DARK;
        }
    };

    window.ThemeManager = ThemeManager;
})(window);
