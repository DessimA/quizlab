require('../setup/environment');
const { load } = require('../setup/loader');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

load('js/core/config.js');
load('js/core/validator.js');

const VALID_QUIZ = {
    nomeSimulado: 'Quiz Válido',
    questoes: [
        {
            id: 1,
            enunciado: 'Questão de exemplo',
            tipo: 'unica',
            alternativas: [
                { id: 'a', texto: 'Opção A' },
                { id: 'b', texto: 'Opção B' }
            ],
            respostasCorretas: ['a']
        }
    ]
};

function buildQuiz(overrides = {}) {
    return { ...VALID_QUIZ, ...overrides };
}

function buildQuestion(overrides = {}) {
    return { ...VALID_QUIZ.questoes[0], ...overrides };
}

describe('Validator validateQuiz() casos válidos', () => {
    it('aprova um quiz completo e correto', () => {
        const result = Validator.validateQuiz(VALID_QUIZ);
        assert.equal(result.valid, true);
        assert.deepEqual(result.errors, []);
    });

    it('aprova quiz com múltiplas questões e tipos mistos', () => {
        const quiz = buildQuiz({
            questoes: [
                buildQuestion({ tipo: 'unica', respostasCorretas: ['a'] }),
                buildQuestion({
                    id: 2, tipo: 'multipla',
                    alternativas: [
                        { id: 'a', texto: 'A' },
                        { id: 'b', texto: 'B' },
                        { id: 'c', texto: 'C' }
                    ],
                    respostasCorretas: ['a', 'b']
                })
            ]
        });
        assert.equal(Validator.validateQuiz(quiz).valid, true);
    });

    it('aprova quiz sem campo descricao (campo opcional)', () => {
        const { descricao, ...quiz } = { descricao: 'x', ...VALID_QUIZ };
        assert.equal(Validator.validateQuiz(quiz).valid, true);
    });
});

describe('Validator validateQuiz() campo nomeSimulado', () => {
    it('rejeita quiz sem nomeSimulado', () => {
        const { nomeSimulado, ...quiz } = VALID_QUIZ;
        const result = Validator.validateQuiz(quiz);
        assert.equal(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('nomeSimulado')));
    });

    it('rejeita quiz com nomeSimulado vazio', () => {
        const result = Validator.validateQuiz(buildQuiz({ nomeSimulado: '' }));
        assert.equal(result.valid, false);
    });
});

describe('Validator validateQuiz() campo questoes', () => {
    it('rejeita quiz sem campo questoes', () => {
        const { questoes, ...quiz } = VALID_QUIZ;
        const result = Validator.validateQuiz(quiz);
        assert.equal(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('questoes')));
    });

    it('rejeita quiz com questoes como array vazio', () => {
        const result = Validator.validateQuiz(buildQuiz({ questoes: [] }));
        assert.equal(result.valid, false);
    });

    it('rejeita quiz com questoes não sendo um array', () => {
        const result = Validator.validateQuiz(buildQuiz({ questoes: 'invalido' }));
        assert.equal(result.valid, false);
    });
});

describe('Validator validateQuiz() validação por questão', () => {
    it('rejeita questão sem enunciado', () => {
        const result = Validator.validateQuiz(buildQuiz({
            questoes: [buildQuestion({ enunciado: '' })]
        }));
        assert.equal(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('Enunciado')));
    });

    it('rejeita tipo inválido', () => {
        const result = Validator.validateQuiz(buildQuiz({
            questoes: [buildQuestion({ tipo: 'checkbox' })]
        }));
        assert.equal(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('Tipo inválido')));
    });

    it('rejeita questão com menos de 2 alternativas', () => {
        const result = Validator.validateQuiz(buildQuiz({
            questoes: [buildQuestion({ alternativas: [{ id: 'a', texto: 'Única' }] })]
        }));
        assert.equal(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('2 alternativas')));
    });

    it('rejeita questão sem respostasCorretas', () => {
        const result = Validator.validateQuiz(buildQuiz({
            questoes: [buildQuestion({ respostasCorretas: [] })]
        }));
        assert.equal(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('respostas corretas')));
    });

    it('rejeita resposta correta cujo ID não existe nas alternativas', () => {
        const result = Validator.validateQuiz(buildQuiz({
            questoes: [buildQuestion({ respostasCorretas: ['z'] })]
        }));
        assert.equal(result.valid, false);
        assert.ok(result.errors.some(e => e.includes("'z' não existe")));
    });

    it('acumula erros de múltiplas questões inválidas', () => {
        const result = Validator.validateQuiz(buildQuiz({
            questoes: [
                buildQuestion({ enunciado: '' }),
                buildQuestion({ id: 2, tipo: 'invalido' })
            ]
        }));
        assert.ok(result.errors.length >= 2);
    });
});