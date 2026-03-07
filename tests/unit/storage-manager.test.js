require('../setup/environment');
const { load } = require('../setup/loader');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

load('js/core/config.js');
load('js/core/storage-manager.js');

const SAMPLE_QUIZ = {
    nomeSimulado: 'Quiz de Teste',
    descricao: 'Descrição',
    questoes: [
        {
            id: 1, enunciado: 'Q1', tipo: 'unica',
            alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
            respostasCorretas: ['a']
        }
    ]
};

beforeEach(() => {
    localStorage.clear();
});

describe('StorageManager — get() e set()', () => {
    it('salva e recupera um valor corretamente', () => {
        StorageManager.set('test_key', { valor: 42 });
        assert.deepEqual(StorageManager.get('test_key'), { valor: 42 });
    });

    it('retorna defaultValue para chave inexistente', () => {
        assert.equal(StorageManager.get('nao_existe', 'fallback'), 'fallback');
    });

    it('retorna null por padrão para chave inexistente', () => {
        assert.equal(StorageManager.get('nao_existe'), null);
    });
});

describe('StorageManager — biblioteca (CRUD)', () => {
    it('getLibrary() retorna array vazio quando não há dados', () => {
        assert.deepEqual(StorageManager.getLibrary(), []);
    });

    it('addToLibrary() adiciona item com metadados corretos', () => {
        const result = StorageManager.addToLibrary(SAMPLE_QUIZ);
        assert.equal(result.success, true);
        assert.ok(result.id.startsWith('quiz_'));

        const library = StorageManager.getLibrary();
        assert.equal(library.length, 1);
        assert.equal(library[0].data.nomeSimulado, 'Quiz de Teste');
        assert.equal(library[0].meta.questionsCount, 1);
        assert.equal(library[0].meta.timesPlayed, 0);
        assert.equal(library[0].meta.averageScore, 0);
        assert.equal(library[0].meta.lastPlayed, null);
    });

    it('removeFromLibrary() remove o item correto', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        StorageManager.removeFromLibrary(id);
        assert.equal(StorageManager.getLibrary().length, 0);
    });

    it('removeFromLibrary() não afeta outros itens', () => {
        StorageManager.addToLibrary(SAMPLE_QUIZ);
        const { id } = StorageManager.addToLibrary({ ...SAMPLE_QUIZ, nomeSimulado: 'Quiz 2' });
        StorageManager.removeFromLibrary(id);
        assert.equal(StorageManager.getLibrary().length, 1);
        assert.equal(StorageManager.getLibrary()[0].data.nomeSimulado, 'Quiz de Teste');
    });

    it('updateLibraryMeta() atualiza apenas os campos fornecidos', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        StorageManager.updateLibraryMeta(id, { timesPlayed: 5, averageScore: 80 });

        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.equal(item.meta.timesPlayed, 5);
        assert.equal(item.meta.averageScore, 80);
        assert.equal(item.meta.questionsCount, 1);
    });

    it('updateLibraryMeta() retorna false para ID inexistente', () => {
        const result = StorageManager.updateLibraryMeta('id_invalido', { timesPlayed: 1 });
        assert.equal(result, false);
    });
});

describe('StorageManager — addToLibrary() com limite', () => {
    it('retorna LIMIT_REACHED quando a biblioteca está cheia', () => {
        for (let i = 0; i < CONFIG.LIMITS.MAX_LIBRARY_SLOTS; i++) {
            StorageManager.addToLibrary({ ...SAMPLE_QUIZ, nomeSimulado: `Quiz ${i}` });
        }
        const result = StorageManager.addToLibrary(SAMPLE_QUIZ);
        assert.equal(result.success, false);
        assert.equal(result.reason, 'LIMIT_REACHED');
    });

    it('addToLibrary() inicializa history como array vazio', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.deepEqual(item.meta.history, []);
    });
});

describe('StorageManager — replaceInLibrary()', () => {
    it('substitui o conteúdo mantendo o mesmo id', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        const updated = { ...SAMPLE_QUIZ, nomeSimulado: 'Quiz Atualizado' };
        const result = StorageManager.replaceInLibrary(id, updated);
        assert.equal(result, true);
        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.equal(item.data.nomeSimulado, 'Quiz Atualizado');
    });

    it('atualiza questionsCount nos metadados após substituição', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        const withMore = {
            ...SAMPLE_QUIZ,
            questoes: [
                ...SAMPLE_QUIZ.questoes,
                { id: 2, enunciado: 'Q2', tipo: 'unica', alternativas: [{ id: 'a', texto: 'A' }], respostasCorretas: ['a'] }
            ]
        };
        StorageManager.replaceInLibrary(id, withMore);
        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.equal(item.meta.questionsCount, 2);
    });

    it('retorna false para id inexistente', () => {
        assert.equal(StorageManager.replaceInLibrary('id_inexistente', SAMPLE_QUIZ), false);
    });
});

describe('StorageManager — updateQuizStats()', () => {
    it('registra a primeira tentativa corretamente', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        StorageManager.updateQuizStats(id, { percent: 80, correct: 4, total: 5 });

        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.equal(item.meta.timesPlayed, 1);
        assert.equal(item.meta.averageScore, 80);
        assert.equal(item.meta.history.length, 1);
        assert.equal(item.meta.history[0].score, 80);
        assert.ok(item.meta.lastPlayed !== null);
    });

    it('calcula a média corretamente após múltiplas tentativas', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        StorageManager.updateQuizStats(id, { percent: 60, correct: 3, total: 5 });
        StorageManager.updateQuizStats(id, { percent: 100, correct: 5, total: 5 });

        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.equal(item.meta.timesPlayed, 2);
        assert.equal(item.meta.averageScore, 80);
        assert.equal(item.meta.history.length, 2);
    });

    it('limita o histórico a MAX_HISTORY_ENTRIES entradas', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        for (let i = 0; i < CONFIG.LIMITS.MAX_HISTORY_ENTRIES + 5; i++) {
            StorageManager.updateQuizStats(id, { percent: 50, correct: 1, total: 2 });
        }
        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.equal(item.meta.history.length, CONFIG.LIMITS.MAX_HISTORY_ENTRIES);
    });

    it('retorna false para id inexistente', () => {
        assert.equal(StorageManager.updateQuizStats('id_invalido', { percent: 50 }), false);
    });
});

describe('StorageManager — sessão (session)', () => {
    it('getSession() retorna null quando não há sessão', () => {
        assert.equal(StorageManager.getSession(), null);
    });

    it('saveSession() e getSession() funcionam corretamente', () => {
        const session = { quizData: SAMPLE_QUIZ, currentQuestion: 2, savedAt: Date.now() };
        StorageManager.saveSession(session);
        const result = StorageManager.getSession();
        assert.equal(result.currentQuestion, 2);
    });

    it('clearSession() remove a sessão', () => {
        StorageManager.saveSession({ quizData: SAMPLE_QUIZ });
        StorageManager.clearSession();
        assert.equal(StorageManager.getSession(), null);
    });
});

describe('StorageManager — rascunho (draft)', () => {
    it('getDraft() retorna null quando não há rascunho', () => {
        assert.equal(StorageManager.getDraft(), null);
    });

    it('saveDraft() e getDraft() funcionam corretamente', () => {
        const draft = { title: 'Meu Quiz', desc: 'Descrição', timestamp: Date.now() };
        StorageManager.saveDraft(draft);
        assert.deepEqual(StorageManager.getDraft(), draft);
    });

    it('clearDraft() remove o rascunho', () => {
        StorageManager.saveDraft({ title: 'x' });
        StorageManager.clearDraft();
        assert.equal(StorageManager.getDraft(), null);
    });
});

describe('StorageManager — primeira visita', () => {
    it('isFirstVisit() retorna true quando não há registro', () => {
        assert.equal(StorageManager.isFirstVisit(), true);
    });

    it('markFirstVisit() faz isFirstVisit() retornar false', () => {
        StorageManager.markFirstVisit();
        assert.equal(StorageManager.isFirstVisit(), false);
    });
});
