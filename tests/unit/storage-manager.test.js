import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import '../setup/environment.js';
import '../../js/core/config.js';
import '../../js/core/storage-manager.js';

describe('StorageManager', () => {
    const SAMPLE_QUIZ = {
        nomeSimulado: 'Quiz Teste',
        questoes: [{ id: 1, enunciado: 'Q1' }]
    };

    beforeEach(() => {
        localStorage.clear();
    });

    describe('getLibrary() e saveLibrary()', () => {
        it('deve retornar array vazio inicialmente', () => {
            assert.deepEqual(StorageManager.getLibrary(), []);
        });

        it('deve salvar e recuperar biblioteca', () => {
            const lib = [{ id: '1', data: SAMPLE_QUIZ }];
            StorageManager.saveLibrary(lib);
            assert.deepEqual(StorageManager.getLibrary(), lib);
        });
    });

    describe('addToLibrary()', () => {
        it('deve adicionar novo item com metadados', () => {
            const result = StorageManager.addToLibrary(SAMPLE_QUIZ);
            assert.ok(result.success);
            assert.ok(result.id.startsWith('quiz_'));

            const library = StorageManager.getLibrary();
            assert.equal(library.length, 1);
            assert.equal(library[0].data.nomeSimulado, 'Quiz Teste');
            assert.ok(library[0].meta.addedAt);
        });
    });

    describe('removeFromLibrary()', () => {
        it('deve remover item pelo ID', () => {
            const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
            StorageManager.removeFromLibrary(id);
            assert.equal(StorageManager.getLibrary().length, 0);
        });

        it('deve limpar sessão se o item removido for o atual', () => {
            const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
            StorageManager.saveSession({ libraryId: id });
            StorageManager.removeFromLibrary(id);
            assert.equal(StorageManager.getSession(), null);
        });
    });

    describe('removeManyFromLibrary()', () => {
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

    describe('updateQuizStats()', () => {
        it('deve atualizar histórico e média', () => {
            const { id } = StorageManager.addToLibrary(SAMPLE_QUIZ);
            
            StorageManager.updateQuizStats(id, { percent: 80, correct: 8, total: 10 });
            StorageManager.updateQuizStats(id, { percent: 100, correct: 10, total: 10 });

            const item = StorageManager.getLibrary()[0];
            assert.equal(item.meta.timesPlayed, 2);
            assert.equal(item.meta.averageScore, 90);
            assert.equal(item.meta.history.length, 2);
            assert.equal(item.meta.history[0].score, 100);
        });
    });

    describe('getStorageStats() fallback', () => {
        it('retorna estrutura válida quando navigator.storage não existe', async () => {
            const stats = await StorageManager.getStorageStats();
            assert.ok(typeof stats.usage === 'number');
            assert.ok(typeof stats.quota === 'number');
            assert.ok(typeof stats.percent === 'number');
            assert.ok(stats.quota > 0);
        });
    });

    describe('canStore()', () => {
        it('permite armazenar quando uso está abaixo do threshold', async () => {
            const result = await StorageManager.canStore(SAMPLE_QUIZ);
            assert.equal(result.allowed, true);
        });
    });
});
