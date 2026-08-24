# Prompt — implementar os tickets 01 e 02 da Mobilibus

Trabalhe no repositório `/run/media/lucas/9618ecad-f1b2-4372-998c-efd159046c22/home/lucas/onibus-bh` e implemente integralmente, em sequência, os tickets 01 e 02 da iniciativa de catálogo metropolitano Mobilibus.

O Ticket 01 é o primeiro marco e implementa a pesquisa de linhas da Ótimo/RMBH. O Ticket 02 depende dele e adiciona a consulta de horários planejados para a linha selecionada. Conclua e valide o primeiro marco antes de iniciar o segundo, mantendo uma única arquitetura coerente entre servidor, contrato HTTP e interface Vue.

## Fontes de verdade

Antes de editar, leia integralmente:

1. `AGENTS.md` e todos os documentos exigidos por ele;
2. `CONTEXT.md`;
3. `.scratch/catalogo-metropolitano-mobilibus/spec.md`;
4. `.scratch/catalogo-metropolitano-mobilibus/issues/01-pesquisar-linhas-otimo-rmbh.md`;
5. `.scratch/catalogo-metropolitano-mobilibus/issues/02-consultar-horarios-planejados-linha-mobilibus.md`;
6. `docs/adr/0001-manter-siu-e-mobilibus-como-fontes-complementares.md`;
7. `docs/adr/0002-integrar-mobilibus-no-dispatcher-compartilhado.md`;
8. `docs/mobilibus-otimo-api-research.md`;
9. o dispatcher HTTP compartilhado, seus tipos, suas operações e seus testes;
10. os adapters Vite e Vercel e seus testes de compatibilidade;
11. `src/App.vue`, os componentes de navegação e os testes atuais da aplicação;
12. os clientes e modelos usados pelo browser para consumir `/api/*`.

A spec e os dois tickets são as fontes de verdade do escopo e dos critérios de aceite. A pesquisa Mobilibus fornece evidências sobre a API externa, mas não autoriza incorporar endpoints, campos ou comportamentos declarados fora de escopo.

## Estado inicial e preservação do worktree

Comece executando `git status --short --branch` e `git diff --check`. Identifique alterações preexistentes, inclusive arquivos não rastreados, e preserve-as. Leia os diffs que tocarem arquivos necessários à implementação para integrar o trabalho sem sobrescrever decisões já presentes.

Use a implementação atual do dispatcher compartilhado e da política de viewport como baseline arquitetural, mesmo que existam ajustes ainda não commitados no worktree. Restrinja suas mudanças ao necessário para os dois tickets e às correções diretamente exigidas por regressões que eles causarem.

## Guardrails arquiteturais

- Preserve a SIU como fonte dos fluxos municipais atuais: paradas, previsões, itinerários, veículos, mapa e favoritos.
- Trate a Mobilibus como fonte complementar e independente para o catálogo metropolitano e seus horários planejados.
- Mantenha `projectId` e `routeId` como identidade da Linha Mobilibus. `shortName` é somente o código público apresentado ao passageiro.
- Faça o browser consumir exclusivamente `/api/*`. Concentre chamadas externas à Mobilibus no servidor.
- Estenda o dispatcher HTTP compartilhado com operações Mobilibus explícitas. Preserve Vite e Vercel como adapters finos do mesmo contrato.
- Concentre base externa, construção de paths, timeout, leitura JSON, normalização, cache e tradução de falhas em um módulo Mobilibus profundo e testável.
- Injete transporte HTTP e relógio nos seams que precisam de testes determinísticos.
- Use somente a rede Ótimo/RMBH nesta entrega. Rejeite projetos de outras redes no contrato de horários.
- Use fixtures locais mínimas nos testes. A suíte automatizada não deve acessar a Mobilibus real.
- Preserve os envelopes canônicos de sucesso definidos na spec e o envelope de erro `{ error: { code, message } }`.
- Apresente horários como programação planejada. Preserve os agrupamentos recebidos e não deduza qual serviço vale no dia atual.
- Mantenha a seleção da linha apenas em memória.
- Evite uma abstração genérica de fonte de transporte; SIU e Mobilibus ainda têm contratos e identidades distintos.

## Marco 1 — Ticket 01: pesquisa de linhas

1. Catalogue o contrato externo necessário ao catálogo a partir da pesquisa existente. Registre no código somente os campos efetivamente normalizados. Este passo termina quando projeto Ótimo/RMBH, path externo, formato mínimo da resposta e tratamento de campos ausentes estiverem definidos sem depender da rede em testes.
2. Modele a Linha Mobilibus normalizada com identidade, código público, nome, rede e tarifa opcional. Este passo termina quando `projectId` e `routeId` permanecerem distintos de `shortName` em todos os limites públicos.
3. Escreva testes no seam do módulo Mobilibus para pesquisa por código e nome, normalização sem diferença de caixa ou acentuação, linha `2890`, tarifa ausente, payload inválido, falha upstream, cache de 30 minutos e expiração controlada por relógio fake. Este passo termina com uma suíte determinística que falha pelas lacunas ainda não implementadas.
4. Implemente o módulo Mobilibus e o cache do catálogo. Este passo termina quando os testes do seam passarem com transporte fake e chamadas simultâneas ou repetidas durante a validade não provocarem acesso externo duplicado.
5. Estenda as operações e o dispatcher com `GET /api/mobilibus/linhas?q={consulta}`. Cubra sucesso, método inválido, consulta com menos de dois caracteres, consulta ausente, rota desconhecida e tradução de falhas. Este passo termina quando o dispatcher devolver `{ lines: [...] }` e o envelope de erro canônico sem conhecer objetos de Vite ou Vercel.
6. Integre as operações Mobilibus nos adapters Vite e Vercel. Este passo termina quando casos representativos demonstrarem paridade de status e corpo entre os dois runtimes.
7. Adicione ao frontend um cliente tipado para o endpoint próprio e uma seção de navegação `Linhas`, preservando a busca superior como busca exclusiva de paradas e endereços. Este passo termina quando alternar entre monitoramento e linhas não reiniciar nem interromper o fluxo SIU.
8. Implemente a pesquisa com entrada mínima de dois caracteres e debounce aproximado de 250 ms. Busque por código público ou nome sem diferença de caixa ou acentuação e trate respostas concorrentes para que uma resposta antiga não substitua a consulta mais recente.
9. Apresente estados de entrada inicial, carregamento, resultados, vazio e erro recuperável. Cada resultado deve mostrar código público, nome completo, selo `Ótimo/RMBH` e tarifa somente quando informada, mantendo identificadores técnicos fora do conteúdo principal.
10. Garanta responsividade, controles semânticos, navegação por teclado, foco visível, nomes acessíveis e mensagens compreensíveis sem depender apenas de cor.
11. Adicione testes da aplicação montada para navegação, debounce, pesquisa, conteúdo, estados visíveis, nova tentativa e isolamento do fluxo SIU. Este passo termina quando os critérios observáveis do Ticket 01 estiverem provados em interfaces públicas, sem expectativas frágeis sobre helpers ou estrutura privada dos componentes.
12. Execute os testes focados do módulo Mobilibus, dispatcher, adapters e frontend. Revise cada checkbox do Ticket 01. O marco termina somente quando todos os critérios estiverem satisfeitos e os testes relacionados estiverem verdes.

## Marco 2 — Ticket 02: horários planejados

Inicie este marco somente após concluir o Marco 1.

1. Modele o horário planejado normalizado por sentido e, dentro dele, pela descrição do serviço, preservando a ordem das partidas fornecida pela fonte. Este passo termina quando a UI puder renderizar a programação sem interpretar `services[].days` nem campos operacionais não validados.
2. Escreva testes no seam Mobilibus para construção do path por `projectId` e `routeId`, múltiplos sentidos e serviços, preservação da ordem, resposta sem horários, payload inválido, falha upstream, cache de 5 minutos e expiração com relógio fake.
3. Implemente a operação de horários no módulo Mobilibus. Este passo termina quando transporte e relógio puderem ser substituídos e o cache de horários permanecer isolado do cache do catálogo.
4. Estenda o dispatcher com `GET /api/mobilibus/projetos/{projectId}/linhas/{routeId}/horarios`. Valide método, projeto e rota e rejeite redes fora da Ótimo/RMBH. Este passo termina quando sucesso, validação e erros usarem o contrato compartilhado.
5. Demonstre paridade Vite/Vercel para sucesso, validação e falha upstream na consulta de horários.
6. Permita selecionar uma linha usando `projectId` e `routeId`, mantendo a seleção em memória. Este passo termina sem criar persistência local, histórico, nova rota de frontend ou URL compartilhável.
7. Mostre, na seção `Linhas`, carregamento, conteúdo, ausência de horários e erro recuperável. Organize a apresentação por sentido e serviço e identifique explicitamente os dados como horários planejados, sem linguagem de previsão ou tempo real.
8. Preserve o resultado selecionado e permita repetir a consulta após uma falha. Uma falha de horários deve permanecer local à experiência Mobilibus e não alterar polling, estado, previsões, mapa ou favoritos SIU.
9. Adicione testes da aplicação montada para seleção da linha `2890`, múltiplos sentidos e serviços, ordem das partidas, estados visíveis, nova tentativa, tarifa ausente e isolamento entre fontes.
10. Execute os testes focados e revise cada checkbox do Ticket 02. O marco termina somente quando todos os critérios estiverem satisfeitos e os testes relacionados estiverem verdes.

## Validação final

Depois dos dois marcos:

1. Revise o diff completo e associe cada mudança a um critério de aceite dos tickets.
2. Remova duplicações acidentais, tipos frouxos, estados inalcançáveis e expectativas de teste acopladas à implementação privada.
3. Confirme que nenhum token, segredo ou payload bruto sensível foi adicionado ao repositório.
4. Confirme que a busca superior, a seleção de parada, previsões, mapa e favoritos SIU preservam o comportamento anterior.
5. Execute, sem flags de tolerância:

```sh
npm run test
npm run lint
npm run build
git diff --check
```

A implementação termina apenas quando todos esses comandos passarem e cada critério dos dois tickets tiver evidência em código e teste.

## Entrega

Ao concluir, informe:

- o comportamento entregue em cada ticket;
- a arquitetura do módulo Mobilibus e suas interfaces públicas;
- os endpoints próprios e externos utilizados;
- os modelos normalizados e a estratégia de identidade;
- a política de cache e como ela foi testada;
- como o dispatcher e os adapters preservam a paridade Vite/Vercel;
- como o fluxo SIU permaneceu isolado;
- os arquivos criados e alterados;
- os testes adicionados ou ajustados;
- o resultado de `npm run test`, `npm run lint`, `npm run build` e `git diff --check`;
- riscos residuais ou critérios não satisfeitos.

Atualize os checkboxes e o `Status` de cada ticket para `completed` somente quando todos os critérios daquele arquivo estiverem comprovadamente atendidos. Não faça commit nem push sem solicitação explícita.
