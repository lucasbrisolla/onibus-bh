# 05 — Unificar o contrato HTTP local e Vercel

**What to build:** oferecer ao passageiro os mesmos endpoints, validações, respostas e erros em desenvolvimento e produção por meio de um dispatcher compartilhado executado por adapters finos de Vite e Vercel.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Um único dispatcher reconhece todas as rotas públicas de saúde, linhas, paradas próximas, previsões, itinerário e veículos.
- [ ] Método HTTP, parâmetros de path e query, códigos de status, envelopes de sucesso, método não permitido e erros são definidos uma única vez.
- [ ] Os contratos públicos existentes consumidos pelo browser permanecem compatíveis.
- [ ] O ambiente local oferece paridade com as funções de produção, inclusive para as rotas que antes só tinham adapter Vercel.
- [ ] Vite e Vercel traduzem seus objetos de request e response para o contrato neutro sem duplicar validação ou regras de rota.
- [ ] Rotas que não pertencem à API continuam liberadas pelo middleware local para o próximo handler.
- [ ] Testes do dispatcher cobrem sucesso, método inválido, parâmetros inválidos, rota desconhecida e tradução de erros para todos os formatos de endpoint.
- [ ] Testes de compatibilidade demonstram respostas equivalentes nos adapters local e Vercel para os mesmos casos representativos.
- [ ] Testes, verificação de tipos e build de produção passam.
