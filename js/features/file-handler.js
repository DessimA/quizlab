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
                } catch {
                    ScreenManager.hideLoading();
                    ModalManager.alert('Erro crítico ao ler o arquivo. Verifique a sintaxe JSON.');
                }
            };
            reader.readAsText(file);
        },

        _showErrors(errors) {
            const errorHtml = `<div class="error-container"><ul>${errors.map(err => `<li>${err}</li>`).join('')}</ul></div>`;
            ModalManager.alert(errorHtml, 'ERRO DE FORMATO DETECTADO');
        },

        _generateHash(quiz) {
            return (quiz.questoes || []).map(q => q.id).join('|');
        },

        _findDuplicate(data) {
            const lib = StorageManager.getLibrary();
            const byName = lib.find(item => item.data.nomeSimulado === data.nomeSimulado);
            if (!byName) return null;
            const sameContent = this._generateHash(byName.data) === this._generateHash(data);
            return { item: byName, sameContent };
        },

        async _askToSave(data) {
            const duplicate = this._findDuplicate(data);

            if (!duplicate) {
                const check = await StorageManager.canStore(data);
                if (!check.allowed) {
                    ModalManager.alert('Armazenamento local cheio. Acesse a Biblioteca e exclua simulados para liberar espaço.');
                    return;
                }
                const result = StorageManager.addToLibrary(data);
                if (!result.success) {
                    ModalManager.alert('Erro ao salvar. Tente novamente.');
                    return;
                }
                ScreenManager.loadQuizOptions(data, result.id);
                return;
            }

            if (duplicate.sameContent) {
                ScreenManager.loadQuizOptions(data, duplicate.item.id);
                return;
            }

            ModalManager.confirm(
                `"${data.nomeSimulado}" já existe mas com conteúdo diferente. Substituir o simulado salvo?`,
                () => {
                    StorageManager.replaceInLibrary(duplicate.item.id, data);
                    ToastSystem.show('Simulado atualizado na biblioteca.');
                    ScreenManager.loadQuizOptions(data, duplicate.item.id);
                }
            );
        }
    };

    window.FileHandler = FileHandler;
})(window);
