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
            school:       'school'
        },

        _svgFallbacks: {
            logo:     'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
            github:   'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22',
            linkedin: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2'
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

            const path = this._svgFallbacks[name];
            if (path) {
                return `<svg class="icon-svg icon-${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${style}" aria-hidden="true"><path d="${path}"></path></svg>`;
            }

            return '';
        },

        inject(container = document) {
            const elements = container.querySelectorAll('[data-icon]');
            elements.forEach(el => {
                const name = el.dataset.icon;
                const size = el.dataset.size || 'sm';
                const style = el.getAttribute('style') || '';
                el.innerHTML = this.render(name, size, style);
                el.removeAttribute('data-icon');
            });
        }
    };

    window.IconSystem = IconSystem;
})(window);
