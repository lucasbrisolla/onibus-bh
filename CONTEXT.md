# Ônibus BH

Este contexto reúne os conceitos usados para consultar e apresentar transporte público municipal de Belo Horizonte e metropolitano da RMBH sem confundir sistemas, identidades ou natureza dos dados.

## Sistemas de transporte

**Fonte de transporte**:
Sistema externo que fornece dados de uma rede de transporte e determina a identidade e a semântica desses dados.
_Evitar_: provedor, origem

**SIU municipal**:
Fonte de transporte do fluxo municipal atual de Belo Horizonte, incluindo paradas, previsões, itinerários e veículos.
_Evitar_: SIU, municipal

**Mobilibus**:
Fonte de transporte complementar que organiza redes distintas em projetos e permite consultar catálogo, horários, paradas e partidas.
_Evitar_: Mobiibus, Bus2

**Ótimo/RMBH**:
Rede metropolitana atendida pela primeira integração Mobilibus, distinta da rede municipal de Belo Horizonte.
_Evitar_: Mobilibus metropolitano, projeto 501

**BH municipal**:
Rede de transporte municipal de Belo Horizonte atendida atualmente pela SIU municipal.
_Evitar_: projeto 603, municipal

**Catálogo metropolitano**:
Conjunto pesquisável de linhas pertencentes à rede Ótimo/RMBH.
_Evitar_: lista da Mobilibus, catálogo 501

## Informações ao passageiro

**Linha Mobilibus**:
Linha identificada pela combinação entre seu projeto Mobilibus e sua identidade de rota; o código público não é identidade suficiente.
_Evitar_: linha SIU, linha pelo shortName

**Código público da linha**:
Identificador curto apresentado ao passageiro, como `2890`, que pode se repetir entre redes diferentes.
_Evitar_: identidade da linha, routeId

**Tarifa informada**:
Valor de passagem fornecido pela fonte de transporte para uma linha, apresentado somente quando disponível e sem assumir que substitui a confirmação operacional.
_Evitar_: preço garantido, tarifa atual

**Sentido**:
Direção operacional que organiza os serviços e horários planejados de uma linha.
_Evitar_: destino, itinerário

**Serviço planejado**:
Grupo nomeado de partidas de uma linha em determinado sentido, apresentado sem inferir sua validade para o dia atual enquanto o calendário não estiver confirmado.
_Evitar_: serviço atual, previsão

**Horário planejado**:
Partida prevista pela programação operacional de uma linha, sem afirmar a posição atual de um veículo.
_Evitar_: previsão, tempo real

**Previsão em tempo real**:
Estimativa atualizada de chegada ou partida associada à operação corrente de uma linha.
_Evitar_: horário, grade, horário planejado
