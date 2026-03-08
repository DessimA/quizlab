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

            document.querySelectorAll('[data-action="toggle-theme"]').forEach(btn => {
                btn.setAttribute('aria-label', theme === this.DARK ? 'Ativar tema claro' : 'Ativar tema escuro');
                btn.setAttribute('title',      theme === this.DARK ? 'Tema Claro' : 'Tema Escuro');

                const iconName = theme === this.DARK ? 'sun' : 'moon';
                const iconEl = btn.querySelector('[data-icon-name]');

                if (iconEl) {
                    iconEl.dataset.iconName = iconName;
                    if (window.IconSystem) {
                        iconEl.innerHTML = IconSystem.render(iconName, iconEl.dataset.iconSize || 'sm');
                    }
                } else {
                    const span = btn.querySelector('span');
                    if (span && window.IconSystem) {
                        span.dataset.iconName = iconName;
                        span.dataset.iconSize = 'sm';
                        span.innerHTML = IconSystem.render(iconName, 'sm');
                    }
                }
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
