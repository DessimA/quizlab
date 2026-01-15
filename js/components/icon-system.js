/**
 * IconSystem - SVG Icon rendering and auto-injection
 */
(function(window) {
    const IconSystem = {
        paths: {
            check: 'M20 6 9 17 4 12',
            cross: 'M18 6L6 18M6 6l12 12',
            trash: 'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2',
            chevronDown: 'M6 9l6 6 6-6',
            chevronUp: 'M18 15l-6-6-6 6',
            plus: 'M12 5v14M5 12h14',
            play: 'M5 3l14 9-14 9V3z',
            download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
            search: 'M11 11m-8 0a8 8 0 1016 0 8 8 0 00-16 0M21 21l-4.35-4.35',
            eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z',
            eyeOff: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22',
            arrowLeft: 'M19 12H5M12 19l-7-7 7-7',
            arrowRight: 'M5 12h14M12 5l7 7-7 7',
            logo: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
            info: 'M12 12m-10 0a10 10 0 1020 0 10 10 0 00-20 0M12 8v4M12 16h.01',
            alert: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
            book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
            mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
            github: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22',
            linkedin: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2',
            externalLink: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3'
        },

        render(name, size = 'sm', style = '') {
            const path = this.paths[name];
            if (!path) return '';
            return `<svg class="icon-svg icon-${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${style}"><path d="${path}"></path></svg>`;
        },

        /**
         * Scans the DOM for [data-icon] attributes and injects the corresponding SVG
         */
        inject(container = document) {
            const elements = container.querySelectorAll('[data-icon]');
            elements.forEach(el => {
                const name = el.dataset.icon;
                const size = el.dataset.size || 'sm';
                const style = el.getAttribute('style') || '';
                el.innerHTML = this.render(name, size, style);
                // Clean up to prevent re-injection if called multiple times
                el.removeAttribute('data-icon');
            });
        }
    };

    window.IconSystem = IconSystem;
})(window);
