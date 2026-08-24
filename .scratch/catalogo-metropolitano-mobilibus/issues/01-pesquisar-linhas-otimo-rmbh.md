# 01 — Pesquisar linhas da Ótimo/RMBH

**What to build:** permitir que o passageiro acesse uma seção própria de linhas e pesquise o catálogo metropolitano da Ótimo/RMBH por código público ou nome, reconhecendo claramente a linha, sua rede e a tarifa informada sem alterar a busca municipal de paradas.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] A navegação oferece uma seção `Linhas` responsiva e acessível, enquanto a busca superior continua exclusiva para paradas e endereços.
- [x] A pesquisa começa com pelo menos dois caracteres, usa debounce curto e encontra linhas por código público ou nome sem diferença de caixa ou acentuação.
- [x] O catálogo abrange todas as linhas da Ótimo/RMBH, com a linha `2890` coberta como caso de compatibilidade, sem consultar a rede BH municipal da Mobilibus.
- [x] Cada resultado mostra código público, nome completo, selo `Ótimo/RMBH` e `Tarifa informada` quando houver valor, sem apresentar identificadores técnicos como conteúdo principal.
- [x] Uma Linha Mobilibus preserva `projectId` e `routeId` como identidade, mantendo o código público separado e sem reutilizar identidades SIU.
- [x] O browser consulta somente `/api/*`, e o dispatcher compartilhado reconhece a busca Mobilibus por meio de operações explícitas e separadas das operações SIU.
- [x] Vite e Vercel executam o mesmo método, validação, envelope de sucesso e tradução de erros para a busca metropolitana.
- [x] O acesso externo, a construção da requisição, a leitura do payload e a normalização do catálogo ficam concentrados no módulo Mobilibus e podem usar transporte fake nos testes.
- [x] O catálogo usa cache server-side de 30 minutos, evita chamadas externas duplicadas durante a validade e não depende do token encontrado no APK.
- [x] A seção apresenta estados observáveis de entrada inicial, carregamento, resultados, vazio e erro recuperável.
- [x] Uma falha Mobilibus permanece limitada à seção `Linhas` e não interrompe monitoramento, previsões, mapa, busca de paradas ou favoritos da SIU municipal.
- [x] Testes no seam Mobilibus, no dispatcher, nos adapters e na aplicação montada cobrem busca, cache, contratos, estados visíveis e isolamento entre fontes.
- [x] Testes, verificação de tipos e build de produção passam.
