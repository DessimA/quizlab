

let quizData = null;
let currentQuestion = 0;
let userAnswers = [];
let questionAnswered = [];
let visitedQuestions = [];
let correctAnswersCount = 0;
let incorrectAnswersCount = 0;
let builderQuestionCount = 0;
let modalCallback = null;
let pendingSaveQuiz = null;
let currentLibraryId = null;

const STORAGE_KEY = 'quizlab_library';
const DRAFT_KEY = 'quizlab_draft';
const MAX_SLOTS = 10;

// --- UI Feedback Helpers ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">${Icons.crossStatic}</button>
    `;
    
    container.appendChild(toast);
    
    // Auto dismiss
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.4s ease-out forwards';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function showLoading(text = 'PROCESSANDO...') {
    const overlay = document.getElementById('loading-overlay');
    const txt = document.getElementById('loadingText');
    if (overlay && txt) {
        txt.textContent = text;
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

// --- Onboarding & Draft Logic ---
window.addEventListener('load', () => {
    // Library Listeners
    const libSearch = document.getElementById('librarySearch');
    const libSort = document.getElementById('librarySort');
    if (libSearch) libSearch.oninput = renderLibrary;
    if (libSort) libSort.onchange = renderLibrary;

    // Auto-save interval for Creator
    setInterval(saveDraft, 30000);
});

// --- Keyboard Accessibility ---
document.addEventListener('keydown', (e) => {
    // 1. Close modals with Escape
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
        modals.forEach(m => closeModal(m.id));
    }

    // 2. Quiz Navigation
    const quizScreen = document.getElementById('quizScreen');
    if (quizScreen && !quizScreen.classList.contains('hidden')) {
        if (e.key === 'ArrowLeft') previousQuestion();
        if (e.key === 'ArrowRight') nextQuestion();
        
        // Select alternatives with 1-9
        if (e.key >= '1' && e.key <= '9') {
            const index = parseInt(e.key) - 1;
            const alts = document.querySelectorAll('#questionContainer .alternative');
            if (alts[index] && !alts[index].classList.contains('disabled')) {
                alts[index].click();
            }
        }
        
        // Confirm with Enter
        if (e.key === 'Enter') {
            const confBtn = document.getElementById('confirmBtn');
            if (confBtn && !confBtn.classList.contains('hidden')) {
                confirmAnswer();
            } else {
                const finishBtn = document.getElementById('finishBtn');
                if (finishBtn && !finishBtn.classList.contains('hidden')) {
                    finishQuiz();
                } else {
                    const nextBtn = document.getElementById('nextBtn');
                    if (nextBtn && !nextBtn.classList.contains('hidden')) {
                        nextQuestion();
                    }
                }
            }
        }
    }

    // 3. Creator Draft Save with Ctrl+S
    if (e.ctrlKey && e.key === 's') {
        const creator = document.getElementById('creatorScreen');
        if (creator && !creator.classList.contains('hidden')) {
            e.preventDefault();
            saveDraft();
            showToast("Rascunho salvo!", "info");
        }
    }
});

function saveDraft() {
    const creator = document.getElementById('creatorScreen');
    if (creator && !creator.classList.contains('hidden')) {
        const title = document.getElementById('builderTitle').value;
        const desc = document.getElementById('builderDesc').value;
        if (title || desc) {
            const draft = {
                title,
                desc,
                timestamp: Date.now()
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            // Optional: visual feedback for draft save? 
            // Maybe too noisy to toast every 30s. 
            // We can add a small "Saved" indicator text somewhere if we wanted.
        }
    }
}

// Check for draft when entering creator (Placeholder for now, or we can implement full DOM serialization later)
function checkDraft() {
    // To be fully implemented
}

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

const Icons = {
    check: `<svg class="icon-svg icon-sm" viewBox="0 0 24 24" style="color:var(--success); filter:drop-shadow(0 0 5px var(--success))"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    cross: `<svg class="icon-svg icon-sm" viewBox="0 0 24 24" style="color:var(--error); filter:drop-shadow(0 0 5px var(--error))"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    trash: `<svg class="icon-svg icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    checkStatic: `<svg class="icon-svg icon-sm" viewBox="0 0 24 24" style="color:var(--success)"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    crossStatic: `<svg class="icon-svg icon-sm" viewBox="0 0 24 24" style="color:var(--error)"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    chevronDown: `<svg class="icon-svg icon-sm" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    chevronUp: `<svg class="icon-svg icon-sm" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>`,
    plus: `<svg class="icon-svg icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    play: `<svg class="icon-svg icon-sm" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    download: `<svg class="icon-svg icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`
};

function createRipple(event) {
    const button = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple");
    const ripple = button.getElementsByClassName("ripple")[0];
    if (ripple) ripple.remove();
    button.appendChild(circle);
}

document.addEventListener('click', (e) => {
    if (e.target.closest('.btn')) {
        createRipple({ currentTarget: e.target.closest('.btn'), clientX: e.clientX, clientY: e.clientY });
    }
});

let lastTap = 0;
const header = document.querySelector('.header');

if (header) {
    document.addEventListener('touchend', (e) => {
        if (window.innerWidth >= 768) return;
        if (e.target.closest('.btn') || e.target.closest('input') || e.target.closest('label') || e.target.closest('.header')) return;
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
            const headers = document.querySelectorAll('.header');
            headers.forEach(h => h.classList.toggle('header-hidden'));
            e.preventDefault();
        }
        lastTap = currentTime;
    });
}

function getLibrary() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveToLibrary(quiz, force = false) {
    const lib = getLibrary();
    const exists = lib.find(item => item.data.nomeSimulado === quiz.nomeSimulado && item.data.questoes.length === quiz.questoes.length);
    if (exists && !force) return exists.id;
    if (lib.length >= MAX_SLOTS && !force) {
        pendingSaveQuiz = quiz;
        const oldest = lib.sort((a, b) => a.meta.addedAt - b.meta.addedAt)[0];
        showLimitModal(oldest);
        return null;
    }
    const newId = `quiz_${Date.now()}`;
    const newItem = { 
        id: newId, 
        data: quiz, 
        meta: { 
            addedAt: Date.now(), 
            questionsCount: quiz.questoes.length,
            timesPlayed: 0,
            lastPlayed: null,
            averageScore: 0
        } 
    };
    lib.push(newItem);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
    if(!force) showToast(`"${quiz.nomeSimulado}" salvo na biblioteca!`, 'success');
    return newId;
}

function removeFromLibrary(id) {
    let lib = getLibrary();
    lib = lib.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
    renderLibrary();
}

function renderLibrary() {
    const list = document.getElementById('libraryList');
    const counter = document.getElementById('libraryCounter');
    const emptyMsg = document.getElementById('emptyLibraryMsg');
    const searchTerm = document.getElementById('librarySearch')?.value.toLowerCase() || '';
    const sortBy = document.getElementById('librarySort')?.value || 'recent';

    if(!list) return;
    let lib = getLibrary();
    
    counter.textContent = `${lib.length}/${MAX_SLOTS} SALVOS`;

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
        emptyMsg.textContent = searchTerm ? 'Nenhum simulado encontrado para esta busca.' : 'Nenhum simulado salvo ainda.';
        emptyMsg.classList.remove('hidden');
    } else {
        emptyMsg.classList.add('hidden');
        lib.forEach(item => {
            const date = new Date(item.meta.addedAt).toLocaleDateString();
            const lastPlayed = item.meta.lastPlayed ? new Date(item.meta.lastPlayed).toLocaleDateString() : 'Nunca';
            const timesPlayed = item.meta.timesPlayed || 0;
            const avgScore = item.meta.averageScore || 0;
            const tagsHtml = (item.data.tags || []).map(t => `<span class="badge" style="margin-right:4px; margin-bottom:4px; font-size:0.6rem; padding:2px 6px;">${t}</span>`).join('');
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
                    <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:12px;">${item.data.descricao ? item.data.descricao.substring(0, 80) + (item.data.descricao.length > 80 ? '...' : '') : 'Sem descrição'}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:12px;">Jogado: ${timesPlayed}x | Último: ${lastPlayed}</div>
                    <div style="display:flex; flex-wrap:wrap;">${tagsHtml}</div>
                </div>
                <div class="lib-actions">
                    <button class="btn btn-primary" onclick="loadFromLibrary('${item.id}')">${Icons.play} Iniciar</button>
                    <button class="btn btn-outline" onclick="downloadLibraryItem('${item.id}')">${Icons.download}</button>
                    <button class="btn btn-ghost" style="color:var(--error); min-width: 36px; padding: 6px;" onclick="deleteLibraryItem('${item.id}')">${Icons.trash}</button>
                </div>`;
            list.appendChild(div);
        });
    }
}

function loadFromLibrary(id) {
    const lib = getLibrary();
    const item = lib.find(i => i.id === id);
    if(item) {
        loadQuiz(item.data, id);
    }
}

function deleteLibraryItem(id) { showModal("Excluir este simulado?", 'confirm', () => removeFromLibrary(id)); }
function downloadLibraryItem(id) { const lib = getLibrary(); const item = lib.find(i => i.id === id); if (item) downloadJSON(item.data, item.data.nomeSimulado); }
function showLibrary() { 
    const list = document.getElementById('libraryList');
    if (list) {
        list.innerHTML = `
            <div class="skeleton-card skeleton"></div>
            <div class="skeleton-card skeleton"></div>
            <div class="skeleton-card skeleton"></div>
        `;
    }
    setTimeout(() => {
        renderLibrary(); 
    }, 400); // Brief delay to show skeletons
    changeScreen('libraryScreen'); 
}
function hideLibrary() { changeScreen('uploadScreen'); }

function showLimitModal(oldestItem) {
    const modal = document.getElementById('limitModal');
    document.getElementById('limitOldestTitle').textContent = oldestItem.data.nomeSimulado;
    document.getElementById('limitOldestDate').textContent = `Adicionado em: ${new Date(oldestItem.meta.addedAt).toLocaleDateString()}`;
    document.getElementById('limitBtnExport').onclick = () => { downloadJSON(oldestItem.data, oldestItem.data.nomeSimulado); removeFromLibrary(oldestItem.id); completePendingSave(); };
    document.getElementById('limitBtnReplace').onclick = () => { removeFromLibrary(oldestItem.id); completePendingSave(); };
    document.getElementById('limitBtnCancel').onclick = () => { modal.classList.add('hidden'); loadQuiz(pendingSaveQuiz, null); pendingSaveQuiz = null; };
    modal.classList.remove('hidden');
}

function completePendingSave() { 
    document.getElementById('limitModal').classList.add('hidden'); 
    const libId = saveToLibrary(pendingSaveQuiz, true); 
    loadQuiz(pendingSaveQuiz, libId); 
    pendingSaveQuiz = null; 
}

function changeScreen(showId) {
    const screens = ['landingPage', 'uploadScreen', 'creatorScreen', 'quizScreen', 'resultScreen', 'libraryScreen', 'reviewScreen'];
    const appContainer = document.getElementById('appContainer');
    if (!appContainer) return;
    if (showId === 'landingPage') { appContainer.classList.add('hidden'); document.getElementById('landingPage').style.display = 'block'; }
    else {
        const lp = document.getElementById('landingPage');
        if (lp) lp.style.display = 'none';
        appContainer.classList.remove('hidden');
        if (!appContainer.classList.contains('fade-in')) appContainer.classList.add('fade-in');
        screens.forEach(id => {
            const el = document.getElementById(id);
            if (el && id !== 'landingPage') el.classList.toggle('hidden', id !== showId);
        });
    }
}

function setElementText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

function goHome() {
    const isQuizActive = quizData !== null;
    const creatorScreen = document.getElementById('creatorScreen');
    const isCreatorActive = creatorScreen && !creatorScreen.classList.contains('hidden');
    const navigate = () => window.location.href = 'index.html';
    if (isQuizActive || isCreatorActive) showModal("Voltar ao início? Progresso não salvo será perdido.", 'confirm', navigate);
    else navigate();
}

function enterApp() { 
    changeScreen('uploadScreen'); 
    
    // Check first visit only when entering the app
    if (!localStorage.getItem('quizlab_first_visit')) {
        const modal = document.getElementById('onboardingModal');
        if (modal) modal.classList.remove('hidden');
        localStorage.setItem('quizlab_first_visit', 'true');
    }
}

function showCreator() {
    changeScreen('creatorScreen');
    const bTitle = document.getElementById('builderTitle');
    const bDesc = document.getElementById('builderDesc');
    const bTags = document.getElementById('builderTags');
    const bMeta = document.getElementById('builderMetaSection');
    const bQuestCont = document.getElementById('builderQuestionsContainer');
    const bQuestList = document.getElementById('builderQuestionsList');
    if(bTitle) bTitle.value = '';
    if(bDesc) bDesc.value = '';
    if(bTags) bTags.value = '';
    if(bMeta) bMeta.classList.remove('collapsed', 'completed');
    if(bQuestCont) bQuestCont.classList.add('hidden');
    if(bQuestList) bQuestList.innerHTML = '';
    builderQuestionCount = 0;
    validateMeta();
}

function hideCreator() { changeScreen('uploadScreen'); }

if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', (e) => { if (!e.target.closest('.btn-outline')) fileInput.click(); });
    const btnSelect = document.getElementById('btnSelectFile');
    if (btnSelect) { btnSelect.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fileInput.click(); }); }
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('dragover'); });
    uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
}

if (fileInput) fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

function validateJSON(data) {
    const errors = [];
    if (!data.nomeSimulado) errors.push("Campo 'nomeSimulado' ausente ou vazio.");
    if (!data.questoes || !Array.isArray(data.questoes) || data.questoes.length === 0) {
        errors.push("Campo 'questoes' deve ser uma lista não vazia.");
    } else {
        data.questoes.forEach((q, i) => {
            const qNum = i + 1;
            if (!q.enunciado) errors.push(`Questão #${qNum}: Enunciado ausente.`);
            if (!['unica', 'multipla'].includes(q.tipo)) errors.push(`Questão #${qNum}: Tipo inválido (deve ser 'unica' ou 'multipla').`);
            if (!q.alternativas || !Array.isArray(q.alternativas) || q.alternativas.length < 2) {
                errors.push(`Questão #${qNum}: Deve ter pelo menos 2 alternativas.`);
            } else {
                const altIds = q.alternativas.map(a => a.id);
                q.alternativas.forEach((alt, ai) => {
                    if (!alt.id) errors.push(`Questão #${qNum}, Alt #${ai+1}: ID ausente.`);
                    if (!alt.texto) errors.push(`Questão #${qNum}, Alt #${ai+1}: Texto ausente.`);
                });
                if (!q.respostasCorretas || !Array.isArray(q.respostasCorretas) || q.respostasCorretas.length === 0) {
                    errors.push(`Questão #${qNum}: Campo 'respostasCorretas' ausente ou vazio.`);
                } else {
                    q.respostasCorretas.forEach(rid => {
                        if (!altIds.includes(rid)) errors.push(`Questão #${qNum}: Resposta correta '${rid}' não existe nas alternativas.`);
                    });
                    if (q.tipo === 'unica' && q.respostasCorretas.length !== 1) {
                        errors.push(`Questão #${qNum}: Tipo 'unica' deve ter exatamente 1 resposta correta.`);
                    }
                    if (q.tipo === 'multipla' && q.respostasCorretas.length < 2) {
                        errors.push(`Questão #${qNum}: Tipo 'multipla' deve ter pelo menos 2 respostas corretas.`);
                    }
                }
            }
        });
    }
    return errors;
}

function handleFile(file) {
    if (!file || !file.name.endsWith('.json')) { showModal('Selecione um arquivo .json válido.', 'alert'); return; }
    showLoading('LENDO ARQUIVO...');
    const reader = new FileReader();
    reader.onload = (e) => {
        try { 
            const data = JSON.parse(e.target.result); 
            const errors = validateJSON(data);
            
            setTimeout(() => {
                hideLoading();
                if (errors.length > 0) {
                    const errorHtml = `<div style="text-align:left; font-size:0.85rem; color:var(--error); max-height:200px; overflow-y:auto; padding:10px; background:rgba(255,0,0,0.05); border-radius:4px; border:1px solid var(--error-bg)">
                        <ul style="margin:0; padding-left:20px;">
                            ${errors.map(err => `<li style="margin-bottom:4px">${err}</li>`).join('')}
                        </ul>
                    </div>`;
                    showModal("ERRO DE FORMATO DETECTADO", 'alert');
                    document.getElementById('modalMessage').innerHTML = `Foram encontrados ${errors.length} erro(s) no seu arquivo:<br><br>${errorHtml}<br>Consulte a documentação para o formato correto.`;
                } else {
                    askToSave(data);
                }
            }, 500);
        }
        catch (err) { 
            hideLoading();
            showModal('Erro crítico ao ler o arquivo. Certifique-se que o JSON é válido (verifique vírgulas e aspas).', 'alert'); 
        }
    };
    reader.readAsText(file);
}

function askToSave(data) {
    const lib = getLibrary();
    const exists = lib.find(item => item.data.nomeSimulado === data.nomeSimulado);
    if (exists) {
        loadQuiz(data, exists.id);
    } else {
        showModal(`Salvar "${data.nomeSimulado}" na biblioteca? (${lib.length}/${MAX_SLOTS})`, 'confirm', () => {
            const libId = saveToLibrary(data);
            if (libId) loadQuiz(data, libId);
        });
        const btnCancel = document.getElementById('modalBtnCancel');
        const oldOnClick = btnCancel.onclick;
        btnCancel.onclick = () => { loadQuiz(data, null); btnCancel.onclick = oldOnClick; closeModal(); };
    }
}

function loadQuiz(data, libraryId = null) {
    currentLibraryId = libraryId;
    quizData = data;
    userAnswers = new Array(data.questoes.length).fill(null);
    questionAnswered = new Array(data.questoes.length).fill(false);
    visitedQuestions = new Array(data.questoes.length).fill(false);
    setTimeout(startQuiz, 800);
}

function startQuiz() {
    changeScreen('quizScreen');
    if (quizData.nomeSimulado) { setElementText('headerSubtitle', quizData.nomeSimulado); setElementText('quizTitle', quizData.nomeSimulado); }
    setElementText('quizDescription', quizData.descricao || '');
    currentQuestion = 0;
    setTimeout(() => renderQuestion(), 50);
}

function renderQuestion() {
    visitedQuestions[currentQuestion] = true;
    const q = quizData.questoes[currentQuestion];
    const container = document.getElementById('questionContainer');
    if(!container) return;
    const answered = questionAnswered[currentQuestion];
    const inputType = q.tipo === 'unica' ? 'radio' : 'checkbox';
    container.innerHTML = '';
    const textDiv = document.createElement('div');
    textDiv.className = 'question-text';
    textDiv.innerHTML = `<span style="color:var(--primary-500); font-family:var(--font-mono); font-size:0.8rem; display:block; margin-bottom:8px">QUESTÃO ${currentQuestion + 1}/${quizData.questoes.length}</span>${q.enunciado}`;
    if (q.tipo === 'multipla') {
        textDiv.innerHTML += `<span style="font-size:0.75rem; color:var(--primary-500); display:block; margin-top:4px; letter-spacing:0.05em; font-family:var(--font-mono)">(SELECIONE EXATAMENTE ${q.respostasCorretas.length})</span>`;
    }
    container.appendChild(textDiv);
    q.alternativas.forEach(alt => {
        const checked = userAnswers[currentQuestion] && (Array.isArray(userAnswers[currentQuestion]) ? userAnswers[currentQuestion].includes(alt.id) : userAnswers[currentQuestion] === alt.id);
        const isCorrect = q.respostasCorretas.includes(alt.id);
        let cls = 'alternative';
        if (answered) { cls += ' disabled'; if (isCorrect) cls += ' correct'; else if (checked) cls += ' incorrect'; }
        else if (checked) cls += ' selected';
        const div = document.createElement('div');
        div.className = cls;
        if (!answered) div.onclick = () => select(alt.id);
        div.innerHTML = `<input type="${inputType}" ${checked ? 'checked' : ''} ${answered ? 'disabled' : ''} style="pointer-events:none;"><span class="alternative-text">${alt.texto}</span><div style="margin-left:auto">${answered && (checked || isCorrect) ? (isCorrect ? Icons.checkStatic : Icons.crossStatic) : ''}</div>`;
        container.appendChild(div);
    });
    if (answered) {
        const correct = check(currentQuestion);
        const fb = document.createElement('div');
        fb.className = `feedback-message ${correct ? 'correct' : 'incorrect'}`;
        fb.innerHTML = `<div>${!correct ? `CORRETO: <strong>${q.respostasCorretas.join(', ').toUpperCase()}</strong>` : 'RESPOSTA CORRETA'}</div>`;
        container.appendChild(fb);
    }
    updateProgress();
    renderGrid();
    updateNav();
}

function renderGrid() {
    const grid = document.getElementById('questionGrid');
    if (!grid) return;
    grid.innerHTML = '';
    quizData.questoes.forEach((_, i) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        if (i === currentQuestion) item.classList.add('current');
        if (questionAnswered[i]) {
            const ok = check(i);
            item.classList.add(ok ? 'answered-correct' : 'answered-incorrect');
        } else if (visitedQuestions[i]) {
            item.classList.add('visited');
        }
        item.textContent = i + 1;
        item.onclick = () => { currentQuestion = i; renderQuestion(); };
        grid.appendChild(item);
    });
}

function select(id) {
    const q = quizData.questoes[currentQuestion];
    if (q.tipo === 'unica') userAnswers[currentQuestion] = id;
    else {
        if (!userAnswers[currentQuestion]) userAnswers[currentQuestion] = [];
        const idx = userAnswers[currentQuestion].indexOf(id);
        if (idx > -1) userAnswers[currentQuestion].splice(idx, 1);
        else {
            if (userAnswers[currentQuestion].length >= q.respostasCorretas.length) {
                // Prevent selecting more than required
                return;
            }
            userAnswers[currentQuestion].push(id);
        }
    }
    renderQuestion();
}

function confirmAnswer() {
    questionAnswered[currentQuestion] = true;
    if (check(currentQuestion)) correctAnswersCount++; else incorrectAnswersCount++;
    setElementText('correctCount', correctAnswersCount);
    setElementText('incorrectCount', incorrectAnswersCount);
    renderQuestion();
}

function check(idx) {
    const q = quizData.questoes[idx];
    const ans = userAnswers[idx];
    if (!ans) return false;
    if (q.tipo === 'unica') return q.respostasCorretas.includes(ans);
    return [...ans].sort().join() === [...q.respostasCorretas].sort().join();
}

function updateProgress() {
    const fill = document.getElementById('progressFill');
    if(!fill) return;
    const p = ((currentQuestion + 1) / quizData.questoes.length) * 100;
    fill.style.width = p + '%';
}

function updateNav() {
    const isLast = currentQuestion === (quizData ? quizData.questoes.length - 1 : 0);
    const isAnswered = questionAnswered[currentQuestion];
    const q = quizData ? quizData.questoes[currentQuestion] : null;
    const ans = userAnswers[currentQuestion];
    
    let canConfirm = false;
    if (q) {
        if (q.tipo === 'unica') canConfirm = !!ans;
        else canConfirm = ans && Array.isArray(ans) && ans.length === q.respostasCorretas.length;
    }

    const prev = document.getElementById('prevBtn');
    const skip = document.getElementById('skipBtn');
    const conf = document.getElementById('confirmBtn');
    const next = document.getElementById('nextBtn');
    const fin = document.getElementById('finishBtn');
    
    if(prev) prev.disabled = currentQuestion === 0;
    
    // Confirm: Visible if !Answered and CanConfirm.
    if(conf) conf.classList.toggle('hidden', isAnswered || !canConfirm);
    
    // Skip: Visible if NOT Answered AND NOT Last.
    if(skip) skip.classList.toggle('hidden', isAnswered || isLast); 
    
    // Next: Visible if Answered AND NOT Last.
    if(next) next.classList.toggle('hidden', !isAnswered || isLast);
    
    if(fin) fin.classList.toggle('hidden', !isLast);
}

function previousQuestion() { if (currentQuestion > 0) { currentQuestion--; renderQuestion(); } }
function nextQuestion() { if (currentQuestion < quizData.questoes.length - 1) { currentQuestion++; renderQuestion(); } }

function finishQuiz() {
    renderFinalReview();
    changeScreen('reviewScreen');
}

function backToQuiz() {
    changeScreen('quizScreen');
    renderQuestion();
}

function renderFinalReview() {
    const list = document.getElementById('finalReviewList');
    if (!list) return;
    list.innerHTML = '';
    
    quizData.questoes.forEach((q, i) => {
        const answered = questionAnswered[i];
        const div = document.createElement('div');
        div.className = 'review-card';
        div.style.cursor = 'pointer';
        div.onclick = () => { currentQuestion = i; backToQuiz(); };
        
        div.innerHTML = `
            <div class="review-card-header">
                <span style="color:var(--primary-500)">QUESTÃO ${i+1}</span>
                <span class="badge" style="background:${answered ? 'var(--success-bg)' : 'var(--error-bg)'}; color:${answered ? 'var(--success)' : 'var(--error)'}; border-color:${answered ? 'var(--success)' : 'var(--error)'}">
                    ${answered ? 'RESPONDIDA ✓' : 'PENDENTE ⚠'}
                </span>
            </div>
            <div class="review-card-body">${q.enunciado.substring(0, 120)}${q.enunciado.length > 120 ? '...' : ''}</div>
        `;
        list.appendChild(div);
    });
}

function finalizeQuizProcess() {
    changeScreen('resultScreen');
    const total = quizData.questoes.length;
    const percent = Math.round((correctAnswersCount / total) * 100);
    setElementText('resultScore', `${correctAnswersCount}/${total}`);
    setElementText('resultPercentage', `${percent}%`);

    // Update Library Stats if applicable
    if (currentLibraryId) {
        let lib = getLibrary();
        const idx = lib.findIndex(item => item.id === currentLibraryId);
        if (idx !== -1) {
            const item = lib[idx];
            // Initialize if missing (backward compatibility)
            if (item.meta.timesPlayed === undefined) item.meta.timesPlayed = 0;
            if (item.meta.averageScore === undefined) item.meta.averageScore = 0;
            
            const oldTotal = item.meta.timesPlayed * item.meta.averageScore;
            item.meta.timesPlayed++;
            item.meta.lastPlayed = Date.now();
            item.meta.averageScore = Math.round((oldTotal + percent) / item.meta.timesPlayed);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
        }
    }

    const rev = document.getElementById('reviewContainer');
    if(!rev) return;
    let html = '';
    quizData.questoes.forEach((q, i) => {
        const answered = questionAnswered[i];
        const ok = check(i);
        const statusClass = answered ? (ok ? 'correct' : 'incorrect') : 'skipped';
        const statusText = answered ? (ok ? 'ACERTO' : 'ERRO') : 'PULOU';
        const statusColor = answered ? (ok ? 'var(--success)' : 'var(--error)') : 'var(--text-muted)';
        
        html += `
            <div class="review-card ${statusClass}">
                <div class="review-card-header">
                    <span>QUESTÃO ${i+1}</span>
                    <span style="color:${statusColor}">${statusText}</span>
                </div>
                <div class="review-card-body">${q.enunciado}</div>
            </div>`;
    });
    rev.innerHTML = html;
    
    // Close modal if open
    closeModal();
}

function resetQuiz() {
    if (!quizData) return location.reload();
    userAnswers = new Array(quizData.questoes.length).fill(null);
    questionAnswered = new Array(quizData.questoes.length).fill(false);
    correctAnswersCount = 0; incorrectAnswersCount = 0;
    setElementText('correctCount', 0); setElementText('incorrectCount', 0);
    startQuiz();
}

function toggleQuizCompact() {
    const bar = document.getElementById('quizInfoBar');
    const btn = bar.querySelector('.toggle-compact-btn');
    const isCompact = bar.classList.toggle('compact');
    btn.innerHTML = isCompact ? Icons.chevronDown : Icons.chevronUp;
}

function validateMeta() {
    const btn = document.getElementById('btnConfirmMeta');
    const title = document.getElementById('builderTitle');
    if(btn && title) btn.disabled = !title.value.trim();
}

function confirmMeta() {
    const meta = document.getElementById('builderMetaSection');
    const container = document.getElementById('builderQuestionsContainer');
    const list = document.getElementById('builderQuestionsList');
    const btnEdit = document.getElementById('btnEditMeta');
    if(meta) meta.classList.add('completed', 'collapsed');
    if(container) container.classList.remove('hidden');
    if(btnEdit) btnEdit.classList.remove('hidden');
    if(list && list.children.length === 0) addBuilderQuestion();
}

function editMeta() {
    const meta = document.getElementById('builderMetaSection');
    const btnEdit = document.getElementById('btnEditMeta');
    if(meta) {
        meta.classList.remove('collapsed');
        if(btnEdit) btnEdit.classList.add('hidden');
    }
}

// --- Drag & Drop Reordering ---
let dragSrcEl = null;

function handleDragStart(e) {
    if (e.target.classList.contains('builder-card')) {
        dragSrcEl = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.id);
        e.target.style.opacity = '0.4';
    }
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    const target = e.target.closest('.builder-card');
    if (dragSrcEl && target && dragSrcEl !== target) {
        const list = document.getElementById('builderQuestionsList');
        const allNodes = Array.from(list.children);
        const srcIdx = allNodes.indexOf(dragSrcEl);
        const targetIdx = allNodes.indexOf(target);
        
        if (srcIdx < targetIdx) {
            list.insertBefore(dragSrcEl, target.nextSibling);
        } else {
            list.insertBefore(dragSrcEl, target);
        }
        renumberQuestions();
    }
    return false;
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
}

function renumberQuestions() {
    const cards = document.querySelectorAll('#builderQuestionsList .builder-card');
    cards.forEach((card, i) => {
        const qNum = card.querySelector('.q-number');
        if (qNum) qNum.textContent = `Q.${(i + 1).toString().padStart(2, '0')}`;
    });
    builderQuestionCount = cards.length;
}

function toggleCollapse(id) { const el = document.getElementById(id); if(el) el.classList.toggle('collapsed'); }

function addBuilderQuestion() {
    const list = document.getElementById('builderQuestionsList');
    if(!list) return;
    const lastQ = list.lastElementChild;
    if (lastQ && !lastQ.classList.contains('collapsed')) { if (!validateQuestionCard(lastQ)) return; lastQ.classList.add('collapsed', 'completed'); }
    builderQuestionCount++;
    const qId = `q-${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'builder-card slide-up';
    div.id = qId;
    div.draggable = true;
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleDrop);
    div.addEventListener('dragend', handleDragEnd);

    div.innerHTML = `
        <div class="builder-header" onclick="toggleCollapse('${qId}')">
            <div class="builder-title-wrapper">
                <div class="drag-handle" style="cursor:grab; color:var(--text-muted); padding-right:8px;">≡≡</div>
                <div class="status-icon">${Icons.checkStatic}</div>
                <span class="q-number" style="font-weight:700; font-size:0.85rem; font-family:var(--font-mono)">Q.${builderQuestionCount.toString().padStart(2, '0')}</span>
            </div>
            <div style="display:flex; gap:4px">
                <button class="btn btn-ghost" onclick="event.stopPropagation(); this.closest('.builder-card').remove(); renumberQuestions(); validateBuilderGlobal();">${Icons.trash}</button>
                <div style="padding:10px">${Icons.chevronDown}</div>
            </div>
        </div>
        <div class="builder-card-body">
            <div class="input-group">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                    <label class="input-label" style="margin-bottom:0">Enunciado *</label>
                    <span class="char-counter" style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono)">0/500</span>
                </div>
                <input type="text" class="input-field q-enunciado" maxlength="500" oninput="updateCharCounter(this); validateBuilderGlobal()">
            </div>
            <div class="input-group">
                <label class="input-label">Tipo</label>
                <select class="input-field q-type" onchange="validateBuilderGlobal()">
                    <option value="unica">Única Escolha</option>
                    <option value="multipla">Múltipla Escolha</option>
                </select>
            </div>
            <div class="input-group">
                <label class="input-label">Alternativas *</label>
                <div class="alternatives-container"></div>
                <button class="btn btn-outline" style="margin-top:8px" onclick="addBuilderAlternative('${qId}')">${Icons.plus}</button>
            </div>
        </div>`;
    list.appendChild(div);
    addBuilderAlternative(qId);
    addBuilderAlternative(qId);
    validateBuilderGlobal();
}

function addBuilderAlternative(qId) {
    const container = document.querySelector(`#${qId} .alternatives-container`);
    if(!container) return;
    const altId = `alt-${Date.now()}-${Math.random()}`;
    const div = document.createElement('div');
    div.id = altId;
    div.style.cssText = "display:flex; align-items:center; gap:8px; margin-bottom:8px";
    div.innerHTML = `
        <input type="checkbox" class="alt-check" style="width:18px;height:18px" onchange="validateBuilderGlobal()">
        <input type="text" class="input-field alt-text" oninput="validateBuilderGlobal()">
        <button class="btn btn-ghost" onclick="removeBuilderAlternative('${altId}')">${Icons.trash}</button>
    `;
    container.appendChild(div);
    validateBuilderGlobal();
}

function removeBuilderAlternative(id) { document.getElementById(id)?.remove(); validateBuilderGlobal(); }

function updateCharCounter(el) {
    const counter = el.previousElementSibling.querySelector('.char-counter');
    if (counter) counter.textContent = `${el.value.length}/${el.maxLength}`;
}

function validateBuilderGlobal() {
    const qCards = document.querySelectorAll('#builderQuestionsList .builder-card');
    let allValid = true;
    
    qCards.forEach(card => {
        const isValid = isQuestionCardValid(card);
        card.classList.toggle('completed', isValid);
        if (!isValid) allValid = false;
    });

    const btnAdd = document.getElementById('btnAddQuestion');
    const btnExport = document.getElementById('btnExport');
    const btnPreview = document.getElementById('btnPreview');
    
    if (btnAdd) btnAdd.disabled = !allValid;
    if (btnExport) btnExport.disabled = !allValid || qCards.length === 0;
    if (btnPreview) btnPreview.disabled = !allValid || qCards.length === 0;
}

function isQuestionCardValid(card) {
    const enunci = card.querySelector('.q-enunciado').value.trim();
    if (enunci.length < 5) return false;
    
    const alts = card.querySelectorAll('.alt-text');
    let allAltsFilled = alts.length >= 2;
    alts.forEach(a => { if (!a.value.trim()) allAltsFilled = false; });
    if (!allAltsFilled) return false;
    
    const type = card.querySelector('.q-type').value;
    const checks = card.querySelectorAll('.alt-check:checked');
    if (type === 'unica') { if (checks.length !== 1) return false; }
    else { if (checks.length < 2) return false; }
    
    return true;
}

function validateQuestionCard(card) {
    if (!isQuestionCardValid(card)) {
        showModal("Verifique se a questão possui enunciado (mín. 5 chars), pelo menos 2 alternativas preenchidas e a(s) resposta(s) correta(s) marcada(s).", 'alert');
        return false;
    }
    return true;
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".json"; a.click();
}

function buildQuizFromBuilder() {
    const questions = [];
    const qCards = document.querySelectorAll('#builderQuestionsList .builder-card');
    for (let i = 0; i < qCards.length; i++) { if (!validateQuestionCard(qCards[i])) return null; }
    
    qCards.forEach((card, i) => {
        const alts = [];
        const corrects = [];
        card.querySelectorAll('.alternatives-container > div').forEach((row, idx) => {
            const txt = row.querySelector('.alt-text').value.trim();
            const id = String.fromCharCode(97 + idx);
            if (txt) alts.push({ id, texto: txt });
            if (row.querySelector('.alt-check').checked) corrects.push(id);
        });
        questions.push({ id: i + 1, enunciado: card.querySelector('.q-enunciado').value, tipo: card.querySelector('.q-type').value, alternativas: alts, respostasCorretas: corrects });
    });
    
    const title = document.getElementById('builderTitle').value;
    const desc = document.getElementById('builderDesc').value;
    const tagsStr = document.getElementById('builderTags').value;
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
    
    return { nomeSimulado: title, descricao: desc, tags: tags, questoes: questions };
}

function previewBuilderJson() {
    const quiz = buildQuizFromBuilder();
    if (!quiz) return;
    
    const code = document.getElementById('previewCode');
    if (code) {
        code.textContent = JSON.stringify(quiz, null, 2);
        document.getElementById('previewModal').classList.remove('hidden');
    }
}

function copyToClipboard() {
    const text = document.getElementById('previewCode').textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copiado para o clipboard!", "success");
    });
}

function exportBuilderJson() {
    const quiz = buildQuizFromBuilder();
    if (!quiz) return;
    
    // Store temporarily for the export flow
    pendingSaveQuiz = quiz;
    
    // Open Options Modal
    document.getElementById('saveToLibCheckbox').checked = true; // Default to true
    document.getElementById('exportOptionsModal').classList.remove('hidden');
}

// Handler for Export Confirmation
document.getElementById('btnConfirmExport').onclick = () => {
    if (!pendingSaveQuiz) return;
    
    // 1. Download
    downloadJSON(pendingSaveQuiz, pendingSaveQuiz.nomeSimulado);
    
    // 2. Save to Library (if checked)
    const shouldSave = document.getElementById('saveToLibCheckbox').checked;
    let savedId = null;
    if (shouldSave) {
        savedId = saveToLibrary(pendingSaveQuiz);
    }
    
    // 3. Close Options and Open Action Modal
    closeModal('exportOptionsModal');
    const actionModal = document.getElementById('builderActionModal');
    
    // Attach the ID to the load button
    document.getElementById('btnActionLoad').onclick = () => {
        closeModal('builderActionModal');
        loadQuiz(pendingSaveQuiz, savedId);
        pendingSaveQuiz = null;
    };
    
    actionModal.classList.remove('hidden');
};

// Handlers for Post-Export Actions (Static defaults)
document.getElementById('btnActionNew').onclick = () => {
    closeModal('builderActionModal');
    showCreator(); // Resets the UI
    pendingSaveQuiz = null;
};

document.getElementById('btnActionHome').onclick = () => {
    closeModal('builderActionModal');
    changeScreen('uploadScreen');
    pendingSaveQuiz = null;
};

function showModal(message, type = 'alert', callback = null) {
    const modal = document.getElementById('customModal');
    const msgEl = document.getElementById('modalMessage');
    const btnConfirm = document.getElementById('modalBtnConfirm');
    const btnCancel = document.getElementById('modalBtnCancel');
    if (!modal) return;
    msgEl.textContent = message;
    modalCallback = callback;
    if (type === 'confirm') {
        btnCancel.classList.remove('hidden');
        btnConfirm.textContent = 'CONFIRMAR';
    } else {
        btnCancel.classList.add('hidden');
        btnConfirm.textContent = 'OK';
    }
    modal.classList.remove('hidden');
}

function closeModal(modalId = 'customModal') {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
    if (modalId === 'customModal') modalCallback = null;
}

const btnMConfirm = document.getElementById('modalBtnConfirm');
if(btnMConfirm) btnMConfirm.onclick = () => { if (modalCallback) modalCallback(); closeModal(); };
const btnMCancel = document.getElementById('modalBtnCancel');
if(btnMCancel) btnMCancel.onclick = () => closeModal();