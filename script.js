let quizData = null;
let currentQuestion = 0;
let userAnswers = [];
let questionAnswered = [];
let correctAnswersCount = 0;
let incorrectAnswersCount = 0;
let builderQuestionCount = 0;
let modalCallback = null;
let pendingSaveQuiz = null;

const STORAGE_KEY = 'quizlab_library';
const MAX_SLOTS = 10;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

const Icons = {
    check: `<svg class="icon-svg" viewBox="0 0 24 24" style="color:var(--success); filter:drop-shadow(0 0 5px var(--success))"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    cross: `<svg class="icon-svg" viewBox="0 0 24 24" style="color:var(--error); filter:drop-shadow(0 0 5px var(--error))"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    trash: `<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    checkStatic: `<svg class="icon-svg" viewBox="0 0 24 24" style="color:var(--success)"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    crossStatic: `<svg class="icon-svg" viewBox="0 0 24 24" style="color:var(--error)"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    chevronDown: `<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    chevronUp: `<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>`,
    plus: `<svg class="icon-svg" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    play: `<svg class="icon-svg" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    download: `<svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`
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
    if (exists && !force) return true;
    if (lib.length >= MAX_SLOTS && !force) {
        pendingSaveQuiz = quiz;
        const oldest = lib.sort((a, b) => a.meta.addedAt - b.meta.addedAt)[0];
        showLimitModal(oldest);
        return false;
    }
    const newItem = { id: `quiz_${Date.now()}`, data: quiz, meta: { addedAt: Date.now(), questionsCount: quiz.questoes.length } };
    lib.push(newItem);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
    return true;
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
    if(!list) return;
    const lib = getLibrary();
    lib.sort((a, b) => b.meta.addedAt - a.meta.addedAt);
    counter.textContent = `${lib.length}/${MAX_SLOTS} SALVOS`;
    list.innerHTML = '';
    if (lib.length === 0) emptyMsg.classList.remove('hidden');
    else {
        emptyMsg.classList.add('hidden');
        lib.forEach(item => {
            const date = new Date(item.meta.addedAt).toLocaleDateString();
            const div = document.createElement('div');
            div.className = 'library-card';
            div.innerHTML = `<div class="lib-card-header"><span class="lib-title">${item.data.nomeSimulado}</span><span class="lib-date">${date}</span></div><div class="lib-meta">${item.meta.questionsCount} Questões<br>${item.data.descricao ? item.data.descricao.substring(0, 50) + '...' : 'Sem descrição'}</div><div class="lib-actions"><button class="btn btn-primary" onclick="loadFromLibrary('${item.id}')">${Icons.play} Iniciar</button><button class="btn btn-outline" onclick="downloadLibraryItem('${item.id}')">${Icons.download}</button><button class="btn btn-ghost" style="color:var(--error)" onclick="deleteLibraryItem('${item.id}')">${Icons.trash}</button></div>`;
            list.appendChild(div);
        });
    }
}

function loadFromLibrary(id) {
    const lib = getLibrary();
    const item = lib.find(i => i.id === id);
    if(item) loadQuiz(item.data, false);
}

function deleteLibraryItem(id) { showModal("Excluir este simulado?", 'confirm', () => removeFromLibrary(id)); }
function downloadLibraryItem(id) { const lib = getLibrary(); const item = lib.find(i => i.id === id); if (item) downloadJSON(item.data, item.data.nomeSimulado); }
function showLibrary() { renderLibrary(); changeScreen('libraryScreen'); }
function hideLibrary() { changeScreen('uploadScreen'); }

function showLimitModal(oldestItem) {
    const modal = document.getElementById('limitModal');
    document.getElementById('limitOldestTitle').textContent = oldestItem.data.nomeSimulado;
    document.getElementById('limitOldestDate').textContent = `Adicionado em: ${new Date(oldestItem.meta.addedAt).toLocaleDateString()}`;
    document.getElementById('limitBtnExport').onclick = () => { downloadJSON(oldestItem.data, oldestItem.data.nomeSimulado); removeFromLibrary(oldestItem.id); completePendingSave(); };
    document.getElementById('limitBtnReplace').onclick = () => { removeFromLibrary(oldestItem.id); completePendingSave(); };
    document.getElementById('limitBtnCancel').onclick = () => { modal.classList.add('hidden'); loadQuiz(pendingSaveQuiz, false); pendingSaveQuiz = null; };
    modal.classList.remove('hidden');
}

function completePendingSave() { document.getElementById('limitModal').classList.add('hidden'); saveToLibrary(pendingSaveQuiz, true); loadQuiz(pendingSaveQuiz, false); pendingSaveQuiz = null; }

function changeScreen(showId) {
    const screens = ['landingPage', 'uploadScreen', 'creatorScreen', 'quizScreen', 'resultScreen', 'libraryScreen'];
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

function enterApp() { changeScreen('uploadScreen'); }

function showCreator() {
    changeScreen('creatorScreen');
    const bTitle = document.getElementById('builderTitle');
    const bDesc = document.getElementById('builderDesc');
    const bMeta = document.getElementById('builderMetaSection');
    const bQuestCont = document.getElementById('builderQuestionsContainer');
    const bQuestList = document.getElementById('builderQuestionsList');
    if(bTitle) bTitle.value = '';
    if(bDesc) bDesc.value = '';
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

function handleFile(file) {
    if (!file || !file.name.endsWith('.json')) { showModal('Selecione um arquivo .json válido.', 'alert'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        try { const data = JSON.parse(e.target.result); askToSave(data); }
        catch (err) { showModal('Erro ao ler o arquivo. Verifique o JSON.', 'alert'); }
    };
    reader.readAsText(file);
}

function askToSave(data) {
    const lib = getLibrary();
    const exists = lib.find(item => item.data.nomeSimulado === data.nomeSimulado);
    if (exists) loadQuiz(data, false);
    else {
        showModal(`Salvar "${data.nomeSimulado}" na biblioteca? (${lib.length}/${MAX_SLOTS})`, 'confirm', () => {
            const saved = saveToLibrary(data);
            if (saved) loadQuiz(data, false);
        });
        const btnCancel = document.getElementById('modalBtnCancel');
        const oldOnClick = btnCancel.onclick;
        btnCancel.onclick = () => { loadQuiz(data, false); btnCancel.onclick = oldOnClick; closeModal(); };
    }
}

function loadQuiz(data, saveCheck = false) {
    quizData = data;
    userAnswers = new Array(data.questoes.length).fill(null);
    questionAnswered = new Array(data.questoes.length).fill(false);
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
    updateNav();
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
    const conf = document.getElementById('confirmBtn');
    const next = document.getElementById('nextBtn');
    const fin = document.getElementById('finishBtn');
    if(prev) prev.disabled = currentQuestion === 0;
    if(conf) conf.classList.toggle('hidden', isAnswered || !canConfirm);
    if(next) next.classList.toggle('hidden', !isAnswered || isLast);
    if(fin) fin.classList.toggle('hidden', !isAnswered || !isLast);
}

function previousQuestion() { if (currentQuestion > 0) { currentQuestion--; renderQuestion(); } }
function nextQuestion() { if (currentQuestion < quizData.questoes.length - 1) { currentQuestion++; renderQuestion(); } }

function finishQuiz() {
    changeScreen('resultScreen');
    const total = quizData.questoes.length;
    const percent = Math.round((correctAnswersCount / total) * 100);
    setElementText('resultScore', `${correctAnswersCount}/${total}`);
    setElementText('resultPercentage', `${percent}%`);
    const rev = document.getElementById('reviewContainer');
    if(!rev) return;
    let html = '';
    quizData.questoes.forEach((q, i) => {
        const ok = check(i);
        html += `<div class="review-card ${ok ? 'correct' : 'incorrect'}"><div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.75rem; font-family:var(--font-mono)"><span>QUESTÃO ${i+1}</span><span style="color:${ok?'var(--success)':'var(--error)'}">${ok ? 'ACERTO' : 'X'}</span></div><div style="font-weight:600">${q.enunciado}</div></div>`;
    });
    rev.innerHTML = html;
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
    if(meta) meta.classList.add('completed', 'collapsed');
    if(container) container.classList.remove('hidden');
    if(list && list.children.length === 0) addBuilderQuestion();
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
    div.innerHTML = `<div class="builder-header" onclick="toggleCollapse('${qId}')"><div class="builder-title-wrapper"><div class="status-icon">${Icons.checkStatic}</div><span style="font-weight:700; font-size:0.85rem; font-family:var(--font-mono)">Q.${builderQuestionCount.toString().padStart(2, '0')}</span></div><div style="display:flex; gap:4px"><button class="btn btn-ghost" onclick="event.stopPropagation(); this.closest('.builder-card').remove()">${Icons.trash}</button><div style="padding:10px">${Icons.chevronDown}</div></div></div><div class="builder-card-body"><div class="input-group"><label class="input-label">Enunciado</label><input type="text" class="input-field q-enunciado" oninput="validateBuilderGlobal()"></div><div class="input-group"><label class="input-label">Tipo</label><select class="input-field q-type" onchange="validateBuilderGlobal()"><option value="unica">Única Escolha</option><option value="multipla">Múltipla Escolha</option></select></div><div class="input-group"><label class="input-label">Alternativas</label><div class="alternatives-container"></div><button class="btn btn-outline" style="margin-top:8px" onclick="addBuilderAlternative('${qId}')">${Icons.plus}</button></div></div>`;
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
    div.innerHTML = `<input type="checkbox" class="alt-check" style="width:18px;height:18px" onchange="validateBuilderGlobal()"><input type="text" class="input-field alt-text" oninput="validateBuilderGlobal()"><button class="btn btn-ghost" onclick="removeBuilderAlternative('${altId}')">${Icons.trash}</button>`;
    container.appendChild(div);
    validateBuilderGlobal();
}

function removeBuilderAlternative(id) { document.getElementById(id)?.remove(); validateBuilderGlobal(); }

function validateQuestionCard(card) {
    const enunci = card.querySelector('.q-enunciado').value.trim();
    if (!enunci) { showModal("Enunciado vazio.", 'alert'); return false; }
    const alts = card.querySelectorAll('.alt-text');
    let hasAltText = true;
    alts.forEach(a => { if (!a.value.trim()) hasAltText = false; });
    if (!hasAltText) { showModal("Preencha todas as alternativas.", 'alert'); return false; }
    const type = card.querySelector('.q-type').value;
    const checks = card.querySelectorAll('.alt-check:checked');
    if (type === 'unica') { if (checks.length !== 1) { showModal("Escolha única requer 1 resposta correta.", 'alert'); return false; } }
    else { if (checks.length < 2) { showModal("Múltipla escolha requer pelo menos 2 respostas corretas.", 'alert'); return false; } }
    return true;
}

function validateBuilderGlobal() {
    const list = document.getElementById('builderQuestionsList');
    const lastQ = list ? list.lastElementChild : null;
    const btnAdd = document.getElementById('btnAddQuestion');
    const btnExport = document.getElementById('btnExport');
    if (!lastQ || !btnAdd || !btnExport) return;
    const enunci = lastQ.querySelector('.q-enunciado').value.trim();
    const type = lastQ.querySelector('.q-type').value;
    const checks = lastQ.querySelectorAll('.alt-check:checked');
    const alts = lastQ.querySelectorAll('.alt-text');
    let allAltsFilled = true;
    alts.forEach(a => { if (!a.value.trim()) allAltsFilled = false; });
    let isValid = enunci.length > 0 && allAltsFilled;
    if (type === 'unica') { if (checks.length !== 1) isValid = false; }
    else { if (checks.length < 2) isValid = false; }
    btnAdd.disabled = !isValid;
    btnExport.disabled = !isValid;
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".json"; a.click();
}

function exportBuilderJson() {
    const questions = [];
    const qCards = document.querySelectorAll('#builderQuestionsList .builder-card');
    for (let i = 0; i < qCards.length; i++) { if (!validateQuestionCard(qCards[i])) return; }
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
    const quiz = { nomeSimulado: title, descricao: desc, questoes: questions };
    
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
    if (shouldSave) {
        saveToLibrary(pendingSaveQuiz);
    }
    
    // 3. Close Options and Open Action Modal
    closeModal('exportOptionsModal');
    document.getElementById('builderActionModal').classList.remove('hidden');
};

// Handlers for Post-Export Actions
document.getElementById('btnActionLoad').onclick = () => {
    closeModal('builderActionModal');
    loadQuiz(pendingSaveQuiz, false);
    pendingSaveQuiz = null;
};

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