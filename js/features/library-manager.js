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
            const pct = (lib.length / CONFIG.LIMITS.MAX_LIBRARY_SLOTS) * 100;

            if (counter) {
                counter.innerHTML = `CAPACIDADE &nbsp; <strong style="color:var(--text-main);">${lib.length}/${CONFIG.LIMITS.MAX_LIBRARY_SLOTS}</strong>`;
                counter.style.color = limitReached ? 'var(--error)' : '';
            }

            const fill = document.getElementById('libCapacityFill');
            if (fill) {
                fill.style.width = pct + '%';
                fill.style.background = pct >= 90 ? 'var(--error)' : pct >= 60 ? 'var(--primary-500)' : 'var(--success)';
            }

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
                if (emptyMsg) {
                    emptyMsg.innerHTML = searchTerm 
                        ? '<p style="text-align:center; padding:var(--space-xl); color:var(--text-muted);">Nenhum simulado encontrado para esta busca.</p>'
                        : `
                        <span data-icon="book" data-size="lg" style="display:block; margin:0 auto var(--space-md); opacity:0.3;"></span>
                        <p style="font-size:0.9rem;">Nenhum simulado salvo ainda.</p>
                        <p style="font-size:0.75rem; margin-top:4px;">Os dados ficam armazenados apenas neste navegador.</p>
                        `;
                    emptyMsg.classList.remove('hidden');
                    if (!searchTerm) IconSystem.inject(emptyMsg);
                }
            } else {
                emptyMsg.classList.add('hidden');
                lib.forEach(item => this._renderCard(list, item));
                IconSystem.inject(list);
            }
        },

        _renderCard(container, item) {
            const date = new Date(item.meta.addedAt).toLocaleDateString('pt-BR');
            const lastPlayed = item.meta.lastPlayed
                ? new Date(item.meta.lastPlayed).toLocaleDateString('pt-BR')
                : 'Nunca';
            const timesPlayed = item.meta.timesPlayed || 0;
            const avgScore = item.meta.averageScore || 0;
            
            const scoreColor = avgScore >= 70 ? 'var(--success)' : avgScore >= 50 ? 'var(--primary-500)' : avgScore > 0 ? 'var(--error)' : 'var(--text-muted)';
            const scoreText = avgScore > 0 ? `${avgScore}%` : '—';
            
            const tagsHtml = (item.data.tags || []).map(t => `<span class="badge">${t}</span>`).join('');
            const timerBadge = item.data.tempoLimiteMinutos
                ? `<span class="badge" style="color:var(--primary-500);">${item.data.tempoLimiteMinutos}min</span>`
                : '';

            const history = item.meta.history || [];
            const historyHtml = history.length > 0
                ? `<div class="lib-history">
                    <span class="lib-history-label">HISTÓRICO RECENTE</span>
                    <div class="lib-history-bars">
                        ${history.slice(-6).map(h => {
                            const color = h.score >= 70 ? 'var(--success)' : h.score >= 50 ? 'var(--primary-500)' : 'var(--error)';
                            return `<div class="lib-history-bar" style="--bar-h:${h.score}%;--bar-color:${color};" title="${h.score}%"></div>`;
                        }).join('')}
                    </div>
                   </div>`
                : '';

            const div = document.createElement('div');
            div.className = 'library-card';
            div.innerHTML = `
                <div class="lib-card-header">
                    <div class="lib-title">${item.data.nomeSimulado} ${timerBadge}</div>
                    <div class="lib-date">Adicionado: ${date}</div>
                </div>
                <div class="lib-meta">
                    <div class="lib-stats-row">
                        <span>${item.meta.questionsCount} Questões</span>
                        <span style="color:${scoreColor}; font-weight:700;">Média: ${scoreText}</span>
                    </div>
                    ${item.data.descricao ? `<p class="lib-desc">${item.data.descricao}</p>` : ''}
                    <div class="lib-played">Jogado: ${timesPlayed}x &nbsp;|&nbsp; Último: ${lastPlayed}</div>
                    ${historyHtml}
                    ${tagsHtml ? `<div class="lib-tags">${tagsHtml}</div>` : ''}
                </div>
                <div class="lib-actions">
                    <button class="btn btn-primary" data-action="load-quiz" data-id="${item.id}"><span data-icon="play"></span> Iniciar</button>
                    <button class="btn btn-outline" data-action="edit-quiz" data-id="${item.id}" title="Editar"><span data-icon="edit"></span></button>
                    <button class="btn btn-outline" data-action="download-quiz" data-id="${item.id}" title="Exportar"><span data-icon="download"></span></button>
                    <button class="btn btn-ghost btn-delete" data-action="delete-quiz" data-id="${item.id}" title="Excluir"><span data-icon="trash"></span></button>
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
