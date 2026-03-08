require('../setup/environment');
const { load } = require('../setup/loader');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

load('js/core/config.js');
load('js/core/storage-manager.js');
load('js/core/validator.js');
load('js/features/quiz-engine.js');

const QUIZ = {
    nomeSimulado: 'Simulado de Integração',
    questoes: [
        {
            id: 1, enunciado: 'Q1 — Única', tipo: 'unica',
            alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
            respostasCorretas: ['a']
        },
        {
            id: 2, enunciado: 'Q2 — Múltipla', tipo: 'multipla',
            alternativas: [
                { id: 'a', texto: 'A' }, { id: 'b', texto: 'B' },
                { id: 'c', texto: 'C' }, { id: 'd', texto: 'D' }
            ],
            respostasCorretas: ['b', 'c']
        },
        {
            id: 3, enunciado: 'Q3 — Única', tipo: 'unica',
            alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
            respostasCorretas: ['b']
        }
    ]
};

beforeEach(() => {
    localStorage.clear();
    QuizEngine.init(QUIZ);
});

describe('Fluxo completo — quiz respondido integralmente', () => {
    it('um simulado com 100% de acertos gera stats corretas', () => {
        QuizEngine.select('a'); QuizEngine.confirm();
        QuizEngine.next();
        QuizEngine.select('b'); QuizEngine.select('c'); QuizEngine.confirm();
        QuizEngine.next();
        QuizEngine.select('b'); QuizEngine.confirm();

        const stats = QuizEngine.getStats();
        assert.equal(stats.correct, 3);
        assert.equal(stats.incorrect, 0);
        assert.equal(stats.unanswered, 0);
        assert.equal(stats.percent, 100);
    });

    it('um simulado com 0% de acertos gera stats corretas', () => {
        QuizEngine.select('b'); QuizEngine.confirm();
        QuizEngine.next();
        QuizEngine.select('a'); QuizEngine.select('d'); QuizEngine.confirm();
        QuizEngine.next();
        QuizEngine.select('a'); QuizEngine.confirm();

        const stats = QuizEngine.getStats();
        assert.equal(stats.correct, 0);
        assert.equal(stats.incorrect, 3);
        assert.equal(stats.percent, 0);
    });
});

describe('Fluxo — navegação e estado de visita', () => {
    it('navegar entre questões marca todas como visitadas', () => {
        QuizEngine.next();
        QuizEngine.next();
        QuizEngine.prev();

        const { visitedQuestions } = QuizEngine.getState();
        assert.deepEqual(visitedQuestions, [true, true, true]);
    });

    it('getCurrentData() reflete a questão atual corretamente', () => {
        QuizEngine.goTo(1);
        const data = QuizEngine.getCurrentData();

        assert.equal(data.index, 1);
        assert.equal(data.total, 3);
        assert.equal(data.isAnswered, false);
        assert.equal(data.isLast, false);
        assert.equal(data.question.tipo, 'multipla');
    });

    it('isLast é true apenas na última questão', () => {
        QuizEngine.goTo(2);
        assert.equal(QuizEngine.getCurrentData().isLast, true);
    });

    it('questão visitada mas não respondida retorna "skipped"', () => {
        QuizEngine.next();
        assert.equal(QuizEngine.getQuestionStatus(1), 'skipped');
    });

    it('questão nunca visitada retorna "pending"', () => {
        assert.equal(QuizEngine.getQuestionStatus(2), 'pending');
    });

    it('questões puladas aparecen como skipped e pending por diferença de visita', () => {
        QuizEngine.select('a'); QuizEngine.confirm();
        QuizEngine.goTo(2);
        QuizEngine.select('b'); QuizEngine.confirm();

        assert.equal(QuizEngine.getQuestionStatus(0), 'correct');
        assert.equal(QuizEngine.getQuestionStatus(1), 'pending');
        assert.equal(QuizEngine.getQuestionStatus(2), 'correct');
    });
});

describe('Fluxo — persistência na biblioteca', () => {
    it('saveStatsToLibrary() atualiza metadados após completar o quiz', () => {
        const { id } = StorageManager.addToLibrary(QUIZ);
        QuizEngine.init(QUIZ, id);

        QuizEngine.select('a'); QuizEngine.confirm();
        QuizEngine.next();
        QuizEngine.select('b'); QuizEngine.select('c'); QuizEngine.confirm();
        QuizEngine.next();
        QuizEngine.select('b'); QuizEngine.confirm();

        QuizEngine.saveStatsToLibrary();

        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.equal(item.meta.timesPlayed, 1);
        assert.equal(item.meta.averageScore, 100);
        assert.equal(item.meta.history.length, 1);
        assert.ok(item.meta.lastPlayed !== null);
    });

    it('média de score acumula corretamente em múltiplas sessões', () => {
        const { id } = StorageManager.addToLibrary(QUIZ);

        QuizEngine.init(QUIZ, id);
        QuizEngine.select('a'); QuizEngine.confirm();
        QuizEngine.saveStatsToLibrary();

        QuizEngine.init(QUIZ, id);
        QuizEngine.select('a'); QuizEngine.confirm();
        QuizEngine.next();
        QuizEngine.select('b'); QuizEngine.select('c'); QuizEngine.confirm();
        QuizEngine.next();
        QuizEngine.select('b'); QuizEngine.confirm();
        QuizEngine.saveStatsToLibrary();

        const item = StorageManager.getLibrary().find(i => i.id === id);
        assert.equal(item.meta.timesPlayed, 2);
        assert.equal(item.meta.history.length, 2);
        assert.ok(item.meta.averageScore > 0);
    });
});

describe('Fluxo — validação do JSON antes de iniciar', () => {
    it('rejeita um arquivo que seria carregado sem nomeSimulado', () => {
        const { nomeSimulado, ...invalid } = QUIZ;
        const result = Validator.validateQuiz(invalid);
        assert.equal(result.valid, false);
    });

    it('aceita o quiz de integração como estrutura válida', () => {
        const result = Validator.validateQuiz(QUIZ);
        assert.equal(result.valid, true);
    });
});
