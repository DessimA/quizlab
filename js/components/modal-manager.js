/**
 * ModalManager - Centralized modal control
 */
(function(window) {
    const ModalManager = {
        open(id) {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('hidden');
                FocusTrap.activate(id);
            }
        },

        close(id) {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('hidden');
                FocusTrap.deactivate(id);
            }
        },

        closeAll() {
            document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => {
                this.close(m.id);
            });
        },

        alert(message, title = "AVISO DO SISTEMA") {
            const modal = document.getElementById('customModal');
            if (!modal) return;
            
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalMessage').textContent = message;
            document.getElementById('modalBtnCancel').classList.add('hidden');
            
            const confirmBtn = document.getElementById('modalBtnConfirm');
            confirmBtn.textContent = 'OK';
            confirmBtn.onclick = () => this.close('customModal');
            
            this.open('customModal');
        },

        confirm(message, onConfirm, onCancelOrOptions = null) {
            const modal = document.getElementById('customModal');
            if (!modal) return;

            let onCancel = null;
            let options = {
                title: "CONFIRMAÇÃO",
                confirmText: "CONFIRMAR",
                cancelText: "CANCELAR"
            };

            if (typeof onCancelOrOptions === 'function') {
                onCancel = onCancelOrOptions;
            } else if (typeof onCancelOrOptions === 'string') {
                options.title = onCancelOrOptions;
            } else if (onCancelOrOptions && typeof onCancelOrOptions === 'object') {
                options = { ...options, ...onCancelOrOptions };
                onCancel = options.onCancel || null;
            }

            document.getElementById('modalTitle').textContent = options.title;
            document.getElementById('modalMessage').textContent = message;
            
            const cancelBtn = document.getElementById('modalBtnCancel');
            cancelBtn.classList.remove('hidden');
            cancelBtn.textContent = options.cancelText;
            cancelBtn.onclick = () => {
                if (onCancel) onCancel();
                this.close('customModal');
            };

            const confirmBtn = document.getElementById('modalBtnConfirm');
            confirmBtn.textContent = options.confirmText;
            confirmBtn.onclick = () => {
                onConfirm();
                this.close('customModal');
            };

            this.open('customModal');
        }
    };

    window.ModalManager = ModalManager;
})(window);
