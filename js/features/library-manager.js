(function(window) {
    const LibraryManager = {
        render() {
            const container = document.getElementById('libraryList');
            if (!container) return;

            const query = document.getElementById('librarySearch')?.value.toLowerCase().trim() || '';
            const sortBy = document.getElementById('librarySort')?.value || 'recent';
            
            let library = StorageManager.getLibrary();

            if (query) {
                library = library.filter(item => {
                    const name = item.data.nomeSimulado?.toLowerCase() || '';
                    const desc = item.data.descricao?.toLowerCase() || '';
                    const tags = (item.data.tags || []).join(' ').toLowerCase();
                    return name.includes(query) || desc.includes(query) || tags.includes(query);
                });
            }

            // Sort logic (using a copy to avoid mutation)
            const sortedLibrary = [...library].sort((a, b) => {
                switch (sortBy) {
                    case 'oldest':
                        return a.meta.addedAt - b.meta.addedAt;
                    case 'az':
                        return (a.data.nomeSimulado || '').localeCompare(b.data.nomeSimulado || '');
                    case 'questions':
                        return b.meta.questionsCount - a.meta.questionsCount;
                    case 'recent':
                    default:
                        return b.meta.addedAt - a.meta.addedAt;
                }
            });

            container.innerHTML = '';

            if (sortedLibrary.length === 0) {
                container.innerHTML = `<div class="empty-state" style="text-align:center; padding:var(--space-2xl); color:var(--text-muted); grid-column: 1 / -1;"><p>${query ? 'Nenhum resultado encontrado.' : 'Nenhum simulado salvo ainda.'}</p></div>`;
                return;
            }

            const activeSession = StorageManager.getSession();
            sortedLibrary.forEach(item => this.renderCard(item, container, activeSession));
            
            // Inject icons since we are replacing the whole innerHTML
            if (window.IconSystem) IconSystem.inject(container);
            
            // Update capacity bar if elements exist
            this._updateCapacityUI(sortedLibrary.length);
        },

        _updateCapacityUI(count) {
            const counter = document.getElementById('libraryCounter');
            const fill = document.getElementById('libCapacityFill');
            if (counter) {
                counter.innerHTML = `CAPACIDADE &nbsp; <strong style="color:var(--text-main);">${count}/${CONFIG.LIMITS.MAX_LIBRARY_SLOTS}</strong>`;
            }
            if (fill) {
                const pct = (count / CONFIG.LIMITS.MAX_LIBRARY_SLOTS) * 100;
                fill.style.width = pct + '%';
                fill.style.background = pct >= 90 ? 'var(--error)' : pct >= 60 ? 'var(--primary-500)' : 'var(--success)';
            }
        },

        renderCard(item, container, activeSession) {
            const date = new Date(item.meta.addedAt).toLocaleDateString('pt-BR');
            const timesPlayed = item.meta.timesPlayed || 0;
            const lastPlayed = item.meta.lastPlayed
                ? new Date(item.meta.lastPlayed).toLocaleDateString('pt-BR')
                : 'Nunca';

            const avg = item.meta.averageScore || 0;
            const scoreColor = avg >= 70 ? 'var(--success)' : avg >= 50 ? 'var(--primary-500)' : avg > 0 ? 'var(--error)' : 'var(--text-muted)';
            const scoreText = timesPlayed > 0 ? `${avg}%` : '—';

            const timerBadge = item.data.tempoLimiteMinutos
                ? `<span class="badge" style="color:var(--primary-500);">${item.data.tempoLimiteMinutos}min</span>`
                : '';

            const history = item.meta.history || [];
            const historyHtml = history.length > 0
                ? `<div class="lib-history">
                    <span class="lib-history-label">HISTÓRICO RECENTE</span>
                    <div class="lib-history-bars">
                        ${history.slice(0, 6).map(h => {
                            const color = h.score >= 70 ? 'var(--success)' : h.score >= 50 ? 'var(--primary-500)' : 'var(--error)';
                            return `<div class="lib-history-bar" style="--bar-h:${h.score}%;--bar-color:${color};" title="${h.score}%"></div>`;
                        }).join('')}
                    </div>
                   </div>`
                : '';

            const tagsHtml = (item.data.tags || [])
                .map(t => `<span class="badge">${t}</span>`)
                .join('');

            const hasActiveSession = activeSession && activeSession.libraryId === item.id;
            const resumeBtn = hasActiveSession
                ? `<button class="btn btn-secondary resume-btn" data-action="resume-quiz" data-id="${item.id}" title="Continuar de onde parou">
                       <span data-icon="history"></span> Retomar
                   </button>`
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
                    ${tagsHtml ? `<div class="lib-tags" style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px;">${tagsHtml}</div>` : ''}
                </div>
                <div class="lib-actions">
                    ${resumeBtn}
                    <button class="btn btn-primary" data-action="load-quiz" data-id="${item.id}" title="Iniciar"><span data-icon="play"></span></button>
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
