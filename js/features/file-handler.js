/**
 * FileHandler - Handles JSON file uploads and parsing
 */
(function(window) {
    const FileHandler = {
        handle(file) {
            if (!file || !file.name.endsWith('.json')) {
                ModalManager.alert('Selecione um arquivo .json válido.');
                return;
            }

            ScreenManager.showLoading('LENDO ARQUIVO...');
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const validation = Validator.validateQuiz(data);
                    
                    setTimeout(() => {
                        ScreenManager.hideLoading();
                        if (!validation.valid) {
                            this._showErrors(validation.errors);
                        } else {
                            this._askToSave(data);
                        }
                    }, CONFIG.TIMINGS.LOADING_MIN_DELAY);
                } catch (err) {
                    ScreenManager.hideLoading();
                    ModalManager.alert('Erro crítico ao ler o arquivo. Verifique a sintaxe JSON.');
                }
            };
            reader.readAsText(file);
        },

        _showErrors(errors) {
            const errorHtml = `
                <div class="error-container">
                    <ul>${errors.map(err => `<li>${err}</li>`).join('')}</ul>
                </div>`;
            ModalManager.alert(errorHtml, "ERRO DE FORMATO DETECTADO");
        },

        _askToSave(data) {
            const lib = StorageManager.getLibrary();
            const exists = lib.find(item => item.data.nomeSimulado === data.nomeSimulado);
            
            if (exists) {
                ScreenManager.loadQuiz(data, exists.id);
            } else {
                ModalManager.confirm(`Salvar "${data.nomeSimulado}" na biblioteca?`, () => {
                    const libId = StorageManager.addToLibrary(data).id;
                    ScreenManager.loadQuiz(data, libId);
                });
            }
        }
    };

    window.FileHandler = FileHandler;
})(window);
