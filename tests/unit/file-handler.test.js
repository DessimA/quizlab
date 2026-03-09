require('../setup/environment');
const { load } = require('../setup/loader');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

load('js/core/config.js');
load('js/core/storage-manager.js');
load('js/core/validator.js');

const QUIZ_A = {
    nomeSimulado: 'Quiz A',
    questoes: [{ id: 1, enunciado: 'Q1?', tipo: 'unica',
        alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
        respostasCorretas: ['a'] }]
};
const QUIZ_B = {
    nomeSimulado: 'Quiz B',
    questoes: [{ id: 2, enunciado: 'Q2?', tipo: 'unica',
        alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
        respostasCorretas: ['b'] }]
};
const QUIZ_A_CHANGED = {
    ...QUIZ_A,
    questoes: [{ id: 99, enunciado: 'Changed?', tipo: 'unica',
        alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
        respostasCorretas: ['a'] }]
};

let _screenChanges = [];
let _lastReport = null;
let _lastAlert = null;

global.ModalManager = {
    alert(msg) { _lastAlert = msg; },
    confirm: (msg, cb) => cb && cb(),
    custom(opts) {
        _lastReport = opts;
        if (opts.onConfirm) opts.onConfirm();
    }
};
global.ScreenManager = {
    loadQuizOptions: () => {},
    change(screen) { _screenChanges.push(screen); },
    showLoading: () => {},
    hideLoading: () => {}
};
global.ToastSystem = { show: () => {} };
global.LibraryManager = { render: () => {} };

load('js/features/file-handler.js');

beforeEach(() => {
    localStorage.clear();
    _screenChanges = [];
    _lastReport = null;
    _lastAlert = null;
});

describe('FileHandler._findDuplicate()', () => {
    it('retorna null para simulado novo', () => {
        assert.equal(FileHandler._findDuplicate(QUIZ_A), null);
    });

    it('detecta duplicata com mesmo conteúdo', () => {
        StorageManager.addToLibrary(QUIZ_A);
        const result = FileHandler._findDuplicate(QUIZ_A);
        assert.ok(result);
        assert.equal(result.sameContent, true);
    });

    it('detecta conflito com nome igual e conteúdo diferente', () => {
        StorageManager.addToLibrary(QUIZ_A);
        const result = FileHandler._findDuplicate(QUIZ_A_CHANGED);
        assert.ok(result);
        assert.equal(result.sameContent, false);
    });
});

describe('FileHandler._handleSingle()', () => {
    it('salva e abre opções para arquivo válido e novo', async () => {
        let optionsOpened = false;
        global.ScreenManager.loadQuizOptions = () => { optionsOpened = true; };
        await FileHandler._handleSingle({ file: 'a.json', data: QUIZ_A, valid: true, errors: [] });
        assert.ok(optionsOpened);
        assert.equal(StorageManager.getLibrary().length, 1);
        global.ScreenManager.loadQuizOptions = () => {};
    });

    it('exibe erros para arquivo inválido', async () => {
        await FileHandler._handleSingle({ file: 'bad.json', data: null, valid: false, errors: ['campo obrigatório'] });
        assert.ok(_lastAlert !== null);
        assert.equal(StorageManager.getLibrary().length, 0);
    });
});

describe('FileHandler._handleBatch()', () => {
    it('salva múltiplos simulados novos', async () => {
        const results = [
            { file: 'a.json', data: QUIZ_A, valid: true, errors: [] },
            { file: 'b.json', data: QUIZ_B, valid: true, errors: [] }
        ];
        await FileHandler._handleBatch(results);
        assert.equal(StorageManager.getLibrary().length, 2);
    });

    it('ignora duplicatas com conteúdo idêntico e reporta como skipped', async () => {
        StorageManager.addToLibrary(QUIZ_A);
        await FileHandler._handleBatch([
            { file: 'a.json', data: QUIZ_A, valid: true, errors: [] }
        ]);
        assert.equal(StorageManager.getLibrary().length, 1);
        assert.ok(_lastReport.body.includes('ignorado'));
    });

    it('registra conflito sem substituir automaticamente', async () => {
        StorageManager.addToLibrary(QUIZ_A);
        await FileHandler._handleBatch([
            { file: 'a_changed.json', data: QUIZ_A_CHANGED, valid: true, errors: [] }
        ]);
        assert.equal(StorageManager.getLibrary().length, 1);
        assert.ok(_lastReport.body.includes('conflito'));
    });

    it('registra arquivos inválidos no relatório', async () => {
        await FileHandler._handleBatch([
            { file: 'bad.json', data: null, valid: false, errors: ['Erro de sintaxe.'] }
        ]);
        assert.ok(_lastReport.body.includes('erro'));
    });

    it('registra como failed quando canStore retorna false', async () => {
        const threshold = CONFIG.LIMITS.STORAGE_SAFE_QUOTA_BYTES * CONFIG.LIMITS.STORAGE_BLOCK_THRESHOLD;
        localStorage.setItem('__fill__', 'x'.repeat(threshold));

        await FileHandler._handleBatch([
            { file: 'a.json', data: QUIZ_A, valid: true, errors: [] }
        ]);

        assert.equal(StorageManager.getLibrary().length, 0);
        assert.ok(_lastReport.body.includes('erro'));

        localStorage.removeItem('__fill__');
    });

    it('redireciona para biblioteca quando ao menos 1 foi salvo', async () => {
        await FileHandler._handleBatch([
            { file: 'a.json', data: QUIZ_A, valid: true, errors: [] },
            { file: 'bad.json', data: null, valid: false, errors: ['inválido'] }
        ]);
        assert.ok(_screenChanges.includes(CONFIG.ELEMENTS.LIBRARY_SCREEN));
    });

    it('não redireciona para biblioteca quando nenhum foi salvo', async () => {
        await FileHandler._handleBatch([
            { file: 'bad.json', data: null, valid: false, errors: ['inválido'] }
        ]);
        assert.ok(!_screenChanges.includes(CONFIG.ELEMENTS.LIBRARY_SCREEN));
    });
});

describe('FileHandler.handleMultiple()', () => {
    it('exibe alerta quando nenhum arquivo é .json', () => {
        FileHandler.handleMultiple([{ name: 'arquivo.txt' }]);
        assert.ok(_lastAlert !== null);
    });

    it('filtra arquivos que não são .json e processa apenas os válidos', async () => {
        assert.doesNotThrow(() => {
            FileHandler.handleMultiple([{ name: 'arquivo.txt' }, { name: 'valido.json' }]);
        });
    });
});
