# 02 — Consultar horários planejados de uma Linha Mobilibus

**What to build:** permitir que o passageiro selecione uma linha encontrada e consulte, na mesma seção, seus horários planejados organizados por sentido e serviço, distinguindo programação operacional de previsão em tempo real.

**Blocked by:** 01 — Pesquisar linhas da Ótimo/RMBH.

**Status:** completed

- [x] Selecionar um resultado abre os detalhes e horários da mesma Linha Mobilibus usando sua combinação de `projectId` e `routeId`.
- [x] A seleção permanece apenas em memória e não adiciona persistência, histórico, roteamento ou URL compartilhável.
- [x] O contrato HTTP compartilhado oferece uma consulta de horários que valida método, projeto e rota, rejeitando redes fora da Ótimo/RMBH na primeira entrega.
- [x] Vite e Vercel produzem respostas equivalentes para sucesso, validação e erro upstream na consulta de horários.
- [x] O módulo Mobilibus constrói a consulta externa, normaliza direções, serviços e partidas e permite substituir transporte e relógio nos testes.
- [x] Os horários planejados usam cache server-side de 5 minutos e não provocam chamadas externas duplicadas durante sua validade.
- [x] A apresentação organiza horários primeiro por sentido e depois pela descrição do serviço planejado, preservando a ordem das partidas fornecidas.
- [x] A interface identifica os dados como horários planejados e não os apresenta como previsão ou informação em tempo real.
- [x] A aplicação não escolhe automaticamente o serviço do dia nem interpreta `services[].days` enquanto a semântica do calendário não estiver confirmada.
- [x] A tarifa ausente não é apresentada como zero, e campos técnicos ou operacionais ainda não validados permanecem fora da interface.
- [x] A seção apresenta estados observáveis de carregamento, conteúdo, ausência de horários e erro recuperável com possibilidade de nova tentativa.
- [x] Uma falha na consulta de horários não altera nem interrompe o estado e os ciclos da SIU municipal.
- [x] Testes no seam Mobilibus, no dispatcher, nos adapters e na aplicação montada cobrem a linha `2890`, múltiplos sentidos e serviços, cache, erros, apresentação e isolamento entre fontes.
- [x] Testes, verificação de tipos e build de produção passam.
