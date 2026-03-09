require('../setup/environment');
const { load } = require('../setup/loader');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

load('js/core/config.js');
load('js/core/storage-manager.js');
load('js/core/validator.js');

const QUIZ_A = {
    nomeSimulado: 'Quiz A',
    questoes: [{ id: 1, enunciado: 'Q1?', tipo: 'unica', alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }], respostasCorretas: ['a'] }]
};
const QUIZ_B = {
    nomeSimulado: 'Quiz B',
    questoes: [{ id: 2, enunciado: 'Q2?', tipo: 'unica', alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }], respostasCorretas: ['b'] }]
};
const QUIZ_A_CHANGED = { ...QUIZ_A, questoes: [{ id: 99, enunciado: 'Changed?', tipo: 'unica', alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }], respostasCorretas: ['a'] }] };

global.ModalManager = {
    _lastReport: null,
    alert: () => {},
    confirm: (msg, cb) => cb && cb(),
    custom(opts) { this._lastReport = opts; if (opts.onConfirm) opts.onConfirm(); }
};
global.ScreenManager = { loadQuizOptions: () => {}, change: () => {}, showLoading: () => {}, hideLoading: () => {} };
global.ToastSystem = { show: () => {} };
global.LibraryManager = { render: () => {} };

load('js/features/file-handler.js');

beforeEach(() => { localStorage.clear(); });

describe('FileHandler._findDuplicate()', () => {
    it('retorna null para simulado novo', () => {
        const result = FileHandler._findDuplicate(QUIZ_A);
        assert.equal(result, null);
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

describe('FileHandler._handleBatch()', () => {
    it('salva múltiplos simulados novos', async () => {
        const results = [
            { file: 'a.json', data: QUIZ_A, valid: true, errors: [] },
            { file: 'b.json', data: QUIZ_B, valid: true, errors: [] }
        ];
        await FileHandler._handleBatch(results);
        assert.equal(StorageManager.getLibrary().length, 2);
    });

    it('ignora silenciosamente duplicatas com conteúdo idêntico', async () => {
        StorageManager.addToLibrary(QUIZ_A);
        const results = [
            { file: 'a.json', data: QUIZ_A, valid: true, errors: [] }
        ];
        await FileHandler._handleBatch(results);
        assert.equal(StorageManager.getLibrary().length, 1);
        assert.equal(ModalManager._lastReport.body.includes('ignorado'), true);
    });

    it('registra conflito sem substituir automaticamente', async () => {
        StorageManager.addToLibrary(QUIZ_A);
        const results = [
            { file: 'a_changed.json', data: QUIZ_A_CHANGED, valid: true, errors: [] }
        ];
        await FileHandler._handleBatch(results);
        assert.equal(StorageManager.getLibrary().length, 1);
        assert.equal(ModalManager._lastReport.body.includes('conflito'), true);
    });

    it('registra arquivos inválidos no relatório', async () => {
        const results = [
            { file: 'bad.json', data: null, valid: false, errors: ['Erro de sintaxe.'] }
        ];
        await FileHandler._handleBatch(results);
        assert.equal(ModalManager._lastReport.body.includes('erro'), true);
    });
});
