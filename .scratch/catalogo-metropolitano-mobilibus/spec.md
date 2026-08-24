# Spec: catálogo metropolitano e horários planejados Mobilibus

**Status:** completed

## Problem Statement

Como passageiro da Região Metropolitana de Belo Horizonte, preciso encontrar linhas da rede Ótimo/RMBH e consultar seus horários planejados no Ônibus BH. Hoje o produto depende da SIU municipal, que atende o fluxo de Belo Horizonte, mas não oferece linhas metropolitanas como a `2890`. Isso impede que o passageiro use o mesmo produto para descobrir a linha metropolitana correta, confirmar seu nome, consultar a tarifa informada e planejar uma viagem pela programação disponível.

## Solution

Adicionar ao Ônibus BH uma seção `Linhas` dedicada ao catálogo metropolitano da Ótimo/RMBH. Nela, o passageiro poderá pesquisar qualquer linha por código público ou nome, reconhecer claramente a fonte dos dados, selecionar uma linha e consultar seus horários planejados organizados por sentido e serviço.

A Mobilibus entrará como fonte de transporte complementar e independente da SIU municipal. O browser continuará usando somente `/api/*`; o dispatcher HTTP compartilhado reconhecerá as rotas Mobilibus; e módulos próprios concentrarão acesso externo, normalização, cache e identidade. A primeira entrega não misturará redes municipais e metropolitanas nem afirmará que um horário planejado é uma previsão em tempo real.

## User Stories

1. Como passageiro metropolitano, quero acessar uma seção de linhas, para encontrar transporte da Ótimo/RMBH sem confundir essa experiência com a busca de paradas.
2. Como passageiro, quero pesquisar uma linha pelo código público, para encontrar rapidamente a linha `2890`.
3. Como passageiro, quero pesquisar uma linha por parte do nome, para encontrá-la mesmo quando não souber seu código.
4. Como passageiro, quero que a busca desconsidere diferenças de caixa e acentuação, para não precisar reproduzir exatamente a escrita do catálogo.
5. Como passageiro, quero que a pesquisa comece somente após uma entrada útil, para evitar consultas e mudanças visuais enquanto ainda estou começando a digitar.
6. Como passageiro, quero que a busca aguarde uma breve pausa na digitação, para receber resultados estáveis sem requisições desnecessárias.
7. Como passageiro, quero pesquisar todas as linhas da Ótimo/RMBH, para que a funcionalidade não fique limitada ao caso piloto da `2890`.
8. Como passageiro, quero ver o código público de cada linha encontrada, para reconhecer o número usado no dia a dia.
9. Como passageiro, quero ver o nome completo da linha, para distinguir trajetos com códigos ou nomes parecidos.
10. Como passageiro, quero ver o selo `Ótimo/RMBH`, para saber que o resultado é metropolitano.
11. Como passageiro, quero ver a tarifa informada quando estiver disponível, para ter uma referência de custo antes da viagem.
12. Como passageiro, quero que uma tarifa ausente não apareça como zero, para não interpretar ausência de dado como gratuidade.
13. Como passageiro, quero que identificadores técnicos permaneçam ocultos, para ler apenas informações úteis à viagem.
14. Como passageiro, quero selecionar uma linha encontrada, para consultar seus detalhes e horários planejados.
15. Como passageiro, quero que a linha selecionada seja reconhecida por sua rede e identidade de rota, para não abrir acidentalmente uma linha homônima de outra rede.
16. Como passageiro, quero ver os horários organizados por sentido, para entender para qual direção cada partida se aplica.
17. Como passageiro, quero ver os horários agrupados pela descrição do serviço planejado, para preservar a organização fornecida pela operação.
18. Como passageiro, quero ver os horários de partida na ordem apresentada pelo serviço, para planejar o embarque.
19. Como passageiro, quero distinguir horário planejado de previsão em tempo real, para não interpretar uma programação como posição atual do ônibus.
20. Como passageiro, quero que o aplicativo não afirme qual serviço vale hoje enquanto o calendário não estiver confirmado, para evitar orientação incorreta.
21. Como passageiro, quero ver um estado de carregamento durante a pesquisa, para saber que o catálogo está sendo consultado.
22. Como passageiro, quero ver um estado de carregamento ao abrir os horários, para saber que os detalhes estão sendo consultados.
23. Como passageiro, quero receber uma mensagem clara quando nenhuma linha corresponder à busca, para ajustar o texto pesquisado.
24. Como passageiro, quero receber um erro específico quando a Mobilibus estiver indisponível, para entender que o problema afeta somente os dados metropolitanos.
25. Como passageiro municipal, quero que monitoramento, mapa, previsões e favoritos SIU continuem funcionando quando a Mobilibus falhar, para não perder uma funcionalidade independente.
26. Como passageiro, quero repetir uma busca após uma falha, para recuperar o fluxo sem recarregar toda a aplicação.
27. Como passageiro, quero retornar à seção de monitoramento sem perder o comportamento municipal atual, para alternar entre as duas experiências com segurança.
28. Como passageiro em celular, quero pesquisar linhas e ler horários em uma apresentação responsiva, para usar a funcionalidade durante o deslocamento.
29. Como passageiro que usa teclado ou tecnologia assistiva, quero navegar, pesquisar, selecionar e identificar estados com controles acessíveis, para utilizar a seção sem depender de apontamento ou cor.
30. Como passageiro, quero que a busca superior continue procurando somente paradas e endereços, para que seu comportamento atual permaneça previsível.
31. Como passageiro, quero que a linha selecionada permaneça apenas durante a sessão atual, para que a primeira entrega não imponha histórico ou preferência persistente sem necessidade.
32. Como pessoa mantenedora, quero que SIU municipal e Mobilibus preservem identidades separadas, para evitar usar código público, `routeId`, `projectId`, `cod`, `siu` ou `serviceId` como se fossem equivalentes.
33. Como pessoa mantenedora, quero que uma Linha Mobilibus seja identificada pelo projeto e pela identidade de rota, para suportar códigos públicos repetidos entre redes.
34. Como pessoa mantenedora, quero que o catálogo metropolitano tenha cache de duração compatível com sua estabilidade, para reduzir chamadas externas sem esconder mudanças por tempo excessivo.
35. Como pessoa mantenedora, quero que horários planejados usem cache mais curto que o catálogo, para equilibrar disponibilidade e atualização.
36. Como pessoa desenvolvedora, quero que o browser consulte somente endpoints próprios do Ônibus BH, para não expor detalhes da integração Mobilibus.
37. Como pessoa desenvolvedora, quero que Vite e Vercel executem o mesmo contrato Mobilibus, para evitar diferenças entre desenvolvimento e produção.
38. Como pessoa desenvolvedora, quero substituir o transporte HTTP Mobilibus por um fake, para testar catálogo, horários, erros e cache sem rede real.
39. Como pessoa desenvolvedora, quero que respostas externas sejam normalizadas antes de chegar à UI, para limitar o impacto de campos ausentes ou formatos inconsistentes.
40. Como pessoa desenvolvedora, quero que erros Mobilibus sejam traduzidos para o envelope HTTP canônico, para reutilizar o tratamento já adotado pelo cliente.
41. Como pessoa mantenedora, quero que a nova integração use operações Mobilibus explícitas, para não criar uma abstração genérica antes de SIU e Mobilibus compartilharem comportamentos reais.
42. Como pessoa mantenedora, quero que a linha `2890` seja um caso de compatibilidade verificável, para manter uma referência concreta da expansão metropolitana.
43. Como passageiro, quero abrir a aba `Linhas` já com o mapa metropolitano completo, para explorar os pontos sem precisar pesquisar uma linha antes.
44. Como passageiro, quero ver todos os pontos Mobilibus da área visível, para escolher o ponto de embarque diretamente no mapa.
45. Como passageiro, quero clicar em um ponto Mobilibus, para ver as partidas e os ônibus informados naquele local.
46. Como passageiro, quero distinguir uma partida programada de uma posição em tempo real, para não confundir horário previsto com ônibus localizado.
47. Como passageiro, quero atualizar as partidas do ponto selecionado, para conferir uma informação mais recente sem perder o contexto do mapa.

## Implementation Decisions

- A Mobilibus será uma fonte de transporte complementar. A SIU municipal continuará responsável pelas paradas, previsões, itinerários e veículos municipais já existentes.
- A primeira entrega consultará somente a rede Ótimo/RMBH. A rede BH municipal disponível na Mobilibus não participará da busca inicial.
- O catálogo metropolitano abrangerá todas as linhas da Ótimo/RMBH. A linha `2890` será o caso de aceite principal, não uma exceção codificada.
- A aplicação ganhará uma seção de navegação chamada `Linhas`. A busca superior continuará exclusiva para paradas e endereços.
- A pesquisa de linhas aceitará código público e nome, com comparação sem diferença de caixa e acentuação. A UI iniciará a busca com pelo menos dois caracteres e aplicará debounce de aproximadamente 250 ms.
- A seleção de linha ficará em memória. A primeira entrega não adicionará roteamento, URL compartilhável nem persistência local da última linha.
- Uma Linha Mobilibus será identificada pela combinação de `projectId` e `routeId`. O `shortName` será tratado como código público de apresentação, nunca como identidade interna suficiente.
- Cada resultado mostrará código público, nome completo, selo `Ótimo/RMBH` e `Tarifa informada` quando a fonte fornecer um valor. `routeId`, `agencyId` e demais identificadores técnicos não serão apresentados como conteúdo principal.
- Ao selecionar uma linha, a mesma seção exibirá seus detalhes e horários planejados. A UI organizará os dados por sentido e, dentro dele, pela descrição do serviço planejado.
- A UI não escolherá automaticamente o serviço do dia nem interpretará `services[].days` até que sua semântica seja confirmada. Os horários serão apresentados como programação, sem linguagem de tempo real.
- A seção `Linhas` exibirá o mapa Mobilibus completo desde sua abertura, usando a mesma experiência de exploração do mapa SIU sem substituir a fonte municipal. Os detalhes do ponto ficarão em um painel lateral, não serão a condição para a existência do mapa.
- A interface atual da aba `Linhas` não exibirá o cabeçalho explicativo, o campo `Buscar linha` nem o estado inicial de pesquisa; o painel lateral ficará dedicado ao ponto Mobilibus selecionado e às suas partidas, no mesmo padrão do Monitoramento.
- O mapa de pontos usará o endpoint externo por tiles `stops?project_id={projectId}&tile={x},{y},{zoom}` por meio de uma rota própria `/api/mobilibus/projetos/{projectId}/pontos?tile={x},{y},{zoom}`.
- Pontos Mobilibus manterão `stopId` e `projectId` em um modelo próprio. Eles não serão convertidos em `NearbyStop`, `cod` ou `siu` e não participarão da seleção ou previsão municipal.
- O mapa consultará tiles visíveis a partir do zoom mínimo confirmado pela fonte, deduplicará pontos entre tiles e manterá cache e chamadas simultâneas isolados por projeto e tile.
- O clique em um ponto usará `GET /api/mobilibus/projetos/{projectId}/pontos/{stopId}/partidas`, mantendo a identidade do projeto e do ponto no contrato próprio.
- Partidas serão normalizadas por linha, destino, horário, veículo e indicadores operacionais validados. A UI apresentará `Em tempo real` somente quando a fonte fornecer evidência de posição; as demais partidas permanecerão `Programado`.
- O ponto selecionado e suas partidas ficarão apenas em memória. Uma nova consulta recuperará o estado de erro ou conteúdo sem alterar a seleção SIU.
- O browser continuará consumindo exclusivamente `/api/*`. Chamadas à Mobilibus ocorrerão no servidor e não usarão o token encontrado no APK enquanto os endpoints públicos necessários funcionarem sem autenticação.
- O dispatcher HTTP compartilhado reconhecerá as rotas Mobilibus e continuará sendo a única fonte de verdade para método, parâmetros, status, envelopes e erros em Vite e Vercel.
- O dispatcher receberá operações Mobilibus explícitas, separadas das operações SIU. Não será criado um segundo dispatcher nem uma interface genérica de fonte de transporte nesta entrega.
- A busca pública usará `GET /api/mobilibus/linhas?q={consulta}` e devolverá um envelope `{ lines: [...] }` com modelos normalizados da Ótimo/RMBH.
- A consulta pública de horários usará `GET /api/mobilibus/projetos/{projectId}/linhas/{routeId}/horarios` e devolverá um envelope `{ timetable: ... }` normalizado por sentido e serviço planejado.
- O contrato validará método, consulta mínima, `projectId` e `routeId`. A primeira entrega rejeitará projetos fora da Ótimo/RMBH em vez de consultar silenciosamente outra rede.
- O módulo Mobilibus concentrará base externa, construção de paths, timeout, leitura JSON, normalização, cache e tradução de falhas externas. O transporte HTTP será uma dependência substituível para testes.
- O catálogo e os detalhes estáveis usarão cache server-side de 30 minutos. Os horários planejados usarão cache de 5 minutos. Uma resposta ainda válida poderá continuar sendo usada durante uma falha externa; dados expirados não serão apresentados como atuais silenciosamente.
- Uma falha Mobilibus produzirá erro apenas na experiência metropolitana. Estado, polling, previsões, mapa e favoritos da SIU municipal permanecerão operacionais.
- Os erros Mobilibus usarão o envelope canônico `{ error: { code, message } }` e os status compartilhados pelo contrato HTTP existente.
- A seção `Linhas` terá estados explícitos de entrada inicial, carregamento, resultados, vazio, linha selecionada, carregamento de horários e erro recuperável.
- A apresentação será responsiva e usará controles semânticos, foco visível, nomes acessíveis e mensagens que não dependam somente de cor.
- O ticket 06 do aprofundamento arquitetural não bloqueia esta entrega. A integração não modificará o comportamento ou o transporte SIU além da composição necessária no contrato HTTP.

## Testing Decisions

- Bons testes verificarão comportamento observável nas interfaces públicas. Não afirmarão nomes de helpers privados, ordem interna de normalizadores nem detalhes da implementação do cache.
- O seam principal do servidor será o módulo Mobilibus chamado com transporte HTTP e relógio controlados. Ele cobrirá paths externos, normalização, identidade de linhas, pesquisa por código e nome, cache, expiração, erros HTTP, payload inválido e isolamento entre catálogo e horários.
- O dispatcher será testado com operações Mobilibus fake. Os testes cobrirão sucesso, método inválido, consulta insuficiente, projeto ou rota inválidos, rota desconhecida e tradução de erros para os envelopes canônicos.
- Os adapters Vite e Vercel terão testes leves de compatibilidade que demonstrem a mesma resposta para casos representativos Mobilibus, seguindo o prior art dos testes atuais do contrato HTTP.
- O seam principal do frontend será a aplicação Vue montada com respostas HTTP controladas. Ele cobrirá navegação para `Linhas`, debounce, busca por código e nome, estados de carregamento e vazio, conteúdo dos resultados, seleção, horários agrupados, erro recuperável e preservação do fluxo SIU.
- O seam do mapa Mobilibus será testado com pontos e tiles controlados. Ele cobrirá cálculo de tiles visíveis, troca de área, deduplicação de marcadores, estados de carregamento/vazio/erro, popup acessível e isolamento da camada SIU.
- O seam de partidas Mobilibus será testado com respostas de ponto controladas. Ele cobrirá normalização de partidas atuais e programadas, cache curto, seleção de marcador, estados de carregamento/vazio/erro, nova tentativa e isolamento da camada SIU.
- Testes específicos de apresentação serão adicionados apenas quando um comportamento não puder ser comprovado de forma estável pela aplicação montada. Eles verificarão acessibilidade e estados visíveis, não a estrutura privada dos componentes.
- O cache será testado com relógio fake para comprovar 30 minutos no catálogo, 5 minutos nos horários, 30 minutos nos pontos por tile, 15 segundos nas partidas e ausência de chamadas externas duplicadas durante a validade.
- Os testes não acessarão a Mobilibus real. Amostras mínimas e representativas da pesquisa técnica serão usadas como fixtures locais.
- A linha `2890` no catálogo Ótimo/RMBH e uma resposta de horários com múltiplos sentidos e serviços serão casos de compatibilidade obrigatórios.
- Antes de concluir cada ticket, deverão passar os testes relacionados, a suíte completa, a verificação de tipos e a build de produção.

## Out of Scope

- Substituir a SIU municipal ou migrar o monitoramento municipal para Mobilibus.
- Consultar o projeto Mobilibus da rede BH municipal na busca inicial.
- Misturar linhas e paradas na busca superior existente.
- Persistir a linha selecionada, criar histórico de linhas ou adicionar URLs compartilháveis.
- Interpretar automaticamente qual serviço planejado se aplica ao dia atual.
- Comparar ou migrar para a variante `timetable?v=2`.
- Mostrar veículos metropolitanos no mapa ou criar mapa livre por linha.
- Interpretar ou apresentar `wa` ou campos operacionais ainda não validados pela resposta de partidas.
- Criar uma abstração genérica de fonte de transporte.
- Usar ou versionar o token encontrado no APK.
- Alterar o comportamento visual ou funcional dos fluxos SIU municipais existentes.

## Further Notes

- A pesquisa técnica confirmou o catálogo da Ótimo/RMBH, a linha `2890` e o endpoint de horários planejados sem autenticação.
- O catálogo e os horários podem ser implementados sem concluir antes a separação interna do transporte JSONP da SIU municipal.
- O mapa Mobilibus usará um seam próprio de área visível para comunicar tiles e zoom sem alterar o contrato de exploração manual do mapa SIU. A experiência de ponto selecionado será equivalente à exploração do SIU, mas usará partidas e identidade Mobilibus próprias.
- Antes de iniciar a implementação, as correções revisadas dos tickets 04 e 05 devem ser commitadas para estabelecer uma baseline limpa.
- As decisões duradouras de coexistência das fontes e integração pelo dispatcher compartilhado estão registradas nos ADRs do projeto.
