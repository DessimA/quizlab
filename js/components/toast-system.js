/**
 * ToastSystem - Non-intrusive notifications
 */
(function(window) {
    const ToastSystem = {
        container: null,

        init() {
            this.container = document.getElementById('toast-container');
        },

        show(message, type = 'info', duration = CONFIG.TIMINGS.TOAST_DURATION) {
            if (!this.container) this.init();
            if (!this.container) return;

            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.remove()">${IconSystem.render('cross', 'sm')}</button>
            `;
            
            this.container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'fadeOut 0.4s ease-out forwards';
                setTimeout(() => toast.remove(), 400);
            }, duration);
        },

        success(msg) { this.show(msg, 'success'); },
        error(msg) { this.show(msg, 'error'); }
    };

    window.ToastSystem = ToastSystem;
})(window);
