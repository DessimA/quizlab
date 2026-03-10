(function(window) {
    const IconSystem = {
        _svgFallbacks: {
            logo:         'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
            sun:          'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 100 14A7 7 0 0012 5z',
            moon:         'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
            check:        'M20 6L9 17l-5-5',
            cross:        'M18 6L6 18M6 6l12 12',
            trash:        'M3 6h18M19 6l-1 14H6L5 6M9 6V4h6v2',
            chevronDown:  'M6 9l6 6 6-6',
            chevronUp:    'M18 15l-6-6-6 6',
            plus:         'M12 5v14M5 12h14',
            play:         'M5 3l14 9-14 9V3z',
            download:     'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
            search:       'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
            eye:          'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z',
            eyeOff:       'M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22',
            arrowLeft:    'M19 12H5M12 19l-7-7 7-7',
            arrowRight:   'M5 12h14M12 5l7 7-7 7',
            info:         'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 8v4M12 16h.01',
            alert:        'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4M12 17h.01',
            book:         'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004 22h16V2H6.5A2.5 2.5 0 004 4.5v15z',
            mail:         'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
            externalLink: 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3',
            edit:         'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
            flag:         'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7',
            timer:        'M12 6v6l4 2M12 2a10 10 0 100 20A10 10 0 0012 2zM12 2v4M4.93 4.93l2.83 2.83',
            shuffle:      'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
            history:      'M12 8v4l3 3M3.05 11a9 9 0 108.9-8.96L12 2M3 4v5h5',
            school:       'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3.33 1.67 6.67 1.67 10 0v-5',
            upload_file:  'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z M14 2v6h6M12 18v-6M9 15l3-3 3 3',
            quiz:         'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01',
            github:       'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22',
            linkedin:     'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z M2 9h4v12H2z M4 2a2 2 0 100 4 2 2 0 000-4z',
            shield:       'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        },

        _sizeMap: {
            xs: '16px',
            sm: '18px',
            md: '20px',
            lg: '32px',
            xl: '48px'
        },

        render(name, size = 'sm', style = '') {
            const dim = this._sizeMap[size] || '18px';
            const path = this._svgFallbacks[name];

            if (!path) return '';

            return `<svg class="icon-svg icon-${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:${dim};height:${dim};flex-shrink:0;${style}" aria-hidden="true"><path d="${path}"></path></svg>`;
        },

        inject(container = document) {
            const elements = container.querySelectorAll('[data-icon]');
            elements.forEach(el => {
                const name  = el.dataset.icon;
                const size  = el.dataset.size || 'sm';
                const style = el.getAttribute('style') || '';
                el.innerHTML = this.render(name, size, style);
                el.removeAttribute('data-icon');
                el.dataset.iconName = name;
                el.dataset.iconSize = size;
            });
        },

        update(container = document) {
            const elements = container.querySelectorAll('[data-icon-name]');
            elements.forEach(el => {
                const name  = el.dataset.iconName;
                const size  = el.dataset.iconSize || 'sm';
                const style = el.getAttribute('style') || '';
                el.innerHTML = this.render(name, size, style);
            });
        }
    };

    window.IconSystem = IconSystem;
})(window);
