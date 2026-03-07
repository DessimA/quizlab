require('../setup/environment');
const { load } = require('../setup/loader');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

load('js/core/config.js');

global.StorageManager = {
    getLibrary: () => [],
    saveLibrary: () => true,
    updateQuizStats: () => true,
    saveSession: () => true,
    clearSession: () => {}
};

load('js/features/quiz-engine.js');

const QUIZ_SINGLE = {
    nomeSimulado: 'Teste Unitário',
    questoes: [
        {
            id: 1,
            enunciado: 'Qual a capital do Brasil?',
            tipo: 'unica',
            alternativas: [
                { id: 'a', texto: 'São Paulo' },
                { id: 'b', texto: 'Brasília' },
                { id: 'c', texto: 'Rio de Janeiro' }
            ],
            respostasCorretas: ['b']
        }
    ]
};

const QUIZ_MULTIPLE = {
    nomeSimulado: 'Teste Múltipla',
    questoes: [
        {
            id: 1,
            enunciado: 'Quais são linguagens de front-end nativas?',
            tipo: 'multipla',
            alternativas: [
                { id: 'a', texto: 'HTML' },
                { id: 'b', texto: 'CSS' },
                { id: 'c', texto: 'Python' },
                { id: 'd', texto: 'SQL' }
            ],
            respostasCorretas: ['a', 'b']
        }
    ]
};

const QUIZ_MULTI_QUESTION = {
    nomeSimulado: 'Teste Multi Questão',
    questoes: [
        {
            id: 1, enunciado: 'Q1', tipo: 'unica',
            alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
            respostasCorretas: ['a']
        },
        {
            id: 2, enunciado: 'Q2', tipo: 'unica',
            alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
            respostasCorretas: ['b']
        },
        {
            id: 3, enunciado: 'Q3', tipo: 'unica',
            alternativas: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }],
            respostasCorretas: ['a']
        }
    ]
};

describe('QuizEngine — init()', () => {
    it('inicializa o estado corretamente', () => {
        QuizEngine.init(QUIZ_SINGLE);
        const state = QuizEngine.getState();
        assert.equal(state.currentQuestion, 0);
        assert.equal(state.correctCount, 0);
        assert.equal(state.incorrectCount, 0);
        assert.deepEqual(state.userAnswers, [null]);
        assert.deepEqual(state.questionAnswered, [false]);
        assert.deepEqual(state.visitedQuestions, [true]);
        assert.deepEqual(state.flagged, []);
    });

    it('inicializa com modo estudo por padrão', () => {
        QuizEngine.init(QUIZ_SINGLE);
        assert.equal(QuizEngine.getState().mode, CONFIG.QUIZ_MODES.STUDY);
    });

    it('inicializa com modo exame quando especificado', () => {
        QuizEngine.init(QUIZ_SINGLE, null, { mode: CONFIG.QUIZ_MODES.EXAM });
        assert.equal(QuizEngine.getState().mode, CONFIG.QUIZ_MODES.EXAM);
    });

    it('embaralha questões quando shuffleQuestions é true', () => {
        const original = QUIZ_MULTI_QUESTION.questoes.map(q => q.id);
        let shuffled = false;
        for (let i = 0; i < 20; i++) {
            QuizEngine.init(QUIZ_MULTI_QUESTION, null, { shuffleQuestions: true });
            const current = QuizEngine.getState().quizData.questoes.map(q => q.id);
            if (current.join() !== original.join()) { shuffled = true; break; }
        }
        assert.ok(shuffled, 'Após 20 tentativas, ao menos uma deve estar embaralhada');
    });
});

describe('QuizEngine — select() com questão de única escolha', () => {
    beforeEach(() => QuizEngine.init(QUIZ_SINGLE));

    it('registra a alternativa selecionada', () => {
        QuizEngine.select('b');
        assert.equal(QuizEngine.getState().userAnswers[0], 'b');
    });

    it('substitui a seleção anterior ao selecionar nova alternativa', () => {
        QuizEngine.select('a');
        QuizEngine.select('c');
        assert.equal(QuizEngine.getState().userAnswers[0], 'c');
    });
});

describe('QuizEngine — select() com questão de múltipla escolha', () => {
    beforeEach(() => QuizEngine.init(QUIZ_MULTIPLE));

    it('acumula alternativas até o limite de respostas corretas', () => {
        QuizEngine.select('a');
        QuizEngine.select('c');
        assert.deepEqual(QuizEngine.getState().userAnswers[0], ['a', 'c']);
    });

    it('não permite selecionar mais alternativas do que o número de respostas corretas', () => {
        QuizEngine.select('a');
        QuizEngine.select('c');
        QuizEngine.select('b');
        assert.deepEqual(QuizEngine.getState().userAnswers[0], ['a', 'c']);
    });

    it('remove a alternativa ao selecioná-la novamente (toggle)', () => {
        QuizEngine.select('a');
        QuizEngine.select('a');
        assert.deepEqual(QuizEngine.getState().userAnswers[0], []);
    });
});

describe('QuizEngine — canConfirmCurrent()', () => {
    it('retorna false quando nenhuma alternativa foi selecionada', () => {
        QuizEngine.init(QUIZ_SINGLE);
        assert.equal(QuizEngine.canConfirmCurrent(), false);
    });

    it('retorna true quando única escolha está selecionada', () => {
        QuizEngine.init(QUIZ_SINGLE);
        QuizEngine.select('b');
        assert.equal(QuizEngine.canConfirmCurrent(), true);
    });

    it('retorna false quando múltipla escolha está incompleta', () => {
        QuizEngine.init(QUIZ_MULTIPLE);
        QuizEngine.select('a');
        assert.equal(QuizEngine.canConfirmCurrent(), false);
    });

    it('retorna true quando múltipla escolha está completa', () => {
        QuizEngine.init(QUIZ_MULTIPLE);
        QuizEngine.select('a');
        QuizEngine.select('b');
        assert.equal(QuizEngine.canConfirmCurrent(), true);
    });
});

describe('QuizEngine — confirm() e checkAnswer()', () => {
    it('incrementa correctCount ao confirmar resposta correta', () => {
        QuizEngine.init(QUIZ_SINGLE);
        QuizEngine.select('b');
        QuizEngine.confirm();
        assert.equal(QuizEngine.getState().correctCount, 1);
        assert.equal(QuizEngine.getState().incorrectCount, 0);
    });

    it('incrementa incorrectCount ao confirmar resposta errada', () => {
        QuizEngine.init(QUIZ_SINGLE);
        QuizEngine.select('a');
        QuizEngine.confirm();
        assert.equal(QuizEngine.getState().correctCount, 0);
        assert.equal(QuizEngine.getState().incorrectCount, 1);
    });

    it('trava a questão após confirmar (não permite dupla confirmação)', () => {
        QuizEngine.init(QUIZ_SINGLE);
        QuizEngine.select('b');
        QuizEngine.confirm();
        QuizEngine.confirm();
        assert.equal(QuizEngine.getState().correctCount, 1);
    });

    it('detecta resposta correta em múltipla escolha independente da ordem', () => {
        QuizEngine.init(QUIZ_MULTIPLE);
        QuizEngine.select('b');
        QuizEngine.select('a');
        QuizEngine.confirm();
        assert.equal(QuizEngine.getState().correctCount, 1);
    });

    it('checkAnswer retorna false quando não há resposta', () => {
        QuizEngine.init(QUIZ_SINGLE);
        assert.equal(QuizEngine.checkAnswer(0), false);
    });
});

describe('QuizEngine — navegação', () => {
    beforeEach(() => QuizEngine.init(QUIZ_MULTI_QUESTION));

    it('next() avança para a próxima questão e marca como visitada', () => {
        QuizEngine.next();
        assert.equal(QuizEngine.getState().currentQuestion, 1);
        assert.equal(QuizEngine.getState().visitedQuestions[1], true);
    });

    it('prev() não navega abaixo de zero', () => {
        QuizEngine.prev();
        assert.equal(QuizEngine.getState().currentQuestion, 0);
    });

    it('next() não avança além da última questão', () => {
        QuizEngine.goTo(2);
        QuizEngine.next();
        assert.equal(QuizEngine.getState().currentQuestion, 2);
    });

    it('goTo() navega diretamente para um índice válido', () => {
        QuizEngine.goTo(2);
        assert.equal(QuizEngine.getState().currentQuestion, 2);
    });

    it('goTo() rejeita índice inválido', () => {
        QuizEngine.goTo(99);
        assert.equal(QuizEngine.getState().currentQuestion, 0);
    });
});

describe('QuizEngine — getStats()', () => {
    it('calcula percentual corretamente', () => {
        QuizEngine.init(QUIZ_MULTI_QUESTION);

        QuizEngine.select('a'); QuizEngine.confirm();
        QuizEngine.next();
        QuizEngine.select('b'); QuizEngine.confirm();

        const stats = QuizEngine.getStats();
        assert.equal(stats.correct, 2);
        assert.equal(stats.incorrect, 0);
        assert.equal(stats.unanswered, 1);
        assert.equal(stats.percent, 67);
    });

    it('retorna 0% quando nada foi respondido', () => {
        QuizEngine.init(QUIZ_MULTI_QUESTION);
        const stats = QuizEngine.getStats();
        assert.equal(stats.percent, 0);
        assert.equal(stats.unanswered, 3);
    });

    it('retorna skipped corretamente para questões visitadas mas não respondidas', () => {
        QuizEngine.init(QUIZ_MULTI_QUESTION);
        QuizEngine.next();
        QuizEngine.prev();
        const stats = QuizEngine.getStats();
        assert.equal(stats.skipped, 1);
    });

    it('retorna flagged corretamente', () => {
        QuizEngine.init(QUIZ_MULTI_QUESTION);
        QuizEngine.flagQuestion(0);
        QuizEngine.flagQuestion(2);
        const stats = QuizEngine.getStats();
        assert.deepEqual(stats.flagged, [0, 2]);
    });
});

describe('QuizEngine — reset()', () => {
    it('zera o progresso mantendo os dados do quiz', () => {
        QuizEngine.init(QUIZ_SINGLE);
        QuizEngine.select('b');
        QuizEngine.confirm();
        QuizEngine.reset();

        const state = QuizEngine.getState();
        assert.equal(state.correctCount, 0);
        assert.equal(state.currentQuestion, 0);
        assert.deepEqual(state.userAnswers, [null]);
        assert.ok(state.quizData, 'quizData deve ser mantido após reset');
    });

    it('limpa flags após reset', () => {
        QuizEngine.init(QUIZ_MULTI_QUESTION);
        QuizEngine.flagQuestion(0);
        QuizEngine.reset();
        assert.deepEqual(QuizEngine.getState().flagged, []);
    });
});

describe('QuizEngine — getQuestionStatus()', () => {
    beforeEach(() => QuizEngine.init(QUIZ_MULTI_QUESTION));

    it('retorna "skipped" para questão visitada mas não respondida (Q0 visitada por padrão)', () => {
        assert.equal(QuizEngine.getQuestionStatus(0), 'skipped');
    });

    it('retorna "pending" para questão nunca visitada', () => {
        assert.equal(QuizEngine.getQuestionStatus(1), 'pending');
    });

    it('retorna "correct" para acerto confirmado', () => {
        QuizEngine.select('a');
        QuizEngine.confirm();
        assert.equal(QuizEngine.getQuestionStatus(0), 'correct');
    });

    it('retorna "incorrect" para erro confirmado', () => {
        QuizEngine.select('b');
        QuizEngine.confirm();
        assert.equal(QuizEngine.getQuestionStatus(0), 'incorrect');
    });
});

describe('QuizEngine — flagQuestion() e isFlagged()', () => {
    beforeEach(() => QuizEngine.init(QUIZ_MULTI_QUESTION));

    it('marca uma questão como flagged', () => {
        QuizEngine.flagQuestion(1);
        assert.equal(QuizEngine.isFlagged(1), true);
    });

    it('remove a flag ao chamar novamente (toggle)', () => {
        QuizEngine.flagQuestion(1);
        QuizEngine.flagQuestion(1);
        assert.equal(QuizEngine.isFlagged(1), false);
    });

    it('não afeta outras questões ao marcar uma', () => {
        QuizEngine.flagQuestion(0);
        assert.equal(QuizEngine.isFlagged(1), false);
        assert.equal(QuizEngine.isFlagged(2), false);
    });
});
