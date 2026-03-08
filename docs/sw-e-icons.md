# Cache de Fontes e Correção de Ícones

## sw.js

Service Worker que intercepta todas as requisições da aplicação.

**Estratégia por tipo de recurso:**

- **Fontes** (`fonts.googleapis.com`, `fonts.gstatic.com`): Cache First.
  Após a primeira visita, as fontes são servidas do cache sem tocar na rede.
  Justificativa: fontes são imutáveis por URL (Google usa URLs únicas por versão),
  tornando Cache First seguro e eliminando latência de rede nas visitas seguintes.

- **Assets estáticos e HTML**: Network First.
  Tenta a rede para pegar atualizações; cai para cache se offline.
  Justificativa: CSS e JS mudam com deploys, então a rede tem prioridade.

**Ciclo de vida:**
- `install`: pré-cacheia os assets estáticos listados.
- `activate`: remove caches de versões antigas (troque `CACHE_NAME` para forçar atualização).
- `fetch`: intercepta e aplica a estratégia correta.

## icon-system.js — método inject()

**Problema anterior:** `document.fonts.check()` é síncrono.
Se chamado antes da fonte terminar de carregar (race condition comum em conexões lentas),
retorna `false` e força o fallback SVG — que não existe para `menu_book`, `mail`, `shuffle`, etc.
Resultado: ícones em branco.

**Correção:** usa `document.fonts.load()`, que retorna uma Promise e espera a fonte estar
de fato disponível antes de renderizar os ícones. Isso garante que o Material Symbols
Outlined seja usado sempre que disponível, com fallback SVG apenas em falha real.
