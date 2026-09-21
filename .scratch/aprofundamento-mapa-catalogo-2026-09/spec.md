# Spec: aprofundamento do mapa e do catálogo metropolitano

**Status:** completed

## Problem Statement

Como passageiro, quero visualizar o mapa municipal e o mapa Ótimo/RMBH sem marcas d’água, com contraste correto e comportamento estável, para confiar na localização de paradas, rotas e veículos.

Hoje os dois módulos Leaflet mantêm partes duplicadas da política de mapa-base e do ciclo de vida do mapa. As URLs de tiles ficam acopladas a um arquivo de apresentação, não há uma política única para provedor, chave, atribuição e estilos, e o provedor CARTO passou a exibir “API KEY REQUIRED” quando a requisição não contém uma chave válida.

Como passageiro que consulta a rede metropolitana, quero pesquisar pontos, selecionar uma parada Ótimo/RMBH, consultar as partidas e salvar favoritos sem perder o estado durante atualizações do mapa, para explorar o catálogo com previsibilidade.

Hoje o módulo raiz concentra cache por tile, deduplicação de requisições, controle de respostas antigas, seleção de ponto, partidas, favoritos e estados de erro. Essa interface larga atravessa o arquivo Vue de apresentação e faz os fluxos do catálogo dependerem de testes de aplicação muito extensos.

## Solution

Aprofundar três áreas relacionadas sem misturar SIU municipal e Mobilibus:

1. criar uma política profunda de mapa-base, usada pelos dois adapters Leaflet, que centralize provedor, estilos, credencial pública restrita, atribuição, zoom e fallback;
2. compartilhar o ciclo Leaflet de montagem, resize, troca de tema e desmontagem, mantendo em cada adapter apenas sua cena, eventos e política de viewport;
3. criar um módulo profundo do catálogo metropolitano que concentre pontos visíveis, seleção, partidas, favoritos, cache, concorrência e estados de erro, deixando a composição visual e a navegação no módulo raiz.

O resultado deve preservar o comportamento público atual, manter os contratos HTTP existentes e respeitar os ADRs que tratam SIU municipal e Mobilibus como fontes complementares.

## User Stories

1. Como passageiro, quero abrir o mapa municipal sem ver a marca d’água “API KEY REQUIRED”, para interpretar o mapa sem ruído visual.
2. Como passageiro, quero abrir o mapa Ótimo/RMBH sem ver a marca d’água “API KEY REQUIRED”, para confiar na mesma qualidade visual nas duas redes.
3. Como passageiro, quero que o mapa claro use um estilo claro e o mapa escuro use um estilo escuro, para manter a leitura dos marcadores em qualquer tema.
4. Como passageiro, quero que a atribuição do provedor cartográfico permaneça visível, para que o uso dos dados respeite as condições do mapa.
5. Como pessoa mantenedora, quero configurar a credencial pública do mapa sem gravá-la no repositório, para evitar exposição acidental e permitir configurações diferentes por ambiente.
6. Como pessoa mantenedora, quero trocar o provedor ou o estilo em um único lugar, para corrigir a política sem procurar URLs duplicadas.
7. Como pessoa desenvolvedora, quero que os dois mapas usem a mesma política de mapa-base, para que uma correção tenha leverage sobre todas as telas.
8. Como passageiro, quero que o mapa continue funcionando ao redimensionar a janela, para que os tiles e os controles acompanhem o novo tamanho.
9. Como passageiro, quero que o mapa seja atualizado depois de abrir ou recolher a navegação lateral, para que não fique com áreas vazias ou tiles deslocados.
10. Como passageiro, quero alternar o tema sem perder o centro, o zoom ou os marcadores atuais, para continuar explorando a mesma área.
11. Como pessoa mantenedora, quero que observers, listeners e instâncias Leaflet sejam desmontados corretamente, para evitar vazamentos e atualizações depois que a tela for fechada.
12. Como pessoa desenvolvedora, quero que o ciclo Leaflet compartilhado seja testado por seus efeitos observáveis, para poder alterar a implementação sem reescrever testes acoplados a detalhes internos.
13. Como passageiro, quero abrir o catálogo Ótimo/RMBH e carregar os pontos da área visível, para encontrar as paradas da rede metropolitana.
14. Como passageiro, quero mover o mapa e carregar somente os tiles necessários à nova área, para explorar a rede sem requisições repetidas desnecessárias.
15. Como passageiro, quero que pontos já carregados sejam reutilizados quando retorno a uma área, para receber resposta rápida e reduzir tráfego.
16. Como passageiro, quero que uma resposta antiga não sobrescreva os pontos da área que estou vendo agora, para não receber dados de uma navegação anterior.
17. Como passageiro, quero ver estados distintos de carregamento, vazio e erro no catálogo, para entender o que está acontecendo.
18. Como passageiro, quero repetir a consulta quando o carregamento dos pontos falhar, para recuperar o catálogo sem recarregar a aplicação.
19. Como passageiro, quero selecionar um ponto no mapa, para consultar os ônibus associados àquela parada.
20. Como passageiro, quero que trocar de ponto invalide a resposta de partidas do ponto anterior, para não misturar redes ou horários.
21. Como passageiro, quero consultar partidas do ponto selecionado, para saber quais ônibus estão previstos ou em operação naquela parada.
22. Como passageiro, quero filtrar as partidas por linha, ônibus ou destino, para encontrar rapidamente o serviço que procuro.
23. Como passageiro, quero repetir a consulta de partidas quando ela falhar, para recuperar a informação sem perder o ponto selecionado.
24. Como passageiro, quero salvar o ponto Ótimo/RMBH selecionado como favorito, para reabrir lugares que consulto com frequência.
25. Como passageiro, quero reabrir um favorito metropolitano mesmo quando ele estiver fora da área carregada, para não depender do viewport atual.
26. Como passageiro, quero que favoritos sejam preservados entre sessões, para não precisar salvar os mesmos pontos novamente.
27. Como pessoa desenvolvedora, quero que o catálogo metropolitano mantenha sua identidade separada da SIU municipal, para não tratar códigos, previsões e partidas incompatíveis como equivalentes.
28. Como pessoa desenvolvedora, quero testar o catálogo por uma interface coesa, para localizar falhas de cache, concorrência, seleção e favoritos em um único seam.
29. Como pessoa mantenedora, quero que o módulo raiz apenas componha navegação e apresentação, para concentrar as regras do catálogo em um lugar com locality.
30. Como pessoa mantenedora, quero manter a suíte completa, a verificação de tipos e a build verdes, para reduzir o risco de regressão durante o aprofundamento.

## Implementation Decisions

- O trabalho cobre os candidatos de política de mapa-base, ciclo Leaflet compartilhado e catálogo metropolitano. O workspace de monitoramento fica fora desta iniciativa.
- A política de mapa-base será um module profundo consumido pelos dois adapters Leaflet. Ela esconderá a escolha de provedor, estilos claro e escuro, credencial pública, atribuição, subdomínios, zoom máximo e eventual fallback.
- A credencial do provedor será fornecida por configuração de ambiente apropriada e nunca será adicionada ao repositório. Se o provedor CARTO continuar sendo usado, a chave deverá ser restrita aos ambientes autorizados e acompanhar a atribuição exigida.
- A correção deve eliminar a marca d’água em desenvolvimento e produção. Uma troca de provedor só será feita se a configuração escolhida não oferecer uma forma operacionalmente segura de servir os tiles.
- O ciclo Leaflet compartilhado ficará atrás de um seam real porque existem dois adapters que montam mapas. O module esconderá montagem, resize, listeners, troca da camada base, invalidation e desmontagem.
- Os adapters dos mapas continuarão responsáveis por dados de domínio, marcadores, popups, rota, veículos, paradas, eventos e decisões específicas de viewport. Não haverá tentativa de unificar SIU municipal e Mobilibus.
- A política de mapa-base será concluída antes do compartilhamento do ciclo Leaflet, porque o segundo seam deverá consumir a política já centralizada.
- O catálogo metropolitano será um module profundo que concentrará estado e transições de pontos visíveis, cache por tile, deduplicação de requisições, versões contra respostas antigas, seleção de ponto, partidas, favoritos e estados de carregamento, vazio e erro.
- O módulo do catálogo receberá adapters substituíveis para transporte Mobilibus e persistência de favoritos. A produção continuará usando os adapters atuais; os testes usarão adapters controlados em memória.
- O estado de uma consulta de pontos será associado à lista de tiles visíveis mais recente. Respostas de uma versão anterior não poderão alterar o estado atual.
- O estado de uma consulta de partidas será associado ao ponto selecionado mais recente e à versão da requisição. Selecionar outro ponto ou desmontar a tela invalidará a resposta anterior.
- O módulo de apresentação do catálogo receberá somente o estado que precisa renderizar e emitirá ações do usuário. Cache, concorrência, persistência e tradução de erros não ficarão espalhados na apresentação.
- A composição raiz continuará controlando a navegação entre seções e o tema global, mas não manterá a implementação detalhada do catálogo.
- A identidade Ótimo/RMBH, o projeto Mobilibus e os tipos de ponto, linha, partida e horário planejado continuarão distintos dos tipos SIU municipal.
- O contrato HTTP existente, as rotas públicas, os envelopes de resposta e o middleware local permanecerão inalterados.
- O browser continuará consumindo somente o contrato interno em /api/*; nenhuma chamada direta à SIU será introduzida.
- O aprofundamento deve preferir a remoção de estado duplicado e o encolhimento da interface dos adapters. Criar um module que apenas repasse argumentos não atende ao objetivo de depth.
- A decisão sobre o mapa-base deverá atualizar a decisão estável correspondente, registrando provedor, credencial, atribuição e limitações de uso.

## Testing Decisions

- Bons testes atravessam a interface do module e verificam comportamento observável. Não devem afirmar nomes de helpers privados, ordem de chamadas internas ou estrutura acidental da implementação.
- A política de mapa-base será testada sem rede real, verificando que os estilos claro e escuro produzem configurações completas, que a credencial é incorporada somente quando configurada e que a atribuição permanece disponível.
- Os dois adapters Leaflet serão testados por montagem e desmontagem, troca de tema, resize e manutenção dos marcadores relevantes. O teste deve detectar ausência de camada base válida ou listeners que permaneçam após a desmontagem.
- O módulo do catálogo será testado por uma interface única cobrindo carregamento de tiles, deduplicação, cache, mudança de viewport, respostas antigas, estados de erro, retry e seleção de ponto.
- O mesmo módulo será testado para partidas, filtro, retry, troca de ponto, descarte de resposta antiga e estados vazio e erro.
- O mesmo seam será usado para favoritos, incluindo inclusão, remoção, persistência e abertura de um ponto fora da área atualmente carregada.
- Um pequeno conjunto de testes de integração da aplicação comprovará que a navegação abre o catálogo, que os adapters recebem o estado correto e que uma falha Mobilibus não interrompe o monitoramento SIU.
- O prior art inclui os testes dos mapas, os testes de cliente Mobilibus, os testes de persistência de favoritos, os testes do monitoramento de previsões e os testes de integração da aplicação.
- A conclusão de cada ticket exige testes relacionados; a conclusão da iniciativa exige suíte completa, verificação de tipos, build de produção e conferência do diff.

## Out of Scope

- Unificar SIU municipal e Mobilibus em um único modelo de domínio.
- Alterar a semântica de cod e siu, os identificadores Mobilibus ou os contratos HTTP existentes.
- Adicionar novas fontes de transporte, novas rotas públicas ou novos formatos de resposta.
- Criar histórico de partidas, novas regras de alerta ou novas funcionalidades de favoritos além da preservação do comportamento atual.
- Alterar a regra específica da linha 8350.
- Implementar o padrão mobile de Mostrar pontos descrito em outra iniciativa.
- Redesenhar a identidade visual, o bottom sheet ou a navegação geral do produto.
- Adicionar chamadas diretas do browser à SIU ou remover o middleware local do Vite.
- Resolver problemas de desempenho que não estejam relacionados ao cache, à deduplicação e às respostas antigas dos tiles e partidas.
- Introduzir um segundo module genérico para cada pequena função sem evidência de depth, leverage e locality.

## Further Notes

- O candidato de mapa-base é a primeira frente recomendada porque corrige uma falha visível e já possui dois consumidores reais.
- O ciclo Leaflet fica bloqueado pela política de mapa-base para evitar dois refactors concorrentes nos mesmos adapters e para consumir um seam já definido.
- O aprofundamento do catálogo pode iniciar independentemente dos dois tickets de mapa; ele preservará o mapa atual enquanto concentra o estado do domínio metropolitano.
- O ticket de partidas e favoritos depende do ticket de pontos porque reutiliza a seleção, o estado de pontos e o módulo do catálogo criado nessa primeira fatia.
- Nenhuma decisão desta spec contradiz os ADRs existentes. A arquitetura continua tratando SIU municipal e Mobilibus como fontes complementares e mantém um dispatcher HTTP compartilhado.
