# Spec: aprofundamento arquitetural do Ônibus BH

**Status:** ready-for-agent

## Problem Statement

Como usuário do Ônibus BH, preciso que o monitoramento, o mapa, a seleção de paradas e as consultas de transporte continuem previsíveis enquanto o produto evolui. Hoje esses comportamentos funcionam, mas regras importantes estão concentradas em componentes grandes ou duplicadas entre ambientes. Isso aumenta o risco de regressões visíveis, como alertas repetidos, seleção perdida após uma atualização, mapa recentrado sem intenção, divergência entre desenvolvimento e produção ou falhas difíceis de diagnosticar na integração com a SIU.

## Solution

Aprofundar os módulos que sustentam a experiência atual, concentrando regras complexas atrás de interfaces pequenas e testáveis. O componente principal ficará responsável pela composição da tela; o mapa receberá uma cena e comandos declarativos; Vite e Vercel compartilharão o mesmo contrato HTTP; seleção, busca e favoritos serão tratados como uma capacidade coesa; e a integração SIU separará transporte JSONP das operações de domínio.

A solução deve preservar o comportamento externo atual, as decisões estáveis do produto e os contratos públicos existentes. O ganho esperado é permitir que melhorias futuras sejam implementadas com menor risco e que falhas sejam cobertas nos seams mais altos possíveis.

## User Stories

1. Como passageiro, quero que as previsões continuem sendo atualizadas automaticamente, para acompanhar a aproximação do ônibus sem recarregar a página.
2. Como passageiro, quero que uma parada selecionada continue sendo consultada mesmo quando os alertas estiverem pausados, para ainda visualizar suas previsões.
3. Como passageiro, quero que o aplicativo ignore respostas antigas depois que eu trocar de parada, para não ver dados da parada anterior.
4. Como passageiro, quero que o aplicativo ignore respostas antigas depois que eu alterar a configuração do alerta, para não receber uma notificação incorreta.
5. Como passageiro, quero que consultas sobrepostas sejam evitadas, para que o estado exibido não oscile entre respostas concorrentes.
6. Como passageiro, quero que uma consulta seja retomada ao voltar para a aba ou janela, para receber informações atualizadas imediatamente.
7. Como passageiro, quero que falhas temporárias não interrompam definitivamente o ciclo de atualização, para que o aplicativo se recupere sozinho.
8. Como passageiro, quero ver um estado de carregamento coerente durante a consulta, para entender que os dados estão sendo atualizados.
9. Como passageiro, quero ver uma mensagem de erro coerente quando a consulta falhar, para saber que as previsões atuais não estão disponíveis.
10. Como passageiro, quero que previsões obsoletas sejam removidas após uma falha relevante, para não confundi-las com dados atuais.
11. Como passageiro, quero que a previsão selecionada seja preservada entre atualizações quando ainda representar o mesmo ônibus ou serviço, para continuar acompanhando minha escolha.
12. Como passageiro, quero que uma previsão equivalente seja reconhecida mesmo quando seu identificador de apresentação mudar, para que a seleção não desapareça indevidamente.
13. Como passageiro, quero que uma previsão válida seja selecionada como alternativa quando a anterior desaparecer, para manter o mapa útil.
14. Como passageiro, quero receber no máximo uma notificação para a mesma previsão, para evitar alertas repetidos.
15. Como passageiro, quero que apenas previsões finitas participem das regras de chegada, para não receber alertas sobre horários programados sem estimativa.
16. Como passageiro, quero que o status do monitoramento represente o resultado real da regra de alerta, para entender se o ônibus está próximo, distante, já notificado ou fora do filtro.
17. Como passageiro, quero que a rota e os veículos sejam atualizados conforme a previsão selecionada, para acompanhar o ônibus correto no mapa.
18. Como passageiro, quero buscar paradas por endereço, código interno ou código público, para encontrar rapidamente meu ponto.
19. Como passageiro, quero que a parada monitorada seja resolvida entre paradas próximas, uma seleção preservada ou favoritos, para que ela não desapareça quando a área do mapa mudar.
20. Como passageiro, quero selecionar uma parada pelos resultados da busca ou pelo mapa, para iniciar o monitoramento pelo caminho mais conveniente.
21. Como passageiro, quero salvar e remover uma parada favorita, para acessar novamente os pontos que uso com frequência.
22. Como passageiro, quero abrir uma parada favorita mesmo quando ela não estiver entre as paradas próximas carregadas, para recuperar um ponto salvo em outra região.
23. Como passageiro, quero que a busca seja limpa e a tela de monitoramento seja aberta ao selecionar uma parada, para receber retorno imediato da ação.
24. Como passageiro, quero que o mapa mantenha a parada monitorada visível quando eu ocultar as paradas próximas, para não perder meu ponto de referência.
25. Como passageiro, quero que apenas o veículo escolhido seja destacado quando eu selecionar uma previsão, para reduzir o ruído visual.
26. Como passageiro, quero ver no destaque do mapa a linha e os minutos estimados, para reconhecer a informação relevante sem expor o identificador técnico do veículo.
27. Como passageiro, quero que rota, paradas, veículos e localização continuem com os marcadores e estilos definidos pelo produto, para manter a experiência visual consistente.
28. Como passageiro, quero que o mapa enquadre automaticamente apenas mudanças estruturais relevantes, para que atualizações frequentes não interrompam minha navegação.
29. Como passageiro, quero mover e explorar o mapa sem que um evento programático seja tratado como uma busca manual, para evitar consultas inesperadas.
30. Como passageiro, quero que o modo claro e escuro continuem usando os tiles correspondentes, para manter contraste e legibilidade.
31. Como pessoa desenvolvedora, quero que o ambiente local e a produção executem o mesmo contrato HTTP, para eliminar divergências de validação, resposta e erro.
32. Como pessoa desenvolvedora, quero que cada rota valide método e parâmetros de forma centralizada, para corrigir regras em um único lugar.
33. Como pessoa desenvolvedora, quero que todas as respostas de sucesso e erro tenham envelopes consistentes nos dois runtimes, para que o cliente tenha um contrato confiável.
34. Como pessoa desenvolvedora, quero trocar adapters Vite ou Vercel sem reimplementar regras de rota, para manter os adapters pequenos.
35. Como pessoa desenvolvedora, quero testar uma requisição até a resposta canônica sem iniciar servidores reais, para cobrir o contrato com rapidez e determinismo.
36. Como pessoa desenvolvedora, quero substituir o transporte JSONP por um fake nos testes, para validar operações SIU sem mock global de rede.
37. Como pessoa desenvolvedora, quero que construção de paths, codificação de parâmetros e escolha do normalizador pertençam às operações SIU, para localizar as regras de integração.
38. Como pessoa desenvolvedora, quero que timeout, falhas HTTP, parsing JSONP e tradução de erros pertençam ao transporte, para diagnosticar falhas externas em um único lugar.
39. Como pessoa mantenedora, quero que cada módulo profundo tenha uma interface pequena, para entender e alterar regras sem percorrer componentes ou handlers inteiros.
40. Como pessoa mantenedora, quero preservar `cod` para consultas e `siu` para apresentação, para não quebrar a integração de previsões nem a experiência do usuário.
41. Como pessoa mantenedora, quero preservar a regra específica de variantes da linha `8350`, para manter os alertas de negócio corretos.
42. Como pessoa mantenedora, quero que a suíte continue cobrindo os comportamentos atuais durante cada extração, para que cada ticket possa ser integrado de forma independente.

## Implementation Decisions

- O trabalho abrange as cinco oportunidades da revisão: monitoramento de previsões e alertas; cena e política de viewport do mapa; contrato HTTP local/Vercel; seleção, busca e favoritos de paradas; e separação entre transporte SIU e operações de domínio.
- O componente principal será reduzido a composição de estado de tela, renderização e encaminhamento de ações. Regras de ciclo de atualização, concorrência, staleness, deduplicação, seleção preservada e status não permanecerão espalhadas no componente.
- O módulo de monitoramento receberá dependências substituíveis para buscar previsões, notificar, obter o horário e agendar ciclos. Sua interface pública oferecerá comandos de ciclo de vida e atualização, além de um estado observável consumido pela camada Vue.
- A existência de uma parada configurada controla a consulta de previsões; a ativação do alerta controla apenas a avaliação e o envio de notificações. Assim, alertas pausados não interrompem a visualização das previsões.
- O monitoramento impedirá consultas sobrepostas, descartará resultados incompatíveis com o snapshot que originou a consulta, continuará agendando ciclos após falhas e retomará imediatamente em eventos de foco, exibição de página e retorno de visibilidade.
- A preservação da previsão selecionada priorizará o identificador atual, depois a identidade estável de veículo e serviço, depois uma equivalência de serviço, linha e destino. Se não houver correspondência, poderá selecionar a primeira previsão disponível.
- O carregamento de rota e veículos continuará protegido contra respostas obsoletas e será acionado a partir do resultado aceito do monitoramento ou da seleção explícita de uma previsão.
- Seleção de parada, busca e favoritos formarão um módulo coeso. Ele resolverá a parada monitorada entre paradas próximas, snapshot da seleção e favoritos persistidos, além de expor comandos para buscar, selecionar, favoritar e remover.
- A seleção de uma parada continuará limpando a previsão selecionada, atualizando o `cod` usado pela consulta, limpando a busca, navegando para o monitoramento e solicitando atualização imediata.
- O mapa terá internamente dois módulos: uma cena declarativa, que transforma dados de domínio em elementos visuais, e uma política de viewport, que transforma estado e eventos em comandos. Eles compartilharão uma única fachada de comportamento para limitar a quantidade de seams públicos.
- A cena declarativa representará paradas, parada monitorada, localização, rota, veículos visíveis, labels e bounds sem tipos do Leaflet. A regra de normalização visual de textos permanecerá na apresentação.
- A política de viewport decidirá entre manter a visão, enquadrar bounds, usar a visão padrão ou emitir mudança manual de área. Ela distinguirá ações programáticas de movimentos do usuário e não reenquadrará o mapa por polling de veículos.
- O componente Vue do mapa será um adapter fino: traduzirá a cena e os comandos para Leaflet, conectará eventos e administrará apenas o ciclo de vida do mapa e de seus recursos.
- Um dispatcher compartilhado será a fonte única do contrato de todas as rotas públicas. Ele centralizará reconhecimento de rota, método, parâmetros, validação, envelopes de sucesso, respostas de método não permitido e tradução de erros.
- Vite e Vercel serão adapters do dispatcher e não duplicarão regras de negócio ou contratos HTTP. O middleware local será preservado como parte obrigatória da experiência de desenvolvimento.
- Os endpoints, métodos, parâmetros, códigos de status e formatos de resposta existentes serão preservados. Não haverá migração de schema nem mudança intencional do contrato consumido pelo browser.
- A integração SIU será dividida entre um transporte `requestJsonp`, responsável por rede, timeout, parsing e erros upstream, e operações que constroem paths, codificam parâmetros e escolhem o normalizador adequado.
- A ordem longitude/latitude usada na consulta de paradas próximas será preservada. A codificação de coordenadas não será alterada sem validação do ambiente de desenvolvimento.
- As operações continuarão devolvendo os tipos internos normalizados. O browser continuará consumindo exclusivamente `/api/*`.
- A classificação especial da linha `8350`, a distinção entre `cod` e `siu`, os ids únicos de partidas programadas e todas as decisões visuais estáveis serão preservados.
- Cada extração será integrada de forma incremental e deverá manter testes, verificação de tipos e build verdes antes do próximo passo dependente.

## Testing Decisions

- Bons testes verificarão comportamento observável nas interfaces públicas dos módulos e adapters. Não deverão afirmar a sequência de helpers internos, nomes privados ou detalhes acidentais de implementação.
- O seam principal do frontend será a aplicação Vue montada com dependências externas controladas. Ele cobrirá polling, retomada, concorrência, descarte de respostas obsoletas, estados visíveis, notificações, seleção de previsões, busca, parada monitorada e favoritos.
- Os testes existentes da aplicação são o prior art para fluxos completos com timers falsos, respostas HTTP controladas, armazenamento local e eventos do browser.
- O seam do mapa será uma fachada pura que recebe dados de domínio e eventos e devolve cena declarativa e comandos de viewport. Ele cobrirá visibilidade de paradas e veículos, labels, bounds, visão padrão, enquadramento estrutural, ausência de reenquadramento por polling e distinção entre movimentos programáticos e manuais.
- Os testes existentes do mapa serão mantidos como integração leve do adapter Vue/Leaflet, cobrindo montagem, eventos relevantes, tiles, estilos essenciais e execução básica da cena.
- O seam do servidor receberá uma requisição neutra e um transporte JSONP substituível e devolverá a resposta HTTP canônica. Ele cobrirá todos os endpoints nos cenários de sucesso, método inválido, parâmetro inválido, rota desconhecida, erro upstream e timeout.
- Os testes existentes do roteador local, parser JSONP e normalizadores são o prior art para o seam do servidor. Testes específicos de Vite e Vercel deverão limitar-se à tradução entre seus objetos de runtime e o dispatcher.
- A suíte deverá incluir testes de compatibilidade que demonstrem respostas equivalentes nos adapters local e Vercel para o mesmo caso de uso.
- Cada ticket deverá executar os testes relacionados à sua fatia; antes de concluir o conjunto, deverão passar a suíte completa, a verificação de tipos e a build de produção.

## Out of Scope

- Criar Web Push, Service Worker ou notificações com o aplicativo fechado.
- Adicionar histórico persistente de alertas ou novas funcionalidades para favoritos.
- Redesenhar a interface, alterar a paleta, trocar tiles ou modificar os estados do bottom sheet.
- Adicionar novas fontes de transporte ou substituir a SIU.
- Alterar o contrato público dos endpoints, os tipos de domínio ou o formato persistido das configurações sem necessidade comprovada durante a implementação.
- Remover o middleware local do Vite ou permitir chamadas diretas do browser à SIU.
- Mudar a regra de variantes da linha `8350`, a semântica de `cod` e `siu` ou a identidade de previsões programadas.
- Otimizações de desempenho sem evidência de regressão ou necessidade para viabilizar as extrações.

## Further Notes

- A revisão arquitetural identificou o monitoramento como a oportunidade de maior impacto imediato, seguida pelo contrato HTTP quando o foco é produção e pelo mapa quando o foco é experiência cartográfica.
- As extrações de monitoramento, mapa e servidor podem formar três frentes iniciais independentes. Seleção de paradas deve seguir a estabilização do monitoramento; política de viewport deve seguir a cena declarativa; e operações SIU devem seguir o contrato HTTP compartilhado.
- Não há ADR formal em conflito com esta spec. As decisões estáveis existentes são tratadas como restrições de compatibilidade.
- O worktree já continha alterações não relacionadas antes desta spec; a implementação deverá preservá-las.
