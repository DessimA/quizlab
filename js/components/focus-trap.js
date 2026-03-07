(function(window) {
    const FocusTrap = {
        _previousFocus: null,

        activate(modalId) {
            this._previousFocus = document.activeElement;
            const modal = document.getElementById(modalId);
            if (!modal) return;

            const focusable = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('role', 'dialog');

            first?.focus();

            modal._trapHandler = (e) => {
                if (e.key !== 'Tab') return;
                if (e.shiftKey) {
                    if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
                } else {
                    if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
                }
            };
            modal.addEventListener('keydown', modal._trapHandler);
        },

        deactivate(modalId) {
            const modal = document.getElementById(modalId);
            if (modal?._trapHandler) {
                modal.removeEventListener('keydown', modal._trapHandler);
                delete modal._trapHandler;
            }
            this._previousFocus?.focus();
            this._previousFocus = null;
        }
    };

    window.FocusTrap = FocusTrap;
})(window);