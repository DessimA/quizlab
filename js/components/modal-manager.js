/**
 * ModalManager - Centralized modal control
 */
(function(window) {
    const ModalManager = {
        open(id) {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hidden');
        },

        close(id) {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        },

        closeAll() {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
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

        confirm(message, onConfirm, title = "CONFIRMAÇÃO") {
            const modal = document.getElementById('customModal');
            if (!modal) return;

            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalMessage').textContent = message;
            
            const cancelBtn = document.getElementById('modalBtnCancel');
            cancelBtn.classList.remove('hidden');
            cancelBtn.onclick = () => this.close('customModal');

            const confirmBtn = document.getElementById('modalBtnConfirm');
            confirmBtn.textContent = 'CONFIRMAR';
            confirmBtn.onclick = () => {
                onConfirm();
                this.close('customModal');
            };

            this.open('customModal');
        }
    };

    window.ModalManager = ModalManager;
})(window);
