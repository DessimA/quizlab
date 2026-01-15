/**
 * CreatorManager - Wizard logic for creating new quizzes
 */
(function(window) {
    const CreatorManager = {
        questionCount: 0,

        reset() {
            document.getElementById('builderTitle').value = '';
            document.getElementById('builderDesc').value = '';
            document.getElementById('builderTags').value = '';
            document.getElementById('builderMetaSection').classList.remove('collapsed', 'completed');
            document.getElementById('builderQuestionsContainer').classList.add('hidden');
            document.getElementById('builderQuestionsList').innerHTML = '';
            this.questionCount = 0;
            this.validateGlobal();
        },

        confirmMeta() {
            document.getElementById('builderMetaSection').classList.add('completed', 'collapsed');
            document.getElementById('builderQuestionsContainer').classList.remove('hidden');
            document.getElementById('btnEditMeta').classList.remove('hidden');
            if(document.getElementById('builderQuestionsList').children.length === 0) this.addQuestion();
        },

        editMeta() {
            document.getElementById('builderMetaSection').classList.remove('collapsed');
            document.getElementById('btnEditMeta').classList.add('hidden');
        },

        addQuestion() {
            const list = document.getElementById('builderQuestionsList');
            this.questionCount++;
            const qId = `q-${Date.now()}`;
            const div = document.createElement('div');
            div.className = 'builder-card slide-up';
            div.id = qId;
            div.draggable = true;
            
            // Re-using the same HTML structure but sanitized
            div.innerHTML = `
                <div class="builder-header" data-action="toggle-collapse" data-target="${qId}">
                    <div class="builder-title-wrapper">
                        <div class="drag-handle">≡≡</div>
                        <div class="status-icon">${IconSystem.render('check', 'xs')}</div>
                        <span class="q-number" style="font-weight:700; font-size:0.85rem; font-family:var(--font-mono)">Q.${this.questionCount.toString().padStart(2, '0')}</span>
                    </div>
                    <div style="display:flex; gap:4px">
                        <button class="btn btn-ghost" data-action="remove-question" data-target="${qId}">${IconSystem.render('trash', 'sm')}</button>
                        <div style="padding:10px">${IconSystem.render('chevronDown', 'sm')}</div>
                    </div>
                </div>
                <div class="builder-card-body">
                    <div class="input-group">
                        <div style="display:flex; justify-content:space-between;">
                            <label class="input-label">Enunciado *</label>
                            <span class="char-counter">0/500</span>
                        </div>
                        <input type="text" class="input-field q-enunciado" maxlength="500" data-oninput="validate-builder">
                    </div>
                    <div class="input-group">
                        <label class="input-label">Tipo</label>
                        <select class="input-field q-type" data-onchange="validate-builder">
                            <option value="unica">Única Escolha</option>
                            <option value="multipla">Múltipla Escolha</option>
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
            list.appendChild(div);
            this.addAlternative(qId);
            this.addAlternative(qId);
            this.validateGlobal();
            IconSystem.inject(div);
        },

        addAlternative(qId) {
            const container = document.querySelector(`#${qId} .alternatives-container`);
            if(!container) return;
            const altId = `alt-${Date.now()}-${Math.random()}`;
            const div = document.createElement('div');
            div.id = altId;
            div.style.cssText = "display:flex; align-items:center; gap:8px; margin-bottom:8px";
            div.innerHTML = `
                <input type="checkbox" class="alt-check" style="width:18px;height:18px" data-onchange="validate-builder">
                <input type="text" class="input-field alt-text" data-oninput="validate-builder">
                <button class="btn btn-ghost" data-action="remove-alternative" data-target="${altId}"><span data-icon="trash"></span></button>
            `;
            container.appendChild(div);
            this.validateGlobal();
            IconSystem.inject(div);
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
            
            return {
                nomeSimulado: document.getElementById('builderTitle').value,
                descricao: document.getElementById('builderDesc').value,
                tags: document.getElementById('builderTags').value.split(',').map(t => t.trim()).filter(Boolean),
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

    // Drag & Drop State
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

