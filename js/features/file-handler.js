(function(window) {
    const FileHandler = {
        handle(file) {
            this.handleMultiple([file]);
        },

        handleMultiple(files) {
            const validFiles = Array.from(files).filter(f => f.name.endsWith('.json'));
            if (validFiles.length === 0) {
                ModalManager.alert('Selecione ao menos um arquivo .json válido.');
                return;
            }

            ScreenManager.showLoading(validFiles.length > 1
                ? `LENDO ${validFiles.length} ARQUIVOS...`
                : 'LENDO ARQUIVO...'
            );

            Promise.all(validFiles.map(f => this._readFile(f)))
                .then(results => {
                    setTimeout(() => {
                        ScreenManager.hideLoading();
                        if (results.length === 1) {
                            this._handleSingle(results[0]);
                        } else {
                            this._handleBatch(results);
                        }
                    }, CONFIG.TIMINGS.LOADING_MIN_DELAY);
                });
        },

        _readFile(file) {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        const validation = Validator.validateQuiz(data);
                        resolve({ file: file.name, data, valid: validation.valid, errors: validation.errors });
                    } catch {
                        resolve({ file: file.name, data: null, valid: false, errors: ['Sintaxe JSON inválida.'] });
                    }
                };
                reader.readAsText(file);
            });
        },

        _handleSingle(result) {
            if (!result.valid) {
                this._showErrors(result.errors, result.file);
                return;
            }
            this._askToSave(result.data);
        },

        async _handleBatch(results) {
            const report = { saved: [], skipped: [], conflicts: [], failed: [] };

            for (const result of results) {
                if (!result.valid) {
                    report.failed.push({ name: result.file, errors: result.errors });
                    continue;
                }

                const duplicate = this._findDuplicate(result.data);

                if (duplicate?.sameContent) {
                    report.skipped.push(result.data.nomeSimulado);
                    continue;
                }

                if (duplicate && !duplicate.sameContent) {
                    report.conflicts.push(result.data.nomeSimulado);
                    continue;
                }

                const check = StorageManager.canStore(result.data);
                if (!check.allowed) {
                    report.failed.push({ name: result.file, errors: ['Armazenamento cheio.'] });
                    continue;
                }

                const saveResult = StorageManager.addToLibrary(result.data);
                if (saveResult.success) {
                    report.saved.push(result.data.nomeSimulado);
                } else {
                    report.failed.push({ name: result.file, errors: ['Falha ao gravar.'] });
                }
            }

            this._showBatchReport(report);
        },

        _showBatchReport(report) {
            const lines = [];
            if (report.saved.length)     lines.push(`✔ ${report.saved.length} importado(s) com sucesso.`);
            if (report.skipped.length)   lines.push(`↩ ${report.skipped.length} ignorado(s) — conteúdo idêntico já salvo.`);
            if (report.conflicts.length) lines.push(`⚠ ${report.conflicts.length} com conflito de nome — importe individualmente para substituir.`);
            if (report.failed.length)    lines.push(`✖ ${report.failed.length} com erro de formato ou armazenamento.`);

            const hasSaved = report.saved.length > 0;

            ModalManager.custom({
                title: 'RESULTADO DA IMPORTAÇÃO',
                body: `<div style="font-family:var(--font-mono);font-size:0.8rem;line-height:2;">${lines.join('<br>')}</div>`,
                confirmText: hasSaved ? 'VER BIBLIOTECA' : 'OK',
                cancelText: hasSaved ? 'FECHAR' : null,
                onConfirm: hasSaved ? () => {
                    ScreenManager.change(CONFIG.ELEMENTS.LIBRARY_SCREEN);
                    LibraryManager.render();
                } : null
            });
        },

        _showErrors(errors, fileName = '') {
            const title = fileName ? `ERRO — ${fileName}` : 'ERRO DE FORMATO DETECTADO';
            const html = `<div class="error-container"><ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul></div>`;
            ModalManager.alert(html, title);
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
                const check = StorageManager.canStore(data);
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
