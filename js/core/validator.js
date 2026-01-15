/**
 * Validator - Centralized validation logic
 */
(function(window) {
    const Validator = {
        validateQuiz(data) {
            const errors = [];
            if (!data.nomeSimulado) errors.push("Campo 'nomeSimulado' ausente ou vazio.");
            if (!data.questoes || !Array.isArray(data.questoes) || data.questoes.length === 0) {
                errors.push("Campo 'questoes' deve ser uma lista não vazia.");
            } else {
                data.questoes.forEach((q, i) => {
                    const qNum = i + 1;
                    if (!q.enunciado) errors.push(`Questão #${qNum}: Enunciado ausente.`);
                    if (![CONFIG.QUESTION_TYPES.SINGLE, CONFIG.QUESTION_TYPES.MULTIPLE].includes(q.tipo)) {
                        errors.push(`Questão #${qNum}: Tipo inválido.`);
                    }
                    if (!q.alternativas || !Array.isArray(q.alternativas) || q.alternativas.length < 2) {
                        errors.push(`Questão #${qNum}: Deve ter pelo menos 2 alternativas.`);
                    } else {
                        const altIds = q.alternativas.map(a => a.id);
                        if (!q.respostasCorretas || !Array.isArray(q.respostasCorretas) || q.respostasCorretas.length === 0) {
                            errors.push(`Questão #${qNum}: Sem respostas corretas.`);
                        } else {
                            q.respostasCorretas.forEach(rid => {
                                if (!altIds.includes(rid)) errors.push(`Questão #${qNum}: Resposta '${rid}' não existe.`);
                            });
                        }
                    }
                });
            }
            return { valid: errors.length === 0, errors };
        },

        isQuestionCardValid(card) {
            const enunci = card.querySelector('.q-enunciado').value.trim();
            if (enunci.length < CONFIG.LIMITS.ENUNCIADO_MIN_LENGTH) return false;
            
            const alts = card.querySelectorAll('.alt-text');
            let allAltsFilled = alts.length >= 2;
            alts.forEach(a => { if (!a.value.trim()) allAltsFilled = false; });
            if (!allAltsFilled) return false;
            
            const type = card.querySelector('.q-type').value;
            const checks = card.querySelectorAll('.alt-check:checked');
            if (type === CONFIG.QUESTION_TYPES.SINGLE) {
                if (checks.length !== 1) return false;
            } else {
                if (checks.length < 2) return false;
            }
            
            return true;
        }
    };

    window.Validator = Validator;
})(window);
