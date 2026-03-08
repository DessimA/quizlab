# Correções — Sessão, Biblioteca e Timer de Exame

## Bug 1 — Simulado deletado ainda era carregado pela sessão

**Causa raiz:** `removeFromLibrary` apagava o item da biblioteca mas não verificava se havia
uma sessão de progresso salva (`quizlab_session`) apontando para aquele mesmo `libraryId`.
Na próxima entrada no app, a sessão órfã era encontrada e o quiz deletado era restaurado.

**Correção:** Em `storage-manager.js`, `removeFromLibrary` agora lê a sessão ativa antes de
remover o item. Se `session.libraryId === id`, a sessão é limpa primeiro. Isso garante
consistência entre os dois espaços no `localStorage` de forma atômica e no lugar correto
da cadeia de responsabilidade (camada de persistência, não na camada de UI).

---

## Bug 2 — Modal "retomar sessão" aparecia repetidamente na tela de upload

**Causa raiz:** O handler `enter-app` em `main.js` verificava a sessão toda vez que o usuário
navegava para a tela de upload (incluindo ao voltar da biblioteca), exibindo o modal
repetidamente enquanto a sessão existisse.

**Correção em duas partes:**

1. `main.js` — `enter-app` foi simplificado: não verifica mais sessão. Apenas muda de
   tela e exibe o onboarding na primeira visita.

2. `library-manager.js` — `render` consulta a sessão ativa uma vez e passa para `renderCard`.
   Se `session.libraryId === item.id`, o card exibe um botão "Retomar" ao lado de "Iniciar".
   O handler `resume-quiz` em `main.js` chama `QuizEngine.restoreSession` e navega diretamente
   para o simulado.

Essa abordagem contextualiza a ação de retomar onde ela faz sentido (no card do simulado
correspondente) e elimina a interrupção inesperada durante a navegação.

---

## Bug 3 — Timer invisível no Modo Exame

**Causa raiz:** O elemento `#timerDisplay` ficava dentro de `#quizInfoBar`. A classe
`hidden-panel` (aplicada pelo botão de toggle-visibility) usa `display: none !important`
em todos os filhos diretos exceto o botão de toggle, ocultando o timer completamente.
Além disso, o timer só aparecia após o primeiro tick (1 segundo de atraso).

**Correção:**

1. `index.html` — Novo elemento `#examTimerBar` adicionado como irmão de `#quizInfoBar`,
   fora da área colapsável. Sempre visível quando em modo exame.

2. `screen-manager.js` — Novo método `_syncExamTimerBar()` exibe o `#examTimerBar` com
   o tempo inicial assim que a tela do quiz é carregada (sem esperar o primeiro tick).
   Chamado em `loadQuiz` e no novo handler `resume-quiz`. Quando a tela muda para qualquer
   outra tela, a barra é ocultada.

3. `main.js` — Os listeners `quizlab:timer-tick` e `quizlab:timer-expired` agora atualizam
   tanto o `#timerDisplay` original (inline, dentro da info bar) quanto o `#examTimerBar`
   dedicado, garantindo que ambos fiquem sincronizados.

4. `styles.css` — `.exam-timer-bar` com visual destacado e `.timer-warning` com animação
   de pulso quando restam 60 segundos ou menos.
