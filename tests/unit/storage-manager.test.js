require('../setup/environment');
const { load } = require('../setup/loader');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

load('js/core/config.js');
load('js/core/storage-manager.js');

const SAMPLE_QUIZ = {
    nomeSimulado: 'Quiz Teste',
    questoes: [{ id: 1, enunciado: 'Q1', tipo: 'unica',
        alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
        respostasCorretas: ['a'] }]
};

beforeEach(() => { localStorage.clear(); });

describe('StorageManager — getLibrary() e saveLibrary()', () => {
    it('retorna array vazio inicialmente', () => {
        assert.deepEqual(StorageManager.getLibrary(), []);
    });

    it('salva e recupera biblioteca', () => {
        const lib = [{ id: '1', data: SAMPLE_QUIZ }];
        StorageManager.saveLibrary(lib);
        assert.deepEqual(StorageManager.getLibrary(), lib);
    });
});

describe('StorageManager — addToLibrary()', () => {
    it('adiciona item com metadados corretos', () => {
        const result = StorageManager.addToLibrary(SAMPLE_QUIZ);
        assert.ok(result.success);
        assert.ok(result.id.startsWith('quiz_'));

        const library = StorageManager.getLibrary();
        assert.equal(library.length, 1);
        assert.equal(library[0].data.nomeSimulado, 'Quiz Teste');
        assert.ok(library[0].meta.addedAt);
        assert.equal(library[0].meta.timesPlayed, 0);
        assert.deepEqual(library[0].meta.history, []);
    });
});

describe('StorageManager — removeFromLibrary()', () => {
    it('remove item pelo ID', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        StorageManager.removeFromLibrary(id);
        assert.equal(StorageManager.getLibrary().length, 0);
    });

    it('limpa sessão se o item removido for o ativo', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        StorageManager.saveSession({ libraryId: id });
        StorageManager.removeFromLibrary(id);
        assert.equal(StorageManager.getSession(), null);
    });

    it('não afeta outros itens', () => {
        StorageManager.addToLibrary(SAMPLE_QUIZ);
        const { id } = StorageManager.addToLibrary({ ...SAMPLE_QUIZ, nomeSimulado: 'Quiz 2' });
        StorageManager.removeFromLibrary(id);
        assert.equal(StorageManager.getLibrary().length, 1);
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

    it('atualiza questionsCount nos metadados', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        const withMore = {
            ...SAMPLE_QUIZ,
            questoes: [
                ...SAMPLE_QUIZ.questoes,
                { id: 2, enunciado: 'Q2', tipo: 'unica',
                  alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
                  respostasCorretas: ['a'] }
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

describe('StorageManager — updateLibraryMeta()', () => {
    it('atualiza apenas os campos fornecidos', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        StorageManager.updateLibraryMeta(id, { timesPlayed: 5, averageScore: 80 });
        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.equal(item.meta.timesPlayed, 5);
        assert.equal(item.meta.averageScore, 80);
        assert.equal(item.meta.questionsCount, 1);
    });

    it('retorna false para ID inexistente', () => {
        assert.equal(StorageManager.updateLibraryMeta('id_invalido', { timesPlayed: 1 }), false);
    });
});

describe('StorageManager — removeManyFromLibrary()', () => {
    it('remove múltiplos itens de uma só vez', () => {
        const { id: id1 } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        const { id: id2 } = StorageManager.addToLibrary({ ...SAMPLE_QUIZ, nomeSimulado: 'Quiz 2' });
        const { id: id3 } = StorageManager.addToLibrary({ ...SAMPLE_QUIZ, nomeSimulado: 'Quiz 3' });

        StorageManager.removeManyFromLibrary([id1, id3]);

        const library = StorageManager.getLibrary();
        assert.equal(library.length, 1);
        assert.equal(library[0].id, id2);
    });

    it('não afeta itens fora da lista', () => {
        const { id: id1 } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        StorageManager.addToLibrary({ ...SAMPLE_QUIZ, nomeSimulado: 'Quiz 2' });
        StorageManager.removeManyFromLibrary([id1]);
        assert.equal(StorageManager.getLibrary().length, 1);
    });

    it('limpa a sessão se o quiz ativo estiver na lista', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        StorageManager.saveSession({ libraryId: id, currentQuestion: 0 });
        StorageManager.removeManyFromLibrary([id]);
        assert.equal(StorageManager.getSession(), null);
    });

    it('não limpa a sessão se o quiz ativo não estiver na lista', () => {
        const { id: id1 } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        const { id: id2 } = StorageManager.addToLibrary({ ...SAMPLE_QUIZ, nomeSimulado: 'Quiz 2' });
        StorageManager.saveSession({ libraryId: id1, currentQuestion: 0 });
        StorageManager.removeManyFromLibrary([id2]);
        assert.ok(StorageManager.getSession() !== null);
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
        assert.ok(item.meta.lastPlayed !== null);
    });

    it('calcula média corretamente após múltiplas tentativas', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        StorageManager.updateQuizStats(id, { percent: 60, correct: 3, total: 5 });
        StorageManager.updateQuizStats(id, { percent: 100, correct: 5, total: 5 });
        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.equal(item.meta.timesPlayed, 2);
        assert.equal(item.meta.averageScore, 80);
    });

    it('limita o histórico a MAX_HISTORY_ENTRIES entradas', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        for (let i = 0; i < CONFIG.LIMITS.MAX_HISTORY_ENTRIES + 3; i++) {
            StorageManager.updateQuizStats(id, { percent: 50, correct: 1, total: 2 });
        }
        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.equal(item.meta.history.length, CONFIG.LIMITS.MAX_HISTORY_ENTRIES);
    });
});

describe('StorageManager — getStorageStats()', () => {
    it('retorna estrutura válida com quota fixa de 4 MB', () => {
        const stats = StorageManager.getStorageStats();
        assert.ok(typeof stats.usage === 'number');
        assert.equal(stats.quota, CONFIG.LIMITS.STORAGE_SAFE_QUOTA_BYTES);
        assert.ok(typeof stats.percent === 'number');
    });

    it('percent aumenta após adicionar item à biblioteca', () => {
        const before = StorageManager.getStorageStats().usage;
        StorageManager.addToLibrary(SAMPLE_QUIZ);
        const after = StorageManager.getStorageStats().usage;
        assert.ok(after > before);
    });

    it('mede todos os itens do localStorage, não apenas a biblioteca', () => {
        StorageManager.set('chave_extra', { payload: 'x'.repeat(1000) });
        const stats = StorageManager.getStorageStats();
        assert.ok(stats.usage > 0);
    });
});

describe('StorageManager — canStore()', () => {
    it('permite armazenar quando uso está abaixo do threshold', () => {
        const result = StorageManager.canStore(SAMPLE_QUIZ);
        assert.equal(result.allowed, true);
    });

    it('bloqueia quando uso projetado excede STORAGE_BLOCK_THRESHOLD', () => {
        const bigQuiz = {
            ...SAMPLE_QUIZ,
            questoes: Array.from({ length: 1 }, (_, i) => ({
                id: i, enunciado: 'x'.repeat(500), tipo: 'unica',
                alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
                respostasCorretas: ['a']
            }))
        };

        const threshold = CONFIG.LIMITS.STORAGE_SAFE_QUOTA_BYTES * CONFIG.LIMITS.STORAGE_BLOCK_THRESHOLD;
        const fakeEntry = 'x'.repeat(threshold);
        localStorage.setItem('__fill__', fakeEntry);

        const result = StorageManager.canStore(bigQuiz);
        assert.equal(result.allowed, false);
        assert.equal(result.reason, 'QUOTA_EXCEEDED');

        localStorage.removeItem('__fill__');
    });
});

describe('StorageManager — saveWrongQuestions() e getAggregatedWrong()', () => {
    it('persiste wrongQuestions via updateLibraryMeta', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        const list = [{ sourceQuizId: id, sourceQuizName: 'X', questao: { id: 1 }, errorCount: 1 }];
        StorageManager.saveWrongQuestions(id, list);
        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.equal(item.meta.wrongQuestions.length, 1);
    });

    it('getAggregatedWrong retorna todas as questões sem duplicatas', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        const list = [
            { sourceQuizId: id, sourceQuizName: 'X', questao: { id: 1 }, errorCount: 1 },
            { sourceQuizId: id, sourceQuizName: 'X', questao: { id: 2 }, errorCount: 2 }
        ];
        StorageManager.saveWrongQuestions(id, list);
        const result = StorageManager.getAggregatedWrong();
        assert.equal(result.length, 2);
    });

    it('getAggregatedWrong filtra por quizIds quando fornecido', () => {
        const { id: id1 } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        const { id: id2 } = StorageManager.addToLibrary({ ...SAMPLE_QUIZ, nomeSimulado: 'Q2' });
        StorageManager.saveWrongQuestions(id1, [{ sourceQuizId: id1, sourceQuizName: 'X', questao: { id: 1 }, errorCount: 1 }]);
        StorageManager.saveWrongQuestions(id2, [{ sourceQuizId: id2, sourceQuizName: 'Y', questao: { id: 2 }, errorCount: 1 }]);
        const result = StorageManager.getAggregatedWrong([id1]);
        assert.equal(result.length, 1);
        assert.equal(result[0].sourceQuizId, id1);
    });

    it('getAggregatedWrong deduplica por sourceQuizId + questao.id', () => {
        const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
        const list = [
            { sourceQuizId: id, sourceQuizName: 'X', questao: { id: 1 }, errorCount: 1 },
            { sourceQuizId: id, sourceQuizName: 'X', questao: { id: 1 }, errorCount: 2 }
        ];
        StorageManager.saveWrongQuestions(id, list);
        const result = StorageManager.getAggregatedWrong();
        assert.equal(result.length, 1);
    });
});
