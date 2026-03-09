(function(window) {
    const LibraryManager = {
        _selection: {
            active: false,
            ids: new Set()
        },

        _activeTab: 'simulados',
        _reviewSelection: new Set(),
        _reviewQty: 0,
        _reviewInitialized: false,
        _lastWrongTotal: 0,

        render() {
            const container = document.getElementById('libraryList');
            if (!container) return;

            const library = StorageManager.getLibrary();
            const query = document.getElementById('librarySearch')?.value.toLowerCase().trim() || '';
            const sortBy = document.getElementById('librarySort')?.value || 'recent';

            let filtered = library;

            if (query) {
                filtered = library.filter(item => {
                    const name = item.data.nomeSimulado?.toLowerCase() || '';
                    const desc = item.data.descricao?.toLowerCase() || '';
                    const tags = (item.data.tags || []).join(' ').toLowerCase();
                    return name.includes(query) || desc.includes(query) || tags.includes(query);
                });
            }

            const sortedLibrary = [...filtered].sort((a, b) => {
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
            this._updateWrongBadge(library);

            const currentTotal = library.reduce((sum, i) => sum + (i.meta.wrongQuestions?.length || 0), 0);

            if (currentTotal !== this._lastWrongTotal) {
                this._reviewInitialized = false;
                this._lastWrongTotal = currentTotal;
            }

            if (this._activeTab === 'revisao') this.renderReviewPanel(library);
        },

        renderCard(item, container, activeSession) {
            const timesPlayed = item.meta.timesPlayed || 0;
            const lastPlayed = item.meta.lastPlayed
                ? new Date(item.meta.lastPlayed).toLocaleDateString('pt-BR')
                : 'Nunca';
            const avg = item.meta.averageScore || 0;

            const historyBars = (item.meta.history || []).slice(0, 6).map(h => {
                const color = Utils.scoreColor(h.score);
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
                ? `<button class="btn btn-outline" data-action="resume-quiz" data-id="${item.id}" title="Retomar"><span data-icon="history"></span></button>`
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

            const avgColor = Utils.scoreColor(avg);

            const wrongCount = item.meta.wrongQuestions?.length || 0;
            const wrongBadgeHtml = wrongCount > 0
                ? `<span style="display:inline-flex;align-items:center;gap:4px;font-family:var(--font-mono);font-size:0.7rem;color:var(--error);font-weight:700;" title="${wrongCount} questão(ões) com erro registrado">
                    <span data-icon="x" data-size="xs"></span> ${wrongCount} para revisão
                  </span>`
                : '';

            div.innerHTML = `
                ${checkboxHtml}
                <div class="lib-card-header">
                    <div class="lib-title">${item.data.nomeSimulado}</div>
                    <div class="lib-date">${new Date(item.meta.addedAt).toLocaleDateString('pt-BR')}</div>
                </div>
                <div class="lib-stats-row">
                    <span>${item.meta.questionsCount} questões</span>
                    <span style="color:${avgColor};">${avg > 0 ? avg + '% média' : '—'}</span>
                    ${wrongBadgeHtml}
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
            const stats = StorageManager.getStorageStats();
            const pct = Math.round(stats.percent * 100);
            const clampedPct = Math.min(100, Math.max(0, pct));

            const fillCircle = document.getElementById('storageCircleFill');
            const percentText = document.getElementById('storagePercentText');

            if (fillCircle) {
                const offset = 100 - clampedPct;
                fillCircle.style.strokeDashoffset = offset;
                
                fillCircle.classList.remove('warn', 'danger');
                if (pct >= 85) fillCircle.classList.add('danger');
                else if (pct >= 70) fillCircle.classList.add('warn');
            }

            if (percentText) {
                percentText.textContent = `${clampedPct}%`;
            }
        },

        _syncSelectionUI() {
            const btn = document.getElementById('btnToggleSelection');
            const toolbar = document.getElementById('libBulkToolbar');

            if (this._activeTab === 'revisao') {
                btn?.classList.add('hidden');
                toolbar?.classList.add('hidden');
                return;
            }

            if (btn) {
                btn.classList.remove('hidden');
                const label = btn.querySelector('.btn-label');
                if (label) label.textContent = this._selection.active ? 'Cancelar' : 'Selecionar';
            }
            if (toolbar) toolbar.classList.toggle('hidden', !this._selection.active);
            this._updateSelectionCount();
        },

        switchTab(tab) {
            this._activeTab = tab;
            const isRevisao = tab === 'revisao';

            document.querySelectorAll('.lib-tab').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tab);
            });

            document.getElementById('libSimuladosControls')?.classList.toggle('hidden', isRevisao);
            document.getElementById('libraryList')?.classList.toggle('hidden', isRevisao);
            document.getElementById('emptyLibraryMsg')?.classList.toggle('hidden', true);
            document.getElementById('libReviewPanel')?.classList.toggle('hidden', !isRevisao);

            this._syncSelectionUI();

            if (isRevisao) this.renderReviewPanel();
        },

        renderReviewPanel(library) {
            const panel = document.getElementById('libReviewPanel');
            if (!panel) return;

            const lib = library || StorageManager.getLibrary();
            const total = lib.reduce((sum, item) => sum + (item.meta.wrongQuestions?.length || 0), 0);

            if (!this._reviewInitialized) {
                lib.forEach(item => {
                    if ((item.meta.wrongQuestions?.length || 0) > 0) {
                        this._reviewSelection.add(item.id);
                    }
                });
                this._reviewInitialized = true;
            }

            const selectedTotal = this._getSelectedWrongCount(lib);

            if (!this._reviewQty || this._reviewQty > selectedTotal) {
                this._reviewQty = selectedTotal;
            }
            if (this._reviewQty < 1 && selectedTotal > 0) {
                this._reviewQty = 1;
            }

            panel.innerHTML = total === 0
                ? this._buildEmptyReviewHTML(lib)
                : this._buildReviewPanelHTML(lib, selectedTotal);

            if (window.IconSystem) IconSystem.inject(panel);
        },

        _buildEmptyReviewHTML(library) {
            const lib = library || StorageManager.getLibrary();
            const hasSimulados = lib.length > 0;
            const message = hasSimulados
                ? 'Complete um simulado salvo na biblioteca para começar a rastrear erros.'
                : 'Adicione simulados à biblioteca e jogue para começar a rastrear seus erros.';
            const ctaHtml = !hasSimulados
                ? `<button class="btn btn-outline" data-action="enter-app" style="margin-top:var(--space-md);">Ir para o início</button>`
                : '';

            return `
                <div class="review-info-notice" style="margin-bottom: var(--space-lg);">
                    <span data-icon="info" data-size="sm"></span>
                    <span>O rastreamento de erros funciona apenas para simulados salvos na Biblioteca Local.</span>
                </div>
                <div class="empty-state" style="text-align:center; padding:var(--space-2xl); color:var(--text-muted); grid-column: 1 / -1;">
                    <p>Nenhuma questão com erro registrada ainda.</p>
                    <p style="margin-top:var(--space-sm); font-size:0.8rem;">${message}</p>
                    ${ctaHtml}
                </div>`;
        },

        _buildReviewPanelHTML(library, selectedTotal) {
            const rowsHTML = library.map(item => {
                const count = item.meta.wrongQuestions?.length || 0;
                const isSelected = this._reviewSelection.has(item.id);
                const isDisabled = count === 0;

                return `
                    <label class="review-quiz-row${isDisabled ? ' disabled' : ''}">
                        <input type="checkbox"
                               data-action="review-source-toggle"
                               data-id="${item.id}"
                               ${isSelected ? 'checked' : ''}
                               ${isDisabled ? 'disabled' : ''}>
                        <span class="review-quiz-name">${item.data.nomeSimulado}</span>
                        <span class="review-quiz-count${count > 0 ? ' has-errors' : ''}">
                            ${count > 0 ? `${count} ✗` : '—'}
                        </span>
                    </label>`;
            }).join('');

            const sliderAndButtonHTML = selectedTotal > 0 ? `
                <div class="review-qty-section">
                    <div class="review-qty-header">
                        <span>Questões no simulado de revisão</span>
                        <span id="reviewQtyDisplay" class="review-qty-value">${this._reviewQty}</span>
                    </div>
                    <input type="range"
                           id="reviewQtySlider"
                           data-oninput="review-qty-change"
                           min="1"
                           max="${selectedTotal}"
                           value="${this._reviewQty}"
                           style="width:100%; cursor:pointer;">
                    <div class="review-qty-labels">
                        <span>1</span>
                        <span>${selectedTotal} disponíveis</span>
                    </div>
                </div>
                <button class="btn btn-primary" style="width:100%; margin-top:var(--space-sm);" data-action="start-review-quiz">
                    <span data-icon="play" data-size="sm"></span>
                    Iniciar Revisão
                </button>` : `
                <p style="text-align:center; color:var(--text-muted); padding:var(--space-md); font-size:0.85rem;">
                    Selecione ao menos um simulado com erros para iniciar a revisão.
                </p>`;

            return `
                <div class="review-info-notice" style="margin-bottom: var(--space-lg);">
                    <span data-icon="info" data-size="sm"></span>
                    <span>O rastreamento de erros funciona apenas para simulados salvos na Biblioteca Local.</span>
                </div>
                <div style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-muted); margin-bottom:var(--space-sm);">
                    SIMULADOS
                </div>
                <div class="review-quiz-list" style="margin-bottom:var(--space-lg);">${rowsHTML}</div>
                ${sliderAndButtonHTML}`;
        },

        toggleReviewSource(id, checked) {
            if (checked) {
                this._reviewSelection.add(id);
            } else {
                this._reviewSelection.delete(id);
            }
            this.renderReviewPanel();
        },

        updateReviewQty(qty) {
            this._reviewQty = qty;
            const display = document.getElementById('reviewQtyDisplay');
            if (display) display.textContent = qty;
        },

        getSelectedForReview() {
            const validIds = new Set(StorageManager.getLibrary().map(i => i.id));
            return [...this._reviewSelection].filter(id => validIds.has(id));
        },

        getReviewQuantity() {
            return this._reviewQty;
        },

        _getSelectedWrongCount(library) {
            const lib = library || StorageManager.getLibrary();
            return lib
                .filter(item => this._reviewSelection.has(item.id))
                .reduce((sum, item) => sum + (item.meta.wrongQuestions?.length || 0), 0);
        },

        _updateWrongBadge(library) {
            const lib = library || StorageManager.getLibrary();
            const total = lib.reduce((sum, item) => sum + (item.meta.wrongQuestions?.length || 0), 0);
            const badge = document.getElementById('wrongBadge');
            if (!badge) return;

            badge.textContent = total;
            badge.classList.toggle('hidden', total === 0);
        },

        _updateSelectionCount() {
            const count = this._selection.ids.size;
            const el = document.getElementById('libSelectionCount');
            const btn = document.getElementById('libDeleteSelectedBtn');
            const label = document.getElementById('libDeleteSelectedLabel');
            if (el) el.textContent = Utils.plural(count, 'selecionado');
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
                `Excluir ${Utils.plural(count, 'simulado')} permanentemente? Esta ação não pode ser desfeita.`,
                () => {
                    StorageManager.removeManyFromLibrary([...this._selection.ids]);
                    this._selection.ids.clear();
                    this._selection.active = false;
                    this.render();
                    ToastSystem.show(`${Utils.plural(count, 'simulado')} excluído${count !== 1 ? 's' : ''}.`);
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
