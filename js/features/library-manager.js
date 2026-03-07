(function(window) {
    const LibraryManager = {
        render() {
            const list = document.getElementById('libraryList');
            const counter = document.getElementById('libraryCounter');
            const emptyMsg = document.getElementById('emptyLibraryMsg');
            const searchTerm = document.getElementById('librarySearch')?.value.toLowerCase() || '';
            const sortBy = document.getElementById('librarySort')?.value || 'recent';

            if (!list) return;
            let lib = StorageManager.getLibrary();

            const limitReached = lib.length >= CONFIG.LIMITS.MAX_LIBRARY_SLOTS;
            counter.textContent = `${lib.length}/${CONFIG.LIMITS.MAX_LIBRARY_SLOTS} SALVOS`;
            counter.style.color = limitReached ? 'var(--error)' : '';

            if (searchTerm) {
                lib = lib.filter(item => {
                    const title = item.data.nomeSimulado.toLowerCase();
                    const desc = (item.data.descricao || '').toLowerCase();
                    const tags = (item.data.tags || []).join(' ').toLowerCase();
                    return title.includes(searchTerm) || desc.includes(searchTerm) || tags.includes(searchTerm);
                });
            }

            lib.sort((a, b) => {
                if (sortBy === 'recent') return b.meta.addedAt - a.meta.addedAt;
                if (sortBy === 'oldest') return a.meta.addedAt - b.meta.addedAt;
                if (sortBy === 'az') return a.data.nomeSimulado.localeCompare(b.data.nomeSimulado);
                if (sortBy === 'questions') return b.meta.questionsCount - a.meta.questionsCount;
                return 0;
            });

            list.innerHTML = '';
            if (lib.length === 0) {
                emptyMsg.textContent = searchTerm ? 'Nenhum simulado encontrado.' : 'Nenhum simulado salvo.';
                emptyMsg.classList.remove('hidden');
            } else {
                emptyMsg.classList.add('hidden');
                lib.forEach(item => this._renderCard(list, item));
                IconSystem.inject(list);
            }
        },

        _renderCard(container, item) {
            const date = new Date(item.meta.addedAt).toLocaleDateString();
            const lastPlayed = item.meta.lastPlayed
                ? new Date(item.meta.lastPlayed).toLocaleDateString()
                : 'Nunca';
            const timesPlayed = item.meta.timesPlayed || 0;
            const avgScore = item.meta.averageScore || 0;
            const tagsHtml = (item.data.tags || []).map(t => `<span class="badge" style="margin-right:4px;">${t}</span>`).join('');
            const timerBadge = item.data.tempoLimiteMinutos
                ? `<span class="badge" style="color:var(--primary-500);margin-left:4px;">${item.data.tempoLimiteMinutos}min</span>`
                : '';

            const history = item.meta.history || [];
            const historyHtml = history.length > 0
                ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:6px;">
                    Tentativas: ${history.slice(0, 5).map(h => `<span style="color:${h.score >= 70 ? 'var(--success)' : h.score >= 50 ? 'var(--primary-500)' : 'var(--error)'}">${h.score}%</span>`).join(' · ')}
                   </div>`
                : '';

            const div = document.createElement('div');
            div.className = 'library-card';
            div.innerHTML = `
                <div class="lib-card-header">
                    <span class="lib-title">${item.data.nomeSimulado}${timerBadge}</span>
                    <span class="lib-date">Adicionado: ${date}</span>
                </div>
                <div class="lib-meta">
                    <div style="margin-bottom:8px;display:flex;justify-content:space-between;font-size:0.75rem;color:var(--primary-500);font-family:var(--font-mono);">
                        <span>${item.meta.questionsCount} Questões</span>
                        <span>Média: ${avgScore}%</span>
                    </div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;">${item.data.descricao ? item.data.descricao.substring(0, 80) + '...' : 'Sem descrição'}</div>
                    <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:8px;">Jogado: ${timesPlayed}x | Último: ${lastPlayed}</div>
                    ${historyHtml}
                    <div style="display:flex;flex-wrap:wrap;margin-top:8px;">${tagsHtml}</div>
                </div>
                <div class="lib-actions">
                    <button class="btn btn-primary" data-action="load-quiz" data-id="${item.id}"><span data-icon="play"></span> Iniciar</button>
                    <button class="btn btn-outline" data-action="edit-quiz" data-id="${item.id}" title="Editar"><span data-icon="edit"></span></button>
                    <button class="btn btn-outline" data-action="download-quiz" data-id="${item.id}" title="Exportar"><span data-icon="download"></span></button>
                    <button class="btn btn-ghost" style="color:var(--error);min-width:36px;" data-action="delete-quiz" data-id="${item.id}" title="Excluir"><span data-icon="trash"></span></button>
                </div>`;
            container.appendChild(div);
        },

        delete(id) {
            ModalManager.confirm('Excluir este simulado permanentemente?', () => {
                StorageManager.removeFromLibrary(id);
                this.render();
                ToastSystem.show('Simulado excluído.');
            });
        }
    };

    window.LibraryManager = LibraryManager;
})(window);
