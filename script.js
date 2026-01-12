let quizData = null;
let currentQuestion = 0;
let userAnswers = [];
let questionAnswered = [];
let correctAnswersCount = 0;
let incorrectAnswersCount = 0;
let builderQuestionCount = 0;
let modalCallback = null;

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
    plus: `<svg class="icon-svg" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`
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
            header.classList.toggle('header-hidden');
            e.preventDefault();
        }
        lastTap = currentTime;
    });
}

function changeScreen(showId) {
    const screens = ['landingPage', 'uploadScreen', 'creatorScreen', 'quizScreen', 'resultScreen'];
    const appContainer = document.getElementById('appContainer');
    if (!appContainer) return;
    if (showId === 'landingPage') {
        appContainer.classList.add('hidden');
        document.getElementById('landingPage').style.display = 'block';
    } else {
        const lp = document.getElementById('landingPage');
        if (lp) lp.style.display = 'none';
        appContainer.classList.remove('hidden');
        if (!appContainer.classList.contains('fade-in')) appContainer.classList.add('fade-in');
        screens.forEach(id => {
            const el = document.getElementById(id);
            if (el && id !== 'landingPage') {
                if (id === showId) el.classList.remove('hidden');
                else el.classList.add('hidden');
            }
        });
    }
}

function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function goHome() {
    const isQuizActive = quizData !== null;
    const creatorScreen = document.getElementById('creatorScreen');
    const isCreatorActive = creatorScreen && !creatorScreen.classList.contains('hidden');
    const navigate = () => window.location.href = 'index.html';
    if (isQuizActive || isCreatorActive) {
        showModal(
            "Você tem certeza que deseja voltar ao início? Todo o seu progresso atual será perdido permanentemente.", 
            'confirm', 
            navigate
        );
    } else {
        navigate();
    }
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
    uploadArea.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-outline')) fileInput.click();
    });
    const btnSelect = document.getElementById('btnSelectFile');
    if (btnSelect) {
        btnSelect.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });
    }
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('dragover'); });
    uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
}

if (fileInput) fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

function handleFile(file) {
    if (!file || !file.name.endsWith('.json')) { showModal('Por favor, selecione um arquivo .json válido.', 'alert'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            loadQuiz(data);
        } catch (err) { showModal('Erro ao ler o arquivo. Verifique a formatação do JSON.', 'alert'); }
    };
    reader.readAsText(file);
}

function loadQuiz(data) {
    quizData = data;
    userAnswers = new Array(data.questoes.length).fill(null);
    questionAnswered = new Array(data.questoes.length).fill(false);
    setTimeout(startQuiz, 800);
}

function startQuiz() {
    changeScreen('quizScreen');
    if (quizData.nomeSimulado) {
        setElementText('headerSubtitle', quizData.nomeSimulado);
        setElementText('quizTitle', quizData.nomeSimulado);
    }
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
    container.appendChild(textDiv);
    q.alternativas.forEach(alt => {
        const checked = userAnswers[currentQuestion] && (Array.isArray(userAnswers[currentQuestion]) ? userAnswers[currentQuestion].includes(alt.id) : userAnswers[currentQuestion] === alt.id);
        const isCorrect = q.respostasCorretas.includes(alt.id);
        let cls = 'alternative';
        if (answered) {
            cls += ' disabled';
            if (isCorrect) cls += ' correct';
            else if (checked) cls += ' incorrect';
        } else if (checked) {
            cls += ' selected';
        }
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
                showModal(`Limite de ${q.respostasCorretas.length} opções atingido.`, 'alert');
                return;
            }
            userAnswers[currentQuestion].push(id);
        }
    }
    renderQuestion();
}

function confirmAnswer() {
    questionAnswered[currentQuestion] = true;
    if (check(currentQuestion)) correctAnswersCount++;
    else incorrectAnswersCount++;
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
    const hasSelection = userAnswers[currentQuestion] && (Array.isArray(userAnswers[currentQuestion]) ? userAnswers[currentQuestion].length > 0 : !!userAnswers[currentQuestion]);
    const prev = document.getElementById('prevBtn');
    const conf = document.getElementById('confirmBtn');
    const next = document.getElementById('nextBtn');
    const fin = document.getElementById('finishBtn');
    if(prev) prev.disabled = currentQuestion === 0;
    if(conf) conf.classList.toggle('hidden', isAnswered || !hasSelection);
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

function resetQuiz() { location.reload(); }

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
    if (lastQ && !lastQ.classList.contains('collapsed')) {
        if (!validateQuestionCard(lastQ)) return;
        lastQ.classList.add('collapsed', 'completed');
    }
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

function removeBuilderAlternative(id) {
    document.getElementById(id)?.remove();
    validateBuilderGlobal();
}

function validateQuestionCard(card) {
    const enunci = card.querySelector('.q-enunciado').value.trim();
    if (!enunci) { showModal("O enunciado da questão está vazio.", 'alert'); return false; }
    const alts = card.querySelectorAll('.alt-text');
    let hasAltText = true;
    alts.forEach(a => { if (!a.value.trim()) hasAltText = false; });
    if (!hasAltText) { showModal("Todas as alternativas devem ter texto.", 'alert'); return false; }
    const type = card.querySelector('.q-type').value;
    const checks = card.querySelectorAll('.alt-check:checked');
    if (type === 'unica') {
        if (checks.length !== 1) { showModal("Questões de escolha única devem ter exatamente 1 alternativa correta.", 'alert'); return false; }
    } else {
        if (checks.length < 2) { showModal("Questões de múltipla escolha devem ter pelo menos 2 alternativas corretas.", 'alert'); return false; }
    }
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
    if (type === 'unica') {
        if (checks.length !== 1) isValid = false;
    } else {
        if (checks.length < 2) isValid = false;
    }
    btnAdd.disabled = !isValid;
    btnExport.disabled = !isValid;
}

function exportBuilderJson() {
    const questions = [];
    const qCards = document.querySelectorAll('#builderQuestionsList .builder-card');
    for (let i = 0; i < qCards.length; i++) {
        if (!validateQuestionCard(qCards[i])) return;
    }
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
    const titleEl = document.getElementById('builderTitle');
    const descEl = document.getElementById('builderDesc');
    const blob = new Blob([JSON.stringify({ nomeSimulado: titleEl ? titleEl.value : 'Simulado', descricao: descEl ? descEl.value : '', questoes: questions }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'simulado.json'; a.click();
}

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

function closeModal() {
    const modal = document.getElementById('customModal');
    if (modal) modal.classList.add('hidden');
    modalCallback = null;
}

const btnMConfirm = document.getElementById('modalBtnConfirm');
if(btnMConfirm) btnMConfirm.onclick = () => { if (modalCallback) modalCallback(); closeModal(); };
const btnMCancel = document.getElementById('modalBtnCancel');
if(btnMCancel) btnMCancel.onclick = closeModal;