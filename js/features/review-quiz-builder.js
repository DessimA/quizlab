(function(window) {
    const ReviewQuizBuilder = {
        build(quizIds, quantity) {
            const allWrong = StorageManager.getAggregatedWrong(quizIds);
            if (!allWrong.length) return null;

            const shuffled = _shuffle([...allWrong]);
            const selected = shuffled.slice(0, quantity);

            const reviewSources = {};
            selected.forEach(wq => {
                reviewSources[String(wq.questao.id)] = wq.sourceQuizId;
            });

            return {
                nomeSimulado: `Revisão ${selected.length} questão${selected.length !== 1 ? 'ões' : ''}`,
                descricao: 'Simulado de revisão gerado automaticamente a partir de questões respondidas incorretamente.',
                tags: ['revisao'],
                questoes: selected.map(wq => wq.questao),
                _reviewSources: reviewSources
            };
        }
    };

    function _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    window.ReviewQuizBuilder = ReviewQuizBuilder;
})(window);
