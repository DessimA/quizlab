(function(window) {
    const IconSystem = {
        _symbols: {
            check:        'check',
            cross:        'close',
            trash:        'delete',
            chevronDown:  'expand_more',
            chevronUp:    'expand_less',
            plus:         'add',
            play:         'play_arrow',
            download:     'download',
            search:       'search',
            eye:          'visibility',
            eyeOff:       'visibility_off',
            arrowLeft:    'arrow_back',
            arrowRight:   'arrow_forward',
            info:         'info',
            alert:        'warning',
            book:         'menu_book',
            mail:         'mail',
            externalLink: 'open_in_new',
            edit:         'edit',
            flag:         'flag',
            timer:        'timer',
            shuffle:      'shuffle',
            history:      'history',
            school:       'school',
            upload_file:  'upload_file',
            quiz:         'quiz'
        },

        _svgFallbacks: {
            logo:         'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
            github:       'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22',
            linkedin:     'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2',
            check:        'M20 6L9 17l-5-5',
            cross:        'M18 6L6 18M6 6l12 12',
            chevronDown:  'M6 9l6 6 6-6',
            chevronUp:    'M18 15l-6-6-6 6',
            plus:         'M12 5v14M5 12h14',
            arrowLeft:    'M19 12H5M12 19l-7-7 7-7',
            search:       'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
            eye:          'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z',
            trash:        'M3 6h18M19 6l-1 14H6L5 6M9 6V4h6v2',
            download:     'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
            edit:         'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
            info:         'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 8v4M12 16h.01'
        },

        _sizeMap: {
            xs: '16px',
            sm: '18px',
            md: '20px',
            lg: '32px',
            xl: '48px'
        },

        render(name, size = 'sm', style = '') {
            const symbol = this._symbols[name];
            const fontSize = this._sizeMap[size] || '18px';

            if (symbol) {
                return `<span class="material-symbols-outlined icon-ms icon-ms-${size}" style="font-size:${fontSize};${style}" aria-hidden="true">${symbol}</span>`;
            }

            return this._renderSvg(name, size, style);
        },

        _renderSvg(name, size, style) {
            const path = this._svgFallbacks[name];
            if (path) {
                const dim = this._sizeMap[size] || '18px';
                return `<svg class="icon-svg icon-${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:${dim};height:${dim};${style}" aria-hidden="true"><path d="${path}"></path></svg>`;
            }
            return '';
        },

        inject(container = document) {
            const elements = container.querySelectorAll('[data-icon]');
            const fontLoaded = document.fonts
                ? document.fonts.check('1em Material Symbols Outlined')
                : false;

            elements.forEach(el => {
                const name = el.dataset.icon;
                const size = el.dataset.size || 'sm';
                const style = el.getAttribute('style') || '';

                const hasSvgFallback = !!this._svgFallbacks[name];
                const forceSvg = !fontLoaded && hasSvgFallback;

                el.innerHTML = forceSvg
                    ? this._renderSvg(name, size, style)
                    : this.render(name, size, style);

                el.removeAttribute('data-icon');
            });
        }
    };

    window.IconSystem = IconSystem;
})(window);
