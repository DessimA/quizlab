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

---

## Refatoração DRY e Performance

### config.js — Utils namespace
Funções puras reutilizadas em múltiplos módulos foram centralizadas em `Utils`:
- `Utils.formatTime(seconds)` → substitui 3 implementações inline idênticas
  em `main.js`, `screen-manager.js` e `quiz-engine.js`
- `Utils.truncate(text)` → substitui duplicação em `_buildPendingCard` e
  `_buildResultCard` no `review-manager.js`
- `TIMINGS.SECONDS_PER_QUESTION` → constante que antes estava hardcoded como `* 2`
  (minutos) em dois lugares; agora é `120` segundos com semântica clara

### storage-manager.js — getById(id)
Método conveniente que evita `.getLibrary().find(i => i.id === id)` repetido
três vezes no `main.js` (load-quiz, edit-quiz, download-quiz).

### quiz-engine.js — _resetProgress() e _initTimer()
`init()` e `reset()` compartilhavam ~15 linhas idênticas. Extraídas para dois
métodos privados, eliminando a sincronização manual entre os dois pontos de entrada.
`stopTimer()` não toca mais o DOM — responsabilidade devolvida à camada de UI
via eventos (`quizlab:timer-expired`), mantendo o SRP do engine.

### screen-manager.js — resumeSession(session)
`load-quiz` e `resume-quiz` no `main.js` executavam a mesma sequência de 4 chamadas
(`restoreSession → change → renderQuestion → _syncExamTimerBar`). Centralizado
em `ScreenManager.resumeSession()`.

### main.js — _navigateQuiz(action)
`confirm-answer`, `next-question`, `prev-question` e `select-alternative`
seguem o padrão `engine.action() + renderQuestion()`. A closure `_navigateQuiz`
elimina a repetição sem introduzir acoplamento extra.

---

# Guard Dinâmico de Cota, Barra de Status e Seleção em Massa

## Motivação

O limite fixo de 10 slots era arbitrário e não refletia a capacidade real do
`localStorage`. A substituição por verificação dinâmica via `navigator.storage.estimate()`
permite que o usuário armazene quantos simulados o navegador suportar, com feedback visual
preciso sobre o espaço disponível.

---

## Mudanças por Arquivo

### `config.js`
Substituídos `MAX_LIBRARY_SLOTS: 10` por `STORAGE_WARN_THRESHOLD: 0.70` e
`STORAGE_BLOCK_THRESHOLD: 0.85`. Adicionado `Utils.formatBytes()`.

### `storage-manager.js`
- `addToLibrary()` não verifica mais slots. Retorna `SAVE_FAILED` apenas em erro real de escrita.
- `getStorageStats()` — async. Usa `navigator.storage.estimate()` quando disponível; cai no
  fallback de 5 MB baseado em `Blob.size` do localStorage quando não.
- `canStore(data)` — async. Projeta o uso pós-adição e bloqueia se >= 85%.
- `removeManyFromLibrary(ids)` — deleta um array de IDs em uma única escrita, limpando a
  sessão se necessário.

### `file-handler.js`
`_askToSave` tornou-se `async`. A verificação `LIMIT_REACHED` foi substituída por
`await StorageManager.canStore(data)` antes de chamar `addToLibrary`.

### `library-manager.js`
- `_selection` — estado de seleção em massa (`active`, `ids: Set`).
- `render()` chama `_updateCapacityUI()` (que é async internamente via `.then()`).
- `_updateCapacityUI()` consulta `getStorageStats()` e atualiza a barra com cores
  progressivas: verde / amarelo (70%) / vermelho (85%).
- `renderCard()` em modo seleção: adiciona `data-action="toggle-card-select"` no card,
  exibe checkbox, oculta botões de ação.
- Novos métodos públicos: `toggleSelectionMode`, `toggleCardSelection`, `selectAll`,
  `deselectAll`, `bulkDelete`.

### `main.js`
- `_finalizeExport` tornou-se `async`; usa `canStore` antes de `addToLibrary`.
- Removidos handlers `limit-export` e `limit-replace` (modal obsoleto).
- Adicionados handlers: `toggle-selection-mode`, `toggle-card-select`,
  `select-all-library`, `deselect-all-library`, `delete-selected`.

### `index.html`
- Bloco `#limitModal` removido (fluxo substituído pelo alerta de `canStore`).
- Header da biblioteca: botão "Selecionar" + barra de status `#libStorageInfo` /
  `#libCapacityFill`.
- Toolbar `#libBulkToolbar`: oculta por padrão, visível em modo seleção.

### `styles.css`
Adicionados: `.lib-storage-status`, `.lib-storage-info`, `.lib-capacity-fill.warn`,
`.lib-capacity-fill.danger`, `.lib-bulk-toolbar`, `.library-card.is-selected`,
`.lib-card-checkbox-wrap`, `.lib-card-checkbox`.

### `tests/unit/storage-manager.test.js`
- Removida suite `addToLibrary() com limite` (baseada em slots fixos).
- Adicionadas suites para `removeManyFromLibrary()` e smoke tests para
  `getStorageStats()` e `canStore()`.

---

# Importação em Massa e Auditoria do Guard de Cota

## Motivação

O `FileHandler` só processava um arquivo por vez. Com a remoção do limite fixo
de 10 simulados, tornou-se necessário permitir que o usuário importe múltiplos
arquivos `.json` de uma só vez, com tratamento individualizado de erros,
duplicatas e conflitos.

---

## Mudanças por Arquivo

### `file-handler.js`
- `handle(file)` mantido como fachada que delega para `handleMultiple([file])`.
- `handleMultiple(files)` — novo método público. Recebe `FileList` ou `Array<File>`.
  Filtra extensões `.json`, lê todos em paralelo via `Promise.all + _readFile`,
  e após o delay mínimo de loading decide entre fluxo single (1 arquivo) ou batch
  (múltiplos), preservando o comportamento original no caso de arquivo único.
- `_readFile(file)` — extrai a leitura de `FileReader` para uma `Promise`
  que resolve em `{ file, data, valid, errors }`.
- `_handleSingle(result)` — caminho do arquivo único, chama `_askToSave` com
  fluxo inalterado (incluindo tratamento de conflito interativo).
- `_handleBatch(results)` — itera os resultados em série (para respeitar
  `canStore` de forma acumulativa). Classifica cada item em: `saved`,
  `skipped` (idêntico), `conflicts` (mesmo nome, conteúdo diferente) ou
  `failed`. Conflitos não são resolvidos automaticamente no batch — o usuário
  deve importar o arquivo individualmente para substituir.
- `_showBatchReport(report)` — usa `ModalManager.custom()` para exibir o
  resumo. Se ao menos um foi salvo, o botão principal navega para a Biblioteca.

### `modal-manager.js`
- Adicionado método `custom({ title, body, confirmText, cancelText, onConfirm })`
  que reutiliza o `#customModal` existente no HTML, configurando dinamicamente
  o conteúdo e o callback do botão de confirmação.

### `index.html`
- `<input type="file">` recebeu o atributo `multiple`.
- Texto da `upload-area` atualizado para "um ou mais arquivos".
- Label do botão atualizado para "Selecionar Arquivo(s)".

### `main.js`
- `onchange` do `#fileInput` alterado para passar `e.target.files` (FileList)
  para `FileHandler.handleMultiple`. Adicionado `e.target.value = ''` para
  permitir re-seleção do mesmo arquivo.
- Handler de `drop` na `uploadArea` atualizado para passar
  `e.dataTransfer.files` para `handleMultiple`.

### `tests/unit/file-handler.test.js` — novo
  Cobre `_findDuplicate`, `_handleBatch` com cenários de: múltiplos novos,
  duplicata idêntica, conflito de conteúdo e arquivo inválido.
