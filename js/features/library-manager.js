/**
 * LibraryManager - CRUD and rendering for Local Library
 */
(function(window) {
    const LibraryManager = {
        render() {
            const list = document.getElementById('libraryList');
            const counter = document.getElementById('libraryCounter');
            const emptyMsg = document.getElementById('emptyLibraryMsg');
            const searchTerm = document.getElementById('librarySearch')?.value.toLowerCase() || '';
            const sortBy = document.getElementById('librarySort')?.value || 'recent';

            if(!list) return;
            let lib = StorageManager.getLibrary();
            
            counter.textContent = `${lib.length}/${CONFIG.LIMITS.MAX_LIBRARY_SLOTS} SALVOS`;

            // Filter
            if (searchTerm) {
                lib = lib.filter(item => {
                    const title = item.data.nomeSimulado.toLowerCase();
                    const desc = (item.data.descricao || '').toLowerCase();
                    const tags = (item.data.tags || []).join(' ').toLowerCase();
                    return title.includes(searchTerm) || desc.includes(searchTerm) || tags.includes(searchTerm);
                });
            }

            // Sort
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
            const lastPlayed = item.meta.lastPlayed ? new Date(item.meta.lastPlayed).toLocaleDateString() : 'Nunca';
            const timesPlayed = item.meta.timesPlayed || 0;
            const avgScore = item.meta.averageScore || 0;
            const tagsHtml = (item.data.tags || []).map(t => `<span class="badge" style="margin-right:4px;">${t}</span>`).join('');
            
            const div = document.createElement('div');
            div.className = 'library-card';
            div.innerHTML = `
                <div class="lib-card-header">
                    <span class="lib-title">${item.data.nomeSimulado}</span>
                    <span class="lib-date">Adicionado: ${date}</span>
                </div>
                <div class="lib-meta">
                    <div style="margin-bottom:8px; display:flex; justify-content:space-between; font-size:0.75rem; color:var(--primary-500); font-family:var(--font-mono);">
                        <span>${item.meta.questionsCount} Questões</span>
                        <span>Acertos: ${avgScore}%</span>
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:12px;">${item.data.descricao ? item.data.descricao.substring(0, 80) + '...' : 'Sem descrição'}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:12px;">Jogado: ${timesPlayed}x | Último: ${lastPlayed}</div>
                    <div style="display:flex; flex-wrap:wrap;">${tagsHtml}</div>
                </div>
                <div class="lib-actions">
                    <button class="btn btn-primary" data-action="load-quiz" data-id="${item.id}"><span data-icon="play"></span> Iniciar</button>
                    <button class="btn btn-outline" data-action="download-quiz" data-id="${item.id}"><span data-icon="download"></span></button>
                    <button class="btn btn-ghost" style="color:var(--error); min-width: 36px;" data-action="delete-quiz" data-id="${item.id}"><span data-icon="trash"></span></button>
                </div>`;
            container.appendChild(div);
        },

        delete(id) {
            ModalManager.confirm("Excluir este simulado?", () => {
                StorageManager.removeFromLibrary(id);
                this.render();
            });
        }
    };

    window.LibraryManager = LibraryManager;
})(window);
