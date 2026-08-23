# Prompt — executar o ticket 04

Trabalhe no repositório `/run/media/lucas/9618ecad-f1b2-4372-998c-efd159046c22/home/lucas/onibus-bh` e implemente integralmente o ticket 04 do aprofundamento arquitetural.

O blocker do ticket 04 está satisfeito: a cena declarativa do ticket 03 foi implementada no commit `3db4116`. As correções da revisão do ticket 03 em `MapView.vue`, `mapScene.ts` e `mapScene.test.ts` podem estar no worktree ou em um commit posterior; trate-as como parte da baseline, preserve-as e confirme o estado real do Git antes de editar.

## Fontes de verdade

Leia integralmente, antes de editar:

1. `AGENTS.md` e a documentação que ele exigir;
2. `.scratch/aprofundamento-arquitetural/spec.md`;
3. `.scratch/aprofundamento-arquitetural/issues/04-extrair-politica-viewport-mapa.md`;
4. `.scratch/aprofundamento-arquitetural/issues/03-construir-cena-declarativa-mapa.md`, para preservar o contrato da cena;
5. `docs/decisions.md`, especialmente as decisões sobre reenquadramento, exploração manual, localização e mapa mobile;
6. `src/components/mapScene.ts`, seus testes e a implementação atual de viewport em `src/components/MapView.vue`;
7. `src/components/MapView.test.ts`, `src/components/mapInteractionOptions.ts`, seus testes e a composição do mapa em `src/App.vue`;
8. a seção “Separar cena e política de viewport do mapa” em `research-local/reviews/architecture-review-20260712-213542.html`.

O ticket 04 define o escopo e os critérios de aceite. A spec define as decisões e restrições compartilhadas. Preserve as alterações preexistentes no worktree e mantenha o vocabulário de domínio do projeto.

## Fronteira arquitetural

A cena continua sendo a única responsável por compor elementos visuais e `bounds`. A política de viewport recebe estado e eventos neutros e decide um dos comandos declarativos:

- manter a visão atual;
- enquadrar os `bounds` da cena;
- usar a visão padrão;
- comunicar o centro de uma exploração manual.

A política deve possuir o estado necessário para distinguir inicialização, mudança estrutural, atualização frequente e conclusão de movimento programático. Ela não importa nem expõe Vue, DOM ou Leaflet.

O adapter `MapView.vue` executa comandos com `setView` ou `fitBounds`, converte coordenadas, encaminha eventos `moveend` e emite `moveMapArea` quando a política mandar. Padding, zoom máximo e visão padrão devem permanecer compatíveis com a experiência atual, mas ser expressos no contrato neutro antes da tradução para Leaflet.

Cena e política devem ser oferecidas ao adapter por uma única fachada de comportamento do mapa. Mantenha os módulos internos focados e evite criar seams públicos concorrentes para a mesma decisão.

## Invariantes

- A montagem inicial enquadra uma cena com `bounds`; sem `bounds`, usa a visão padrão atual.
- Mudanças estruturais relevantes, como uma nova localização do usuário ou uma troca real da parada monitorada, podem solicitar novo enquadramento.
- Atualizações de rota, posição de veículos, minutos ou outros dados de polling mantêm o viewport atual.
- Um `moveend` decorrente de comando programático é consumido pela política e não vira `moveMapArea`.
- Um `moveend` manual produz o centro da nova área para atualizar as paradas próximas.
- Os `bounds` vêm da cena; a política e o adapter não recompõem a lista de pontos visíveis.
- Tiles, controles, marcadores, labels, rota, seleção de parada e seleção de veículo preservam o comportamento atual.

## Execução

1. Inspecione o status do Git, confirme o commit do blocker e identifique as correções revisadas e demais mudanças preexistentes que precisam ser preservadas. Este passo termina quando cada arquivo já alterado estiver distinguido do trabalho do ticket.
2. Trace o fluxo atual entre montagem, `fitMap`, `autoFrameMap`, watchers, `suppressNextAreaSync`, `moveend` e `moveMapArea`. Classifique cada transição como inicialização, mudança estrutural, polling, movimento programático ou movimento manual. Este passo termina quando cada critério do ticket estiver associado a uma transição observável.
3. Defina o contrato neutro da política: estado, eventos e comandos para manter, enquadrar, usar a visão padrão e comunicar mudança manual. Modele padding, zoom máximo, centro e bounds sem tipos Leaflet. Este passo termina quando todas as decisões de viewport puderem ser verificadas com objetos TypeScript puros.
4. Escreva testes puros para a política antes de concluir a integração. Cubra, no mínimo: montagem com e sem bounds; mudança estrutural relevante; atualização exclusiva de rota; atualização exclusiva de veículos; conclusão de `setView` ou `fitBounds`; movimento manual e seu centro; e sequências consecutivas que comprovem que um evento programático não vaza como exploração manual. Este passo termina quando todas as transições e comandos do ticket estiverem cobertos sem montar Vue ou Leaflet.
5. Componha a cena e a política em uma fachada pequena de comportamento do mapa. A fachada deve receber os dados e eventos necessários e devolver a cena atual e os comandos de viewport, preservando `createMapScene` como fonte das regras visuais. Este passo termina quando o adapter possuir um único ponto de entrada para decisões de cena e viewport.
6. Integre a fachada em `MapView.vue`. Substitua as flags e decisões de produto mantidas no componente pela execução dos comandos declarativos; mantenha no adapter apenas ciclo de vida, tradução para Leaflet, resize, tiles, camadas e eventos. Este passo termina quando `MapView.vue` não decidir o que constitui mudança estrutural, polling ou exploração manual.
7. Preserve o enquadramento confortável atual: padding `[72, 72]`, zoom máximo `15`, span mínimo equivalente e visão padrão em `[-19.916342, -43.993759]` com zoom `14`, salvo se uma fonte de verdade do projeto demonstrar outro valor. Este passo termina quando esses valores estiverem comprovados no seam puro ou na tradução essencial do adapter, sem duplicação de regra.
8. Mantenha testes leves de integração de `MapView.vue`. Comprove que o adapter executa visão padrão e enquadramento, suprime a emissão após movimento programático, emite o centro após movimento manual e continua renderizando a cena e os controles existentes. Este passo termina quando a integração essencial estiver coberta sem duplicar a matriz de transições dos testes puros.
9. Execute os testes focados durante a implementação e corrija todas as regressões dentro do escopo. Este passo termina com os testes da política, da cena, do mapa e da aplicação relacionados verdes.
10. Execute `npm run test`, `npm run lint` e `npm run build`. Este passo termina apenas quando os três comandos passarem sem flags ou preparação manual adicional.
11. Revise o diff contra todos os critérios de aceite do ticket. Este passo termina quando cada critério estiver comprovado por código e teste, sem mudanças no contrato da SIU, integração Mobilibus, redesenho visual ou alterações incidentais fora do escopo.

## Entrega

Ao concluir, informe:

- o comportamento entregue;
- a interface pública da política e os comandos declarativos;
- a fachada que compõe cena e viewport;
- quais mudanças são consideradas estruturais e quais são tratadas como polling;
- como movimentos programáticos e manuais são distinguidos;
- os arquivos alterados;
- os testes adicionados ou ajustados;
- o resultado dos três comandos de validação;
- qualquer risco residual ou critério que não tenha sido satisfeito.

Não faça commit nem push sem solicitação explícita.
