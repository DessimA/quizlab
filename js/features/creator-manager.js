/**
 * CreatorManager - Wizard logic for creating new quizzes
 */
(function(window) {
    const CreatorManager = {
        questionCount: 0,
        _editingId: null,

        reset() {
            document.getElementById('builderTitle').value = '';
            document.getElementById('builderDesc').value = '';
            document.getElementById('builderTags').value = '';
            const timerField = document.getElementById('builderTimer');
            if (timerField) timerField.value = '';
            document.getElementById('builderMetaSection').classList.remove('collapsed', 'completed');
            document.getElementById('builderQuestionsContainer').classList.add('hidden');
            document.getElementById('builderQuestionsList').innerHTML = '';
            this.questionCount = 0;
            this._editingId = null;
            const editNotice = document.getElementById('creatorEditNotice');
            if (editNotice) editNotice.classList.add('hidden');
            this.validateGlobal();
        },

        confirmMeta() {
            document.getElementById('builderMetaSection').classList.add('completed', 'collapsed');
            document.getElementById('builderQuestionsContainer').classList.remove('hidden');
            document.getElementById('btnEditMeta').classList.remove('hidden');
            if (document.getElementById('builderQuestionsList').children.length === 0) this.addQuestion();
        },

        editMeta() {
            document.getElementById('builderMetaSection').classList.remove('collapsed');
            document.getElementById('btnEditMeta').classList.add('hidden');
        },

        loadForEdit(item) {
            this.reset();
            this._editingId = item.id;

            document.getElementById('builderTitle').value = item.data.nomeSimulado || '';
            document.getElementById('builderDesc').value = item.data.descricao || '';
            document.getElementById('builderTags').value = (item.data.tags || []).join(', ');

            const timerField = document.getElementById('builderTimer');
            if (timerField) timerField.value = item.data.tempoLimiteMinutos || '';

            const editNotice = document.getElementById('creatorEditNotice');
            if (editNotice) {
                editNotice.textContent = `Editando: ${item.data.nomeSimulado}`;
                editNotice.classList.remove('hidden');
            }

            this.confirmMeta();

            const list = document.getElementById('builderQuestionsList');
            list.innerHTML = '';

            item.data.questoes.forEach((q, index) => {
                this.questionCount = index + 1;
                const card = this._buildQuestionCard(q, this.questionCount);
                list.appendChild(card);
                IconSystem.inject(card);
            });

            this.validateGlobal();
            ToastSystem.show('Simulado carregado para edição.');
        },

        _buildQuestionCard(q, number) {
            const qId = `q-${Date.now()}-${number}`;
            const div = document.createElement('div');
            div.className = 'builder-card slide-up';
            div.id = qId;
            div.draggable = true;

            div.innerHTML = `
                <div class="builder-header" data-action="toggle-collapse" data-target="${qId}">
                    <div class="builder-title-wrapper">
                        <div class="drag-handle">≡≡</div>
                        <div class="status-icon">${IconSystem.render('check', 'xs')}</div>
                        <span class="q-number" style="font-weight:700;font-size:0.85rem;font-family:var(--font-mono)">Q.${String(number).padStart(2, '0')}</span>
                    </div>
                    <div style="display:flex;gap:4px">
                        <button class="btn btn-ghost" data-action="remove-question" data-target="${qId}">${IconSystem.render('trash', 'sm')}</button>
                        <div style="padding:10px">${IconSystem.render('chevronDown', 'sm')}</div>
                    </div>
                </div>
                <div class="builder-card-body">
                    <div class="input-group">
                        <div style="display:flex;justify-content:space-between;">
                            <label class="input-label">Enunciado *</label>
                            <span class="char-counter">${(q.enunciado || '').length}/500</span>
                        </div>
                        <input type="text" class="input-field q-enunciado" maxlength="500"
                            data-oninput="validate-builder"
                            value="${(q.enunciado || '').replace(/"/g, '&quot;')}">
                    </div>
                    <div class="input-group">
                        <label class="input-label">Tipo</label>
                        <select class="input-field q-type" data-onchange="validate-builder">
                            <option value="unica" ${q.tipo === 'unica' ? 'selected' : ''}>Única Escolha</option>
                            <option value="multipla" ${q.tipo === 'multipla' ? 'selected' : ''}>Múltipla Escolha</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label class="input-label">Alternativas *</label>
                        <div class="alternatives-container"></div>
                        <button class="btn btn-outline" style="margin-top:8px;" data-action="add-alternative" data-target="${qId}">
                            ${IconSystem.render('plus', 'sm')} Alternativa
                        </button>
                    </div>
                </div>`;

            const container = div.querySelector('.alternatives-container');
            (q.alternativas || []).forEach(alt => {
                const isCorrect = (q.respostasCorretas || []).includes(alt.id);
                container.appendChild(this._buildAlternativeRow(qId, alt.texto, isCorrect));
            });

            return div;
        },

        _buildAlternativeRow(qId, texto = '', isCorrect = false) {
            const altId = `alt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const div = document.createElement('div');
            div.id = altId;
            div.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px';
            div.innerHTML = `
                <input type="checkbox" class="alt-check" style="width:18px;height:18px"
                    data-onchange="validate-builder" ${isCorrect ? 'checked' : ''}>
                <input type="text" class="input-field alt-text"
                    data-oninput="validate-builder"
                    value="${texto.replace(/"/g, '&quot;')}">
                <button class="btn btn-ghost" data-action="remove-alternative" data-target="${altId}">
                    ${IconSystem.render('trash', 'sm')}
                </button>`;
            return div;
        },

        addQuestion() {
            const list = document.getElementById('builderQuestionsList');
            this.questionCount++;

            const blankQuestion = {
                enunciado: '',
                tipo: 'unica',
                alternativas: [
                    { id: 'a', texto: '' },
                    { id: 'b', texto: '' }
                ],
                respostasCorretas: []
            };

            const card = this._buildQuestionCard(blankQuestion, this.questionCount);
            list.appendChild(card);
            this.validateGlobal();
            IconSystem.inject(card);
        },

        addAlternative(qId) {
            const container = document.querySelector(`#${qId} .alternatives-container`);
            if (!container) return;
            const row = this._buildAlternativeRow(qId);
            container.appendChild(row);
            this.validateGlobal();
            IconSystem.inject(row);
        },

        validateGlobal() {
            const qCards = document.querySelectorAll('#builderQuestionsList .builder-card');
            let allValid = true;

            qCards.forEach(card => {
                const isValid = Validator.isQuestionCardValid(card);
                card.classList.toggle('completed', isValid);
                if (!isValid) allValid = false;
            });

            document.getElementById('btnAddQuestion').disabled = !allValid;
            document.getElementById('btnExport').disabled = !allValid || qCards.length === 0;
            document.getElementById('btnPreview').disabled = !allValid || qCards.length === 0;
        },

        renumberQuestions() {
            const cards = document.querySelectorAll('#builderQuestionsList .builder-card');
            cards.forEach((card, i) => {
                const qNum = card.querySelector('.q-number');
                if (qNum) qNum.textContent = `Q.${(i + 1).toString().padStart(2, '0')}`;
            });
            this.questionCount = cards.length;
        },

        buildQuizObject() {
            const questions = [];
            const qCards = document.querySelectorAll('#builderQuestionsList .builder-card');

            qCards.forEach((card, i) => {
                const alts = [];
                const corrects = [];
                card.querySelectorAll('.alternatives-container > div').forEach((row, idx) => {
                    const txt = row.querySelector('.alt-text').value.trim();
                    const id = String.fromCharCode(97 + idx);
                    if (txt) alts.push({ id, texto: txt });
                    if (row.querySelector('.alt-check').checked) corrects.push(id);
                });
                questions.push({
                    id: i + 1,
                    enunciado: card.querySelector('.q-enunciado').value,
                    tipo: card.querySelector('.q-type').value,
                    alternativas: alts,
                    respostasCorretas: corrects
                });
            });

            const timerVal = parseInt(document.getElementById('builderTimer')?.value);

            return {
                nomeSimulado: document.getElementById('builderTitle').value,
                descricao: document.getElementById('builderDesc').value,
                tags: document.getElementById('builderTags').value.split(',').map(t => t.trim()).filter(Boolean),
                ...(timerVal > 0 && { tempoLimiteMinutos: timerVal }),
                questoes: questions
            };
        },

        preview() {
            const quiz = this.buildQuizObject();
            const code = document.getElementById('previewCode');
            if (code) {
                code.textContent = JSON.stringify(quiz, null, 2);
                ModalManager.open('previewModal');
            }
        }
    };

    let dragSrcEl = null;

    window.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('builder-card')) {
            dragSrcEl = e.target;
            e.dataTransfer.effectAllowed = 'move';
            e.target.style.opacity = '0.4';
        }
    });

    window.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('builder-card')) {
            e.target.style.opacity = '1';
        }
    });

    window.addEventListener('drop', (e) => {
        const target = e.target.closest('.builder-card');
        if (dragSrcEl && target && dragSrcEl !== target) {
            const list = document.getElementById('builderQuestionsList');
            const allNodes = Array.from(list.children);
            if (allNodes.indexOf(dragSrcEl) < allNodes.indexOf(target)) {
                list.insertBefore(dragSrcEl, target.nextSibling);
            } else {
                list.insertBefore(dragSrcEl, target);
            }
            CreatorManager.renumberQuestions();
        }
    });

    window.CreatorManager = CreatorManager;
})(window);
