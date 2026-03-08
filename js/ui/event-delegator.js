/**
 * EventDelegator - Global event handling via delegation
 */
(function(window) {
    const EventDelegator = {
        init() {
            document.addEventListener('click', (e) => this._handleClick(e));
            document.addEventListener('input', (e) => this._handleInput(e));
            document.addEventListener('change', (e) => this._handleChange(e));
            
            // Drag and Drop for Builder
            document.addEventListener('dragover', (e) => e.preventDefault());
            document.addEventListener('drop', (e) => this._handleDrop(e));
        },

        _handleClick(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const handler = this.handlers[action];

            if (handler) {
                handler(e, target);
            }
        },

        _handleInput(e) {
            const target = e.target.closest('[data-oninput]');
            if (!target) return;
            
            const action = target.dataset.oninput;
            const handler = this.handlers[action];
            if (handler) handler(e, target);
        },

        _handleChange(e) {
            const target = e.target.closest('[data-onchange]');
            if (!target) return;
            
            const action = target.dataset.onchange;
            const handler = this.handlers[action];
            if (handler) handler(e, target);
        },

        _handleDrop(e) {
            if (window.CreatorManager && typeof window.CreatorManager._onDrop === 'function') {
                window.CreatorManager._onDrop(e);
            }
        },

        registerMultiple(handlers) {
            Object.assign(this.handlers, handlers);
        },

        register(name, handler) {
            this.handlers[name] = handler;
        },

        handlers: {}
    };

    window.EventDelegator = EventDelegator;
})(window);
