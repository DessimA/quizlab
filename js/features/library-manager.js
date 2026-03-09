(function(window) {
    const LibraryManager = {
        _selection: {
            active: false,
            ids: new Set()
        },

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

            const sortedLibrary = [...library].sort((a, b) => {
                switch (sortBy) {
                    case 'oldest':   return a.meta.addedAt - b.meta.addedAt;
                    case 'az':       return (a.data.nomeSimulado || '').localeCompare(b.data.nomeSimulado || '');
                    case 'questions': return b.meta.questionsCount - a.meta.questionsCount;
                    default:         return b.meta.addedAt - a.meta.addedAt;
                }
            });

            container.innerHTML = '';

            if (sortedLibrary.length === 0) {
                container.innerHTML = `<div class="empty-state" style="text-align:center; padding:var(--space-2xl); color:var(--text-muted); grid-column: 1 / -1;"><p>${query ? 'Nenhum resultado encontrado.' : 'Nenhum simulado salvo ainda.'}</p></div>`;
            } else {
                const activeSession = StorageManager.getSession();
                sortedLibrary.forEach(item => this.renderCard(item, container, activeSession));
                if (window.IconSystem) IconSystem.inject(container);
            }

            this._syncSelectionUI();
            this._updateCapacityUI();
        },

        renderCard(item, container, activeSession) {
            const timesPlayed = item.meta.timesPlayed || 0;
            const lastPlayed = item.meta.lastPlayed
                ? new Date(item.meta.lastPlayed).toLocaleDateString('pt-BR')
                : 'Nunca';
            const avg = item.meta.averageScore || 0;

            const historyBars = (item.meta.history || []).slice(0, 6).map(h => {
                const color = h.score >= 70 ? 'var(--success)' : h.score >= 40 ? 'var(--warning)' : 'var(--error)';
                return `<div class="lib-history-bar" style="--bar-h:${Math.max(10, h.score)}%; --bar-color:${color};" title="${h.score}%"></div>`;
            }).join('');

            const historyHtml = historyBars
                ? `<div class="lib-history"><span class="lib-history-label">HISTÓRICO</span><div class="lib-history-bars">${historyBars}</div></div>`
                : '';

            const tagsHtml = (item.data.tags || []).map(t =>
                `<span style="background:rgba(196,255,0,0.08);color:var(--primary-500);border-radius:var(--radius-full);padding:2px 8px;font-family:var(--font-mono);font-size:0.65rem;">${t}</span>`
            ).join('');

            const hasSession = activeSession?.libraryId === item.id;
            const resumeBtn = hasSession
                ? `<button class="btn btn-outline" data-action="resume-quiz" data-id="${item.id}" title="Retomar" style="flex:none;width:auto;padding:0 var(--space-sm);font-size:0.7rem;">RETOMAR</button>`
                : '';

            const isSelected = this._selection.active && this._selection.ids.has(item.id);

            const div = document.createElement('div');
            div.className = 'library-card';
            if (isSelected) div.classList.add('is-selected');

            if (this._selection.active) {
                div.dataset.action = 'toggle-card-select';
                div.dataset.id = item.id;
            }

            const checkboxHtml = this._selection.active
                ? `<div class="lib-card-checkbox-wrap"><input type="checkbox" class="lib-card-checkbox" ${isSelected ? 'checked' : ''} tabindex="-1"></div>`
                : '';

            const actionsHtml = this._selection.active
                ? ''
                : `<div class="lib-actions">
                    ${resumeBtn}
                    <button class="btn btn-primary" data-action="load-quiz" data-id="${item.id}" title="Iniciar"><span data-icon="play"></span></button>
                    <button class="btn btn-outline" data-action="edit-quiz" data-id="${item.id}" title="Editar"><span data-icon="edit"></span></button>
                    <button class="btn btn-outline" data-action="download-quiz" data-id="${item.id}" title="Exportar"><span data-icon="download"></span></button>
                    <button class="btn btn-ghost btn-delete" data-action="delete-quiz" data-id="${item.id}" title="Excluir"><span data-icon="trash"></span></button>
                   </div>`;

            const avgColor = avg >= 70 ? 'var(--success)' : avg >= 40 ? 'var(--warning)' : avg > 0 ? 'var(--error)' : 'var(--text-muted)';

            div.innerHTML = `
                ${checkboxHtml}
                <div class="lib-card-header">
                    <div class="lib-title">${item.data.nomeSimulado}</div>
                    <div class="lib-date">${new Date(item.meta.addedAt).toLocaleDateString('pt-BR')}</div>
                </div>
                <div class="lib-stats-row">
                    <span>${item.meta.questionsCount} questões</span>
                    <span style="color:${avgColor};">${avg > 0 ? avg + '% média' : '—'}</span>
                </div>
                ${item.data.descricao ? `<p class="lib-desc">${item.data.descricao}</p>` : ''}
                <div class="lib-played">Jogado: ${timesPlayed}x &nbsp;|&nbsp; Último: ${lastPlayed}</div>
                ${historyHtml}
                ${tagsHtml ? `<div class="lib-tags">${tagsHtml}</div>` : ''}
                ${actionsHtml}
            `;
            container.appendChild(div);
        },

        _updateCapacityUI() {
            StorageManager.getStorageStats().then(stats => {
                const count = StorageManager.getLibrary().length;
                const pct = Math.round(stats.percent * 100);

                const fill = document.getElementById('libCapacityFill');
                const info = document.getElementById('libStorageInfo');

                if (fill) {
                    fill.style.width = pct + '%';
                    fill.classList.remove('warn', 'danger');
                    if (pct >= 85) fill.classList.add('danger');
                    else if (pct >= 70) fill.classList.add('warn');
                }

                if (info) {
                    const color = pct >= 85 ? 'var(--error)' : pct >= 70 ? 'var(--warning)' : 'var(--text-muted)';
                    info.innerHTML = `
                        <span>${count} simulado${count !== 1 ? 's' : ''}</span>
                        <span style="color:${color};">${Utils.formatBytes(stats.usage)} / ${Utils.formatBytes(stats.quota)} (${pct}%)</span>
                    `;
                }
            });
        },

        _syncSelectionUI() {
            const btn = document.getElementById('btnToggleSelection');
            const toolbar = document.getElementById('libBulkToolbar');
            if (btn) {
                const label = btn.querySelector('.btn-label');
                if (label) label.textContent = this._selection.active ? 'Cancelar' : 'Selecionar';
            }
            if (toolbar) toolbar.classList.toggle('hidden', !this._selection.active);
            this._updateSelectionCount();
        },

        _updateSelectionCount() {
            const count = this._selection.ids.size;
            const el = document.getElementById('libSelectionCount');
            const btn = document.getElementById('libDeleteSelectedBtn');
            const label = document.getElementById('libDeleteSelectedLabel');
            if (el) el.textContent = `${count} selecionado${count !== 1 ? 's' : ''}`;
            if (btn) btn.disabled = count === 0;
            if (label) label.textContent = count > 0 ? `Excluir (${count})` : 'Excluir';
        },

        toggleSelectionMode() {
            this._selection.active = !this._selection.active;
            if (!this._selection.active) this._selection.ids.clear();
            this.render();
        },

        toggleCardSelection(id) {
            if (this._selection.ids.has(id)) {
                this._selection.ids.delete(id);
            } else {
                this._selection.ids.add(id);
            }
            const card = document.querySelector(`.library-card[data-id="${id}"]`);
            if (card) {
                card.classList.toggle('is-selected', this._selection.ids.has(id));
                const cb = card.querySelector('.lib-card-checkbox');
                if (cb) cb.checked = this._selection.ids.has(id);
            }
            this._updateSelectionCount();
        },

        selectAll() {
            StorageManager.getLibrary().forEach(item => this._selection.ids.add(item.id));
            document.querySelectorAll('.library-card[data-id]').forEach(card => {
                card.classList.add('is-selected');
                const cb = card.querySelector('.lib-card-checkbox');
                if (cb) cb.checked = true;
            });
            this._updateSelectionCount();
        },

        deselectAll() {
            this._selection.ids.clear();
            document.querySelectorAll('.library-card[data-id]').forEach(card => {
                card.classList.remove('is-selected');
                const cb = card.querySelector('.lib-card-checkbox');
                if (cb) cb.checked = false;
            });
            this._updateSelectionCount();
        },

        bulkDelete() {
            const count = this._selection.ids.size;
            if (count === 0) return;
            ModalManager.confirm(
                `Excluir ${count} simulado${count !== 1 ? 's' : ''} permanentemente? Esta ação não pode ser desfeita.`,
                () => {
                    StorageManager.removeManyFromLibrary([...this._selection.ids]);
                    this._selection.ids.clear();
                    this._selection.active = false;
                    this.render();
                    ToastSystem.show(`${count} simulado${count !== 1 ? 's' : ''} excluído${count !== 1 ? 's' : ''}.`);
                }
            );
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
