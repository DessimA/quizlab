# Guia de Contribuição - QuizLab

Obrigado pelo interesse em contribuir para o QuizLab! Este documento define os padrões técnicos e processos para garantir a qualidade e a consistência do código.

## 🛠 Stack Tecnológica

*   **Linguagem:** Vanilla JavaScript (ES6+)
*   **Estilos:** CSS3 (CSS Variables, Flexbox, Grid)
*   **Markup:** HTML5 Semântico
*   **Dependências:** Zero (0). Não introduza bibliotecas externas (npm, lodash, frameworks) sem uma justificativa crítica e aprovação prévia.

---

## 📐 Padrões de Código

### 1. Arquitetura Modular (IIFE)
Todos os arquivos JS em `js/` (exceto `main.js`) devem seguir o padrão **Revealing Module Pattern** encapsulado em uma IIFE para não poluir o escopo global desnecessariamente, expondo apenas o objeto principal no `window`.

**Exemplo:**
```javascript
(function(window) {
    const MyModule = {
        _privateState: null, // Convenção: _prefixo para privados

        publicMethod() {
            console.log('Hello');
        }
    };

    window.MyModule = MyModule;
})(window);
```

### 2. Delegação de Eventos
Não adicione `addEventListener` diretamente em elementos dinâmicos dentro de funções de renderização.
*   **Correto:** Adicione uma entrada no `EventDelegator.register` no `main.js` e use `data-action="my-action"` no HTML.
*   **Incorreto:** `button.onclick = () => { ... }` dentro de um loop `forEach`.

### 3. CSS e Design System
*   Use **sempre** as variáveis definidas em `:root` (ex: `var(--primary-500)`). Não use cores hexadecimais hardcoded.
*   Prefira classes utilitárias já existentes (`.hidden`, `.flex-center`) antes de criar novas regras.

---

## 🔄 Fluxo de Trabalho (Git Flow)

1.  **Fork & Clone:** Faça um fork do repositório.
2.  **Branch:** Crie uma branch descritiva:
    *   `feature/novo-painel`
    *   `fix/calculo-score`
    *   `docs/atualizacao-readme`
3.  **Commit:** Use o padrão **Conventional Commits**:
    *   `feat: add visibility toggle to quiz panel`
    *   `fix: resolve navigation bug on review screen`
    *   `refactor: modularize creator logic`
    *   `style: improve badge alignment`
4.  **Pull Request:** Envie o PR para a branch `main`. Descreva as mudanças e, se possível, anexe screenshots.

---

## ✅ Checklist de Qualidade

Antes de enviar seu PR:
- [ ] O código segue o padrão DRY? (Sem repetição de lógica)
- [ ] O simulado funciona do início ao fim sem erros no console?
- [ ] A responsividade foi testada (Mobile vs Desktop)?
- [ ] Novos ícones foram adicionados ao `IconSystem` (se necessário)?
- [ ] **Testes:** Foram adicionados testes unitários para novos métodos públicos no core/features?
- [ ] **Utils:** Verificou se a funcionalidade já existe em `Utils` (ex: `Utils.plural`) para evitar duplicidade?
- [ ] **Eventos:** Garantiu que nenhum `addEventListener` direto foi adicionado em funções de renderização?
- [ ] **CI:** Todos os testes existentes (`npm test`) passam localmente?

---

**Dúvidas?** Abra uma *Issue* no repositório.
