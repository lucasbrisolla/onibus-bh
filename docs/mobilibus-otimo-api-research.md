# Pesquisa das APIs Mobilibus, Bus2, Ótimo e SIU

Documento de retomada técnica para mapear as APIs úteis ao projeto **Ônibus BH**.

Última atualização desta pesquisa: **13 de julho de 2026**.

## Resumo executivo

Foram encontradas duas famílias de APIs úteis:

1. **SIU Mobile BH**, já usada pelo app atual para previsões, paradas próximas, itinerários e veículos em tempo real.
2. **Mobilibus/Bus2**, descoberta a partir do APK do Ótimo+APP e do site Bus2, útil para catálogo de linhas, projetos, tabela horária, alertas, paradas por tile e previsões por parada.

O ponto mais importante da investigação é que **Belo Horizonte municipal** e **Região Metropolitana de Belo Horizonte** são projetos diferentes na Mobilibus:

| Projeto | `projectId` | Uso provável | Exemplo de linha |
| --- | ---: | --- | --- |
| Belo Horizonte, MG | `603` | Sistema municipal BH/SUMOB | `8350` |
| Região Metropolitana de Belo Horizonte, MG | `501` | Ótimo/metropolitano RMBH | `2890` |

Isso explica por que a linha `2890` não aparece no projeto `603`, mas aparece corretamente no projeto `501` como:

```json
{
  "routeId": 572385,
  "agencyId": 39568,
  "shortName": "2890",
  "longName": "Morada Nova / Pindorama / Cidade Industrial",
  "price": 8.45
}
```

## Fontes primárias usadas

### APK do Ótimo+APP

Arquivo inspecionado:

```text
research-local/apks/otimo-app-4.2.87.apk
```

Comandos usados:

```sh
file research-local/apks/otimo-app-4.2.87.apk
unzip -l research-local/apks/otimo-app-4.2.87.apk
strings research-local/apks/otimo-app-4.2.87.apk
unzip -p research-local/apks/otimo-app-4.2.87.apk lib/arm64-v8a/libapp.so | strings
unzip -p research-local/apks/otimo-app-4.2.87.apk assets/flutter_assets/assets/languages/portugues_br.json
```

Achados do APK:

- O APK é válido e contém app Flutter.
- Pacote Android encontrado em strings Java/Kotlin: `br.com.otimoonline.app`.
- O app usa `libapp.so` e `libflutter.so`; portanto strings de negócio importantes aparecem no snapshot nativo Flutter.
- O código Flutter parece vir de um projeto chamado internamente `floripa_no_ponto`, mas aplicado à marca Ótimo/Bus2.
- O APK contém textos de interface para:
  - pontos próximos;
  - horários;
  - favoritos;
  - planejamento de viagem;
  - aviso de embarque;
  - veículo chegando;
  - previsões em tempo real;
  - acessibilidade;
  - recarga, embora recarga esteja desabilitada no projeto metropolitano pelo `project-details`.

Strings relevantes encontradas no binário:

```text
https://mobilibus.com/api/
https://mobilibus.com/api/projects?charter=false
https://mobilibus.com/api/project-details?project_id=
https://gateway.mobilibus.com/prodata/501/
https://editor.mobilibus.com/web/bus2you/
http://app.mobilibus.com/otimo
https://blog.mobilibus.com/manual
https://blog.mobilibus.com/privacy
https://play.google.com/store/apps/details?id=br.com.otimoonline.app
routes?project_id=
timetable?project_id=
timetable?v=2&project_id=
timetable-by-stop?project_id=
stops?project_id=
departures?stop_id=
alerts?project_id=
points-of-sale?project_id=
trip-details?trip_id=
/otp/routers/default/plan
x-mob-phone-gps-latitude
x-mob-phone-gps-longitude
```

Classes/nomes internos relevantes encontrados:

```text
StopsInViewMapServices
getStopsInViewUrl
TimetableByStopServices
TimeTableServices
DeparturesServices
getDepartures
getTimetable
getTimetableByStop
get timetable by routeId
listCurrentTrips
getTripDetails
MOBDeparture
MOBDepartures
MOBDepartureTrip
MOBTrip
MOBTripDetails
MOBTripDetailsStop
MOBTripDetailsVehicle
ControllerMap.stops
ControllerMap.isErroInGetStops
```

### Site Bus2

Página analisada:

```text
https://bus2.mobilibus.com.br/mg/regiao-metropolitana/
```

O site é uma página institucional/landing page do Bus2 para a Região Metropolitana de Belo Horizonte. Ela não é a API em si, mas confirma o produto Bus2 para a região e descreve recursos como:

- tabela horária;
- mapa com pontos de parada;
- localização em tempo real dos veículos;
- previsões de chegada em pontos;
- planejamento de deslocamento;
- favoritos;
- alertas quando o ônibus está próximo.

Trecho relevante do conteúdo da página:

```text
Região Metropolitana de Belo Horizonte
O Bus2 tem tudo o que você precisa saber sobre o transporte público na Região Metropolitana de Belo Horizonte, Minas Gerais.
Consulte a tabela horária e veja no mapa os pontos de parada e a localização em tempo real dos veículos.
```

### Código atual do projeto Ônibus BH

Arquivos relevantes:

```text
src/server/siuClient.ts
src/server/normalizers.ts
src/services/apiClient.ts
api/linhas.ts
api/paradas/[cod]/previsoes.ts
api/paradas/proximas.ts
api/itinerarios/[cod]/index.ts
api/itinerarios/[cod]/veiculos.ts
```

O app atual usa SIU Mobile BH via server-side, nunca diretamente no browser.

## APIs SIU Mobile BH

Base atual do projeto:

```ts
export const SIU_BASE_URL =
  'http://bhz.siumobile.com.br:6060/siumobiletacomapp/siumobile-ws-v01/rest/ws';
```

### Endpoints SIU já usados pelo app

#### Linhas

```text
GET http://bhz.siumobile.com.br:6060/siumobiletacomapp/siumobile-ws-v01/rest/ws/buscarLinhas/jsonpCallback
```

Função atual:

```ts
getLines()
```

Retorno: JSONP. Exemplo parcial do corpo:

```text
jsonpCallback({"sucesso":true,"linhas":["{'cod':'833','sgl':'10','nom':'CIRCULAR NOTURNO','praca':'BHZ'}, ..."]})
```

Formato lógico por linha:

```json
{
  "cod": "833",
  "sgl": "10",
  "nom": "CIRCULAR NOTURNO",
  "praca": "BHZ"
}
```

Observações:

- `sgl` é o código público da linha.
- `nom` é a descrição/nome da linha.
- `cod` é o código interno da linha na SIU.
- A resposta vem dentro de um array de strings, cada string contendo objetos em formato quase JSON com aspas simples.

Resultado da busca por `2890` na SIU:

- Não foi encontrado `sgl: '2890'` no endpoint de linhas SIU BH.
- Também não apareceu variação contendo `289`.

Linhas com `Cidade Industrial` ou `CID.INDUSTRIAL` encontradas na SIU:

```text
401  - METRO CID.INDUSTRIAL/S.MARIA
402  - METRO CID.INDUSTRIAL/CAMARGOS
301  - EST. DIAMANTE/NOVO STA CECÍLIA VIA BR INDUSTRIAL
6030 - CIDADE ADMINISTRATIVA/SAVASSI - VIA HOSPITAIS
6031 - CIDADE ADMINISTRATIVA/CENTRO
```

Conclusão: a SIU municipal BH não é a fonte da linha metropolitana `2890`.

#### Previsões por parada

```text
GET /V3/buscarPrevisoes/{stopCode}/false/0/BHZ/retornoJSON
```

Função atual:

```ts
getStopPredictions(stopCode)
```

Uso no app:

```text
/api/paradas/{cod}/previsoes
```

Regra importante:

- O app consulta previsões usando `cod` da parada SIU.
- A UI mostra `siu` quando existir.

#### Paradas próximas

```text
GET /V3/buscarParadasProximas/{longitude}/{latitude}/0/BHZ/retornoJSONH
```

Função atual:

```ts
getNearbyStops(latitude, longitude)
```

Uso no app:

```text
/api/paradas/proximas?lat={latitude}&lng={longitude}
```

Regra importante no código atual:

- O frontend codifica pontos decimais nas coordenadas como `%2E`.
- Não desfazer isso sem validar `npm run dev`.

#### Itinerário por serviço/itinerário

```text
GET /V3/buscarItinerario/{serviceId}/0/BHZ/retornoJSONItinerario
```

Função atual:

```ts
getRoutePoints(serviceId)
```

Uso no app:

```text
/api/itinerarios/{cod}
```

#### Veículos por serviço/itinerário

```text
GET /V3/retornaVeiculosMapa/{serviceId}/0/BHZ/retornoJSONVeiculos
```

Função atual:

```ts
getVehicles(serviceId)
```

Uso no app:

```text
/api/itinerarios/{cod}/veiculos
```

## APIs Mobilibus/Bus2

### Base global

```text
https://mobilibus.com/api/
```

Base operacional apontada pelos projetos BH/RMBH:

```text
https://ss7u5urlxs.singularcdn.net.br/api/
```

As duas bases responderam em testes de leitura para endpoints como `project-details`, `routes`, `timetable` e `alerts`.

### Token Bearer embutido no APK

Foi encontrada uma string `Authorization: Bearer ...` no binário Flutter.

Por segurança, o token completo não deve ser copiado para a documentação do projeto. Ele parece ser um token estático de app, não um token de usuário, mas ainda é uma credencial e não deve ser versionada.

Importante: os endpoints de leitura testados abaixo funcionaram **sem** usar esse token.

### Projetos Mobilibus

#### Listar projetos

```text
GET https://mobilibus.com/api/projects?charter=false
```

Retorno: array de projetos.

Campos observados:

```json
{
  "projectId": 603,
  "name": "Belo Horizonte, MG",
  "city": "Belo Horizonte, MG",
  "country": "Brazil",
  "code": "br",
  "images": {}
}
```

Projetos relevantes encontrados:

```json
[
  {
    "projectId": 603,
    "name": "Belo Horizonte",
    "city": "Belo Horizonte",
    "country": "Brazil",
    "code": "br"
  },
  {
    "projectId": 603,
    "name": "Belo Horizonte, MG",
    "city": "Belo Horizonte, MG",
    "country": "Brazil",
    "code": "br"
  },
  {
    "projectId": 501,
    "name": "Região Metropolitana de Belo Horizonte, MG",
    "city": "Região Metropolitana de Belo Horizonte, MG",
    "country": "Brazil",
    "code": "br"
  }
]
```

Observações:

- O projeto `603` aparece duplicado com nomes levemente diferentes.
- A linha `2890` está no projeto `501`, não no `603`.
- O site `https://bus2.mobilibus.com.br/mg/regiao-metropolitana/` corresponde ao contexto do projeto `501`.

### Detalhes de projeto

#### Projeto 501: Região Metropolitana de Belo Horizonte

```text
GET https://mobilibus.com/api/project-details?project_id=501
GET https://ss7u5urlxs.singularcdn.net.br/api/project-details?project_id=501
```

Retorno observado:

```json
{
  "projectId": 501,
  "name": "Região Metropolitana de Belo Horizonte, MG",
  "city": "Região Metropolitana de Belo Horizonte, MG",
  "apiUri": "https://ss7u5urlxs.singularcdn.net.br/api/",
  "otpUri": "https://otp.mobilibus.com/U70yiTt8ORN1aW",
  "realtimeUpdateFreqSec": 20,
  "realtimeDeparturesOffset": 5,
  "supportAlerts": false,
  "urban": {
    "favorites": true,
    "hideVehicleInfoNextTrip": false,
    "home": true,
    "homeHeader": "OTP",
    "map": true,
    "more": true,
    "otp": true,
    "schedules": true,
    "enabled": true
  },
  "agencies": [
    {
      "agencyId": 39568,
      "name": "Consórcio Ótimo",
      "lat": -19.922,
      "lon": -43.945
    },
    {
      "agencyId": 39570,
      "name": "Consórcio Ótimo - MOVE",
      "lat": -19.922,
      "lon": -43.945
    },
    {
      "agencyId": 41129,
      "name": "Consórcio Ótimo - Municipais",
      "lat": -19.922,
      "lon": -43.945
    }
  ]
}
```

Campos importantes:

- `apiUri`: base operacional.
- `otpUri`: base OpenTripPlanner do projeto.
- `realtimeUpdateFreqSec`: frequência sugerida para atualização em tempo real, `20` segundos.
- `realtimeDeparturesOffset`: offset de partidas em tempo real, `5` no projeto metropolitano.
- `supportAlerts`: `false` no projeto metropolitano.
- `urban.otp`: `true`, indicando suporte a planejamento OTP.
- `agencies`: identifica Consórcio Ótimo e MOVE.

#### Projeto 603: Belo Horizonte municipal

```text
GET https://mobilibus.com/api/project-details?project_id=603
GET https://ss7u5urlxs.singularcdn.net.br/api/project-details?project_id=603
```

Retorno observado:

```json
{
  "projectId": 603,
  "name": "Belo Horizonte, MG",
  "city": "Belo Horizonte, MG",
  "apiUri": "https://ss7u5urlxs.singularcdn.net.br/api/",
  "otpUri": "https://otp.mobilibus.com/Z64D4a6iW4nUGI",
  "realtimeUpdateFreqSec": 20,
  "realtimeDeparturesOffset": 10,
  "supportAlerts": true,
  "urban": {
    "favorites": true,
    "map": true,
    "more": true,
    "schedules": true,
    "enabled": true
  },
  "agencies": [
    {
      "agencyId": 37926,
      "name": "Superintedência de Mobilidade Urbana de Belo Horizonte",
      "lat": -19.921,
      "lon": -43.937
    },
    {
      "agencyId": 39102,
      "name": "Superintedência de Mobilidade Urbana de Belo Horizonte - Suplementar",
      "lat": -19.921,
      "lon": -43.937
    }
  ]
}
```

Campos importantes:

- `supportAlerts`: `true` no municipal.
- `realtimeDeparturesOffset`: `10` no municipal.
- `otpUri` é diferente do projeto `501`.
- `apiUri` é igual ao projeto `501`.

## Rotas Mobilibus

### Endpoint

```text
GET https://ss7u5urlxs.singularcdn.net.br/api/routes?project_id={projectId}
GET https://mobilibus.com/api/routes?project_id={projectId}
```

Retorno: array de rotas.

Formato observado:

```json
{
  "routeId": 572385,
  "agencyId": 39568,
  "shortName": "2890",
  "longName": "Morada Nova / Pindorama / Cidade Industrial",
  "desc": "",
  "type": 3,
  "color": "#ef7d01",
  "textColor": "#FFFFFF",
  "price": 8.45
}
```

Campos:

- `routeId`: identificador interno da rota na Mobilibus.
- `agencyId`: operador/órgão.
- `shortName`: número/código da linha.
- `longName`: nome da linha.
- `desc`: descrição complementar, às vezes vazia ou `null`.
- `type`: tipo GTFS/rota; `3` indica ônibus.
- `color`: cor da linha.
- `textColor`: cor de texto sugerida sobre a cor da linha.
- `price`: tarifa, pode ser `null`.

### Rotas relevantes no projeto 501

Consulta:

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/routes?project_id=501' \
  | jq '[.[] | select(.shortName == "2890" or .shortName == "405R" or .shortName == "515R") ]'
```

Retorno observado:

```json
[
  {
    "routeId": 572171,
    "agencyId": 39570,
    "shortName": "405R",
    "longName": "Terminal São Gabriel / Cidade Industrial",
    "desc": "",
    "type": 3,
    "color": "#592379",
    "textColor": "#FFFFFF",
    "price": 8.95
  },
  {
    "routeId": 571704,
    "agencyId": 39570,
    "shortName": "515R",
    "longName": "Terminal Vilarinho / Cidade Industrial via Anel Rodoviário",
    "desc": "",
    "type": 3,
    "color": "#592379",
    "textColor": "#FFFFFF",
    "price": 8.95
  },
  {
    "routeId": 572385,
    "agencyId": 39568,
    "shortName": "2890",
    "longName": "Morada Nova / Pindorama / Cidade Industrial",
    "desc": "",
    "type": 3,
    "color": "#ef7d01",
    "textColor": "#FFFFFF",
    "price": 8.45
  }
]
```

Resultado importante:

- A linha `2890` existe e retorna `Cidade Industrial`, mas somente no projeto metropolitano `501`.

Outras linhas do projeto `501` com `Cidade Industrial` encontradas na busca:

```text
405R  - Terminal São Gabriel / Cidade Industrial
415R  - Terminal São Benedito / Cidade Industrial
515R  - Terminal Vilarinho / Cidade Industrial via Anel Rodoviário
518R  - Terminal Vilarinho / Cidade Industrial via Carlos Luz
1321  - Mina de Águas Claras / Alameda da Serra / Cidade Industrial
2470  - São José / Cidade Industrial via Centro de Contagem
2480  - São José / Cidade Industrial via Pepsi
2600  - Duque de Caxias / Cidade Industrial via João César
2890  - Morada Nova / Pindorama / Cidade Industrial
3210  - Betim / Cidade Industrial
3211  - Vianópolis / Cidade Industrial
3740  - Tangará / Cidade Industrial
3827  - Nova Lima / Cidade Industrial via CEFET
3828  - Nova Lima / Cidade Industrial via Anel Rodoviário
4830  - Caeté / Cidade Industrial / Barreiro
4900  - Borba Gato / Cidade Industrial
6632  - Ipê Amarelo / Recanto Verde / Cidade Industrial
6640  - Ipê Amarelo / Cidade Industrial
6670  - Novo Retiro / Cidade Industrial
6671  - Topázio / Novo Retiro / Cidade Industrial
6672  - Novo Retiro / Serra Verde / Cidade Industrial
6674  - Novo Retiro / Recanto Verde / Cidade Industrial
6675  - Topázio / Novo Retiro / Recanto Verde / Cidade Industrial
6676  - Novo Retiro / Serra Verde / Recanto Verde / Cidade Industrial
6731  - Icaivera / Morro Alto / Cidade Industrial
6740  - Morro Alto / Cidade Industrial
6750  - Icaivera / Morro Alto / Nazaré / Cidade Industrial
6790  - Recanto Verde / Cidade Industrial via João César
7980  - Makro / Cidade Industrial / Boa Vista
```

### Rotas relevantes no projeto 603

Consulta:

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/routes?project_id=603' \
  | jq '[.[] | select(.shortName == "8350" or .shortName == "6350" or .shortName == "8151" or .shortName == "8550") ]'
```

Retorno observado:

```json
[
  {
    "routeId": 562239,
    "agencyId": 37926,
    "shortName": "6350",
    "longName": "Estação Vilarinho/Estação Barreiro Via Anel Rodoviario",
    "desc": "",
    "type": 3,
    "color": "#BED000",
    "textColor": "#FFFFFF",
    "price": 6.25
  },
  {
    "routeId": 562008,
    "agencyId": 37926,
    "shortName": "8151",
    "longName": "Estação São Gabriel/BH Shopping Via Anel Rodoviario",
    "desc": "",
    "type": 3,
    "color": "#012841",
    "textColor": "#FFFFFF",
    "price": 6.25
  },
  {
    "routeId": 562347,
    "agencyId": 37926,
    "shortName": "8350",
    "longName": "Estação São Gabriel/Estação Barreiro",
    "desc": "",
    "type": 3,
    "color": "#012841",
    "textColor": "#FFFFFF",
    "price": 6.25
  },
  {
    "routeId": 562217,
    "agencyId": 37926,
    "shortName": "8550",
    "longName": "Estação São Gabriel / Zoológico via Estação Pampulha",
    "desc": "",
    "type": 3,
    "color": "#BED000",
    "textColor": "#FFFFFF",
    "price": null
  }
]
```

Resultado importante:

- A `8350` municipal está no projeto `603` com `routeId: 562347`.
- A `2890` não está no projeto `603`.

## Tabela horária Mobilibus

### Endpoint

```text
GET https://ss7u5urlxs.singularcdn.net.br/api/timetable?project_id={projectId}&route_id={routeId}
GET https://ss7u5urlxs.singularcdn.net.br/api/timetable?v=2&project_id={projectId}&route_id={routeId}
```

O endpoint sem `v=2` funcionou em teste. O `v=2` apareceu nas strings do APK, mas ainda precisa ser comparado.

### Exemplo: 8350 municipal

Consulta:

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/timetable?project_id=603&route_id=562347'
```

Retorno: array com um objeto por rota.

Estrutura observada:

```json
[
  {
    "routeId": 562347,
    "shortName": "8350",
    "longName": "Estação São Gabriel/Estação Barreiro",
    "desc": "",
    "type": 3,
    "color": "#012841",
    "textColor": "#FFFFFF",
    "ac": false,
    "price": 6.25,
    "timetable": {
      "directions": [
        {
          "directionId": 0,
          "desc": "Ida",
          "services": [
            {
              "serviceId": 307679,
              "desc": "Dias Úteis Convencional",
              "days": [false, true, true, true, true, true, false],
              "departures": [
                {
                  "dep": "00:30",
                  "arr": "01:26",
                  "wa": 0,
                  "seq": 1
                }
              ]
            }
          ]
        }
      ],
      "trips": []
    }
  }
]
```

Campos relevantes:

- `timetable.directions[].directionId`: sentido.
- `timetable.directions[].desc`: descrição do sentido, como `Ida`.
- `services[].serviceId`: identificador do serviço de calendário.
- `services[].desc`: tipo de dia, como `Dias Úteis Convencional`.
- `services[].days`: array booleano por dia da semana. Pela amostra, parece `[domingo, segunda, terça, quarta, quinta, sexta, sábado]`, mas confirmar antes de codificar.
- `departures[].dep`: horário de saída.
- `departures[].arr`: horário de chegada.
- `departures[].wa`: campo ainda não interpretado.
- `departures[].seq`: sequência/variação de viagem, possivelmente usado para shape/sentido/serviço.

### Uso potencial no app

O endpoint `timetable` pode complementar a SIU em:

- busca de linhas;
- exibição de nome oficial da linha;
- horários planejados;
- fallback quando não houver previsão em tempo real;
- expansão para linhas metropolitanas da Ótimo.

Ele não substitui sozinho a previsão em tempo real por parada, porque a amostra de `timetable` é programação estática/planejada.

## Partidas por parada Mobilibus

### Endpoint descoberto

```text
GET https://ss7u5urlxs.singularcdn.net.br/api/departures?stop_id={stopId}
GET https://ss7u5urlxs.singularcdn.net.br/api/departures?stop_id={stopId}&route_id={routeId}
GET https://ss7u5urlxs.singularcdn.net.br/api/departures?stop_id={stopId}&route_id={routeId}&project_id={projectId}
```

### Teste feito com parada SIU

Consulta:

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/departures?stop_id=13566&route_id=562347&project_id=603'
```

Retorno:

```json
{
  "stopName": "",
  "platform": null,
  "time": 1783984659403,
  "tzOffset": 0,
  "trips": [],
  "alerts": []
}
```

Também foi testado:

```text
stop_id=40134
stop_id=13566
```

Resultado:

- Ambos retornaram `200`.
- Ambos retornaram `trips: []`.
- Isso indica que o `stop_id` da Mobilibus não é o mesmo `cod` interno da SIU nem necessariamente o `siu` público da parada.

Conclusão:

- O endpoint existe e responde.
- Para usar previsões/partidas reais da Mobilibus, precisamos antes resolver como obter o `stop_id` Mobilibus correto.

## Tabela por parada Mobilibus

### Endpoint descoberto

```text
GET https://ss7u5urlxs.singularcdn.net.br/api/timetable-by-stop?project_id={projectId}&stop_id={stopId}
GET https://ss7u5urlxs.singularcdn.net.br/api/timetable-by-stop?project_id={projectId}&stop_id={stopId}&route_id={routeId}
```

### Teste feito

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/timetable-by-stop?project_id=603&stop_id=13566'
```

Retorno:

```json
{
  "error": "stop not found"
}
```

Conclusão:

- O endpoint exige `stop_id` Mobilibus.
- Paradas SIU (`cod`/`siu`) não funcionaram diretamente.

## Paradas Mobilibus

### Endpoint descoberto e destravado

```text
GET https://ss7u5urlxs.singularcdn.net.br/api/stops?project_id={projectId}&tile={x},{y},{zoomLeaflet}
```

Esse endpoint apareceu no APK via string:

```text
stops?project_id=
getStopsInViewUrl
StopsInViewMapServices
```

O formato correto foi descoberto a partir do webapp oficial do Bus2:

```text
https://webapp.bus2.services/pt/{projectHash}/home
```

Hashes confirmados:

| projectId | Região | hash |
| --- | --- | --- |
| `501` | Região Metropolitana de Belo Horizonte, MG | `1sb79` |
| `603` | Belo Horizonte, MG | `4ch6j` |

O webapp é uma aplicação Next.js. Na página `home`, o mapa é carregado em chunks dinâmicos. O chunk do mapa contém a lógica que lista paradas:

```js
function tileFromLatLng(lat, lng, zoomLeaflet) {
  const z = zoomLeaflet - 2;

  return {
    x: Math.floor(((lng + 180) / 360) * Math.pow(2, z)),
    y: Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) +
            1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        Math.pow(2, z)
    ),
  };
}
```

Detalhes importantes:

- O `x` e `y` são calculados em Web Mercator usando `zoomLeaflet - 2`.
- O terceiro número enviado em `tile` é o zoom original da Leaflet, não o zoom reduzido.
- O mapa só busca paradas quando `zoomLeaflet >= 14`.
- O webapp itera todos os tiles visíveis no viewport e chama a API uma vez por tile.
- A chave de cache do frontend é `"x,y@zoom"`.

Trecho lógico equivalente do webapp:

```js
const zoom = Math.round(map.getZoom());
const tiles = tilesFromBounds(map.getBounds(), zoom);

await Promise.all(
  tiles.map((tile) =>
    getStops(projectHash, `${tile.x},${tile.y},${zoom}`)
  )
);
```

No backend direto da Mobilibus, a mesma chamada funciona usando `project_id`:

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/stops?project_id=501&tile=6192,9117,16'
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/stops?project_id=603&tile=6192,9117,16'
```

### Exemplo de tile para BH/RMBH

Centro aproximado:

```text
lat=-19.922
lng=-43.945
zoomLeaflet=16
```

Cálculo:

```text
x=6192
y=9117
tile=6192,9117,16
```

Comando testado para a Região Metropolitana:

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/stops?project_id=501&tile=6192,9117,16'
```

Exemplo de item retornado:

```json
{
  "stopId": 15192689,
  "projectId": 501,
  "lat": -19.93193292,
  "lng": -43.93043518,
  "bearing": 340,
  "name": "Av. Afonso Pena, 2323 - Parada DEOESP",
  "code": null,
  "platform": null,
  "type": 3,
  "routeTypes": [3],
  "locationType": 0,
  "parent": null,
  "address": "Avenida Afonso Pena 2328",
  "city": "Região Metropolitana de Belo Horizonte, MG"
}
```

Comando testado para Belo Horizonte municipal:

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/stops?project_id=603&tile=6192,9117,16'
```

Exemplo de item retornado:

```json
{
  "stopId": 14784133,
  "projectId": 603,
  "lat": -19.91733795,
  "lng": -43.94030518,
  "bearing": 280,
  "name": "Rua Dos Tupinambas 648",
  "code": null,
  "platform": null,
  "type": 3,
  "routeTypes": [3],
  "locationType": 0,
  "parent": null,
  "address": "Rua dos Tupinambás 646",
  "city": "Belo Horizonte, MG"
}
```

### Variações que não funcionam

Chamadas antigas testadas e consideradas inválidas:

```text
/api/stops?project_id=603
/api/stops?project_id=603&lat=-19.916136&lon=-43.99563&zoom=16
/api/stops?project_id=603&latitude=-19.916136&longitude=-43.99563&zoom=16
/api/stops?project_id=603&lat=-19.916136&lng=-43.99563&zoom=16
/api/stops?project_id=603&x=-43.99563&y=-19.916136&zoom=16
/api/stops?project_id=603&x=-43.99563&y=-19.916136&z=16
/api/stops?project_id=603&bounds[x]=-43.99563&bounds[y]=-19.916136&bounds[zoom]=16
/api/stops?project_id=603&center[x]=-43.99563&center[y]=-19.916136&zoom=16
/api/stops?project_id=603&point[x]=-43.99563&point[y]=-19.916136&zoom=16
/api/stops?project_id=603&bounds={"x":-43.99563,"y":-19.916136,"zoom":16}
/api/stops?project_id=603&bounds=-44.01,-19.93,-43.98,-19.90
/api/stops?project_id=501&x=6192&y=9117&z=14
/api/stops?project_id=501&tiles=6192,9117,16
/api/stops?project_id=501&tile[]=6192,9117,16
```

Resultado recorrente:

```json
{
  "error": "Cannot read properties of undefined (reading 'x')"
}
```

Também foram testados headers vistos no APK, sem alterar o erro:

```text
x-mob-phone-gps-latitude: -19.916136
x-mob-phone-gps-longitude: -43.99563
```

Conclusão:

- O parâmetro precisa ser `tile`, no singular.
- O valor precisa ser uma string simples no formato `x,y,zoomLeaflet`.
- `x`, `y` e `z` separados por query string não são aceitos por esse endpoint.
- O `z` dentro da fórmula é `zoomLeaflet - 2`, mas o valor enviado no parâmetro continua sendo `zoomLeaflet`.

### Integração com `departures`

Depois que o `stopId` Mobilibus é obtido por `stops`, o endpoint de partidas funciona.

Comando testado:

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/departures?stop_id=15192689&project_id=501'
```

Retorno resumido:

```json
{
  "stopName": "Av. Afonso Pena, 2323 - Parada DEOESP",
  "platform": null,
  "time": 1783985656014,
  "tzOffset": -3,
  "trips": [
    {
      "tripId": 2722282,
      "headsign": "Belo Horizonte",
      "directionId": 0,
      "routeId": 572664,
      "shortName": "3910",
      "longName": "Jardim Canadá / Belo Horizonte",
      "color": "#ef7d01",
      "ac": false,
      "stopSequence": 40,
      "departures": [
        {
          "tripFeedId": "2722282S622795P193000",
          "time": "20:25:32",
          "nextDay": false,
          "wa": true,
          "extra": false,
          "positionAge": 47,
          "vehicleId": "95057",
          "gpsTime": "20:33:28",
          "bearing": 120,
          "stopSequence": 9,
          "delay": 0
        }
      ]
    }
  ],
  "alerts": []
}
```

Campos relevantes em `departures`:

- `stopName`: nome da parada.
- `time`: timestamp de referência da resposta.
- `trips[].routeId`: linha Mobilibus.
- `trips[].shortName`: número/slug da linha.
- `trips[].departures[].time`: horário previsto/programado de saída naquela parada.
- `trips[].departures[].wa`: flag de acessibilidade/atributo operacional já usada em outros payloads Mobilibus.
- `trips[].departures[].positionAge`: idade da posição do veículo em segundos, quando há tempo real.
- `trips[].departures[].vehicleId`: prefixo/identificador do veículo, quando há tempo real.
- `trips[].departures[].gpsTime`: horário da última posição GPS, quando há tempo real.
- `trips[].departures[].bearing`: direção do veículo, quando há tempo real.
- `trips[].departures[].delay`: atraso em segundos/minutos conforme semântica interna do feed; no exemplo veio `0`.

### Integração com `timetable-by-stop`

Comando testado:

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/timetable-by-stop?project_id=501&stop_id=15192689'
```

Retorno resumido:

```json
{
  "name": "Av. Afonso Pena, 2323 - Parada DEOESP",
  "wa": false,
  "tzOffset": -3,
  "timetable": {
    "services": [
      {
        "serviceId": 622795,
        "desc": "Dias Úteis (Férias) - DER",
        "start": "2026-07-13",
        "end": "2026-07-31",
        "days": [false, true, true, true, true, true, false],
        "departures": [
          {
            "dep": "01:50:29",
            "arr": "03:27:41",
            "wa": 1,
            "extra": false,
            "seq": 1,
            "nextDay": false
          }
        ]
      }
    ],
    "trips": [
      {
        "tripId": 2722286,
        "routeId": 572666,
        "tripDesc": "Belo Horizonte",
        "shortName": "3948",
        "longName": "Água Limpa / Belo Horizonte",
        "color": "#ef7d01",
        "seq": 1
      }
    ],
    "exceptions": []
  }
}
```

Conclusão:

- A sequência operacional está destravada: `stops` por tile retorna `stopId`; `departures` e `timetable-by-stop` aceitam esse `stopId`.
- O tempo real aparece embutido em `departures` quando há veículo online.
- Ainda não é necessário encontrar um endpoint separado de `vehicles` para mostrar previsões por parada.

## Alertas Mobilibus

### Endpoint

```text
GET https://ss7u5urlxs.singularcdn.net.br/api/alerts?project_id={projectId}
```

Teste:

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/alerts?project_id=603'
```

Retorno observado:

```json
[]
```

Observações:

- No `project-details`, `supportAlerts` é `true` para `603`.
- No `project-details`, `supportAlerts` é `false` para `501`.
- Mesmo quando vazio, o endpoint responde.

## Pontos de venda Mobilibus

Endpoint visto no APK:

```text
points-of-sale?project_id=
```

Ainda não foi testado profundamente.

Possível chamada:

```text
GET https://ss7u5urlxs.singularcdn.net.br/api/points-of-sale?project_id=501
GET https://ss7u5urlxs.singularcdn.net.br/api/points-of-sale?project_id=603
```

Observação:

- No `project-details` de `603`, `hasPointOfSale` apareceu como `false`.
- Não usar como prioridade para o app atual.

## OTP Mobilibus

### Bases por projeto

Projeto `501`:

```text
https://otp.mobilibus.com/U70yiTt8ORN1aW
```

Projeto `603`:

```text
https://otp.mobilibus.com/Z64D4a6iW4nUGI
```

String de endpoint vista no APK:

```text
/otp/routers/default/plan
```

Provável endpoint completo:

```text
GET {otpUri}/otp/routers/default/plan
```

Parâmetros comuns de OpenTripPlanner:

```text
fromPlace={lat},{lon}
toPlace={lat},{lon}
date={MM-DD-YYYY}
time={HH:mm}
mode=WALK,TRANSIT
arriveBy=false
```

Status:

- Não foi testado ainda nesta investigação.
- O `project-details` de `501` tem `urban.otp: true`.
- É uma frente promissora para planejamento de viagem, mas não é necessária para apenas listar linhas/horários.

## Gateway Prodata

String encontrada no APK:

```text
https://gateway.mobilibus.com/prodata/501/
```

Teste com `HEAD`:

```text
HTTP/1.1 200 OK
Server: nginx/1.28.0
Content-Type: text/html; charset=utf-8
X-Powered-By: Express
```

Observações:

- O endpoint base retorna HTML.
- O nome sugere integração Prodata/recarga/bilhetagem.
- O `project-details` de `501` retornou `recharge.enabled: false` em amostra anterior.
- Não priorizar para o objetivo de previsões/linhas.

## Relação com o app atual

### Modelo atual

O app atual consome SIU via endpoints próprios:

```text
/api/paradas/proximas
/api/paradas/{cod}/previsoes
/api/itinerarios/{cod}
/api/itinerarios/{cod}/veiculos
/api/linhas
```

Arquitetura:

```text
UI Vue
  -> src/services/apiClient.ts
  -> /api/*
  -> src/server/siuClient.ts
  -> SIU Mobile BH
  -> src/server/normalizers.ts
```

### Como encaixar Mobilibus

Recomendação inicial:

1. Criar um novo client server-side:

```text
src/server/mobilibusClient.ts
```

2. Criar tipos/normalizadores próprios:

```text
src/server/mobilibusNormalizers.ts
src/domain/mobilibusTypes.ts
```

3. Expor endpoints locais/serverless separados:

```text
/api/mobilibus/projetos
/api/mobilibus/projetos/{projectId}
/api/mobilibus/projetos/{projectId}/linhas
/api/mobilibus/projetos/{projectId}/linhas/{routeId}/horarios
```

4. Não misturar `cod` SIU e `routeId`/`stop_id` Mobilibus no mesmo campo.

5. Definir explicitamente uma fonte por domínio:

| Dado | SIU | Mobilibus |
| --- | --- | --- |
| Previsão atual por parada municipal já funcional | Sim | Sim, via `stops` por tile e `departures` |
| Previsão atual por parada metropolitana | Não | Sim, via projeto `501` |
| Veículo em mapa municipal já funcional | Sim | Parcial: veículo aparece em `departures`, mapa livre ainda não mapeado |
| Catálogo municipal BH | Sim | Sim, projeto `603` |
| Catálogo metropolitano Ótimo | Não | Sim, projeto `501` |
| Horário planejado municipal | Parcial/indireto | Sim |
| Horário planejado metropolitano | Não | Sim |
| Linha `2890` | Não | Sim, projeto `501` |
| Linha `8350` | Sim | Sim, projeto `603` |

### Identificadores que não devem ser confundidos

SIU:

- `cod` da parada: usado para previsão.
- `siu` da parada: código público exibido ao usuário.
- `codItinerario`/`serviceId`: usado para itinerário/veículos.
- `linha`/`codLinha`: código da linha.

Mobilibus:

- `projectId`: projeto/cidade/sistema.
- `routeId`: identificador interno da rota.
- `shortName`: número público da linha.
- `longName`: nome da linha.
- `agencyId`: operador/órgão.
- `stopId`/`stop_id`: identificador de parada Mobilibus; vem de `stops?project_id=...&tile=...` e alimenta `departures`/`timetable-by-stop`.
- `serviceId`: serviço/calendário em `timetable`.
- `seq`: sequência de partida em `timetable`, ainda não interpretada.

## Comandos úteis para retomada

### Projetos BH/RMBH

```sh
curl -s 'https://mobilibus.com/api/projects?charter=false' \
  | jq '[.[] | select((.name // "" | ascii_downcase | contains("belo horizonte")) or (.name // "" | ascii_downcase | contains("região metropolitana de belo horizonte")))]'
```

### Detalhes do projeto metropolitano

```sh
curl -s 'https://mobilibus.com/api/project-details?project_id=501' | jq
```

### Detalhes do projeto municipal

```sh
curl -s 'https://mobilibus.com/api/project-details?project_id=603' | jq
```

### Validar linha 2890

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/routes?project_id=501' \
  | jq '.[] | select(.shortName == "2890")'
```

Retorno esperado:

```json
{
  "routeId": 572385,
  "agencyId": 39568,
  "shortName": "2890",
  "longName": "Morada Nova / Pindorama / Cidade Industrial",
  "desc": "",
  "type": 3,
  "color": "#ef7d01",
  "textColor": "#FFFFFF",
  "price": 8.45
}
```

### Validar linha 8350

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/routes?project_id=603' \
  | jq '.[] | select(.shortName == "8350")'
```

Retorno esperado:

```json
{
  "routeId": 562347,
  "agencyId": 37926,
  "shortName": "8350",
  "longName": "Estação São Gabriel/Estação Barreiro",
  "desc": "",
  "type": 3,
  "color": "#012841",
  "textColor": "#FFFFFF",
  "price": 6.25
}
```

### Buscar linhas com Cidade Industrial na RMBH

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/routes?project_id=501' \
  | jq '[.[] | select(.longName // "" | ascii_downcase | contains("cidade industrial")) | {routeId, shortName, longName, price}]'
```

### Tabela horária da 8350 municipal

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/timetable?project_id=603&route_id=562347' | jq
```

### Tabela horária da 2890 metropolitana

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/timetable?project_id=501&route_id=572385' | jq
```

### Calcular tile Mobilibus/Bus2

```sh
node -e 'function tile(lat,lng,zoom){const z=zoom-2; console.log({x:Math.floor((lng+180)/360*2**z), y:Math.floor((1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*2**z), zoom});} tile(-19.922,-43.945,16)'
```

Retorno esperado:

```json
{ "x": 6192, "y": 9117, "zoom": 16 }
```

### Buscar paradas RMBH por tile

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/stops?project_id=501&tile=6192,9117,16' | jq '.[0:5]'
```

### Buscar paradas municipais por tile

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/stops?project_id=603&tile=6192,9117,16' | jq '.[0:5]'
```

### Testar partidas por parada

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/departures?stop_id={stopId}&route_id={routeId}&project_id={projectId}' | jq
```

Aviso:

- Não usar `cod`/`siu` da SIU esperando que funcione como `stop_id` Mobilibus.

### Testar partidas com parada real RMBH

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/departures?stop_id=15192689&project_id=501' | jq
```

### Testar grade por parada real RMBH

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/timetable-by-stop?project_id=501&stop_id=15192689' | jq
```

## Lacunas conhecidas

### 1. Persistir/correlacionar `stop_id` Mobilibus

Status: destravado para consulta por viewport/tile, mas ainda precisa virar modelo de dados na aplicação.

O que já está resolvido:

- `stops?project_id={projectId}&tile={x},{y},{zoomLeaflet}` retorna `stopId` Mobilibus.
- `departures?stop_id={stopId}&project_id={projectId}` retorna partidas e previsões.
- `timetable-by-stop?project_id={projectId}&stop_id={stopId}` retorna a grade por parada.

O que ainda precisa ser decidido:

- Se o app vai cachear paradas por tile.
- Se o app vai salvar `stopId` Mobilibus junto das paradas SIU próximas.
- Se haverá deduplicação espacial entre paradas SIU e paradas Mobilibus.
- Como tratar paradas metropolitanas e municipais no mesmo mapa quando `projectId=501` e `projectId=603` retornam pontos parecidos no centro de BH.

### 2. Implementar cálculo de tiles no app

Status: fórmula descoberta no webapp oficial.

Requisitos de implementação:

- Calcular `x` e `y` por Web Mercator usando `zoomLeaflet - 2`.
- Enviar o parâmetro como `tile=x,y,zoomLeaflet`.
- Fazer chamadas por todos os tiles visíveis no viewport.
- Não chamar esse endpoint com zoom menor que `14`, seguindo o webapp.
- Deduplicar por `stopId`, porque múltiplos tiles ou movimentos de mapa podem repetir paradas.

Função base:

```ts
function tileFromLatLng(lat: number, lng: number, zoomLeaflet: number) {
  const z = zoomLeaflet - 2;

  return {
    x: Math.floor(((lng + 180) / 360) * 2 ** z),
    y: Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) +
            1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        2 ** z
    ),
  };
}
```

### 3. Evitar confusão entre ids

`cod`/`siu` da SIU não equivalem a `stopId` Mobilibus.

Exemplos:

| Origem | Campo | Exemplo | Uso |
| --- | --- | --- | --- |
| SIU | `cod`/`siu` | `13566` | API SIU atual |
| Mobilibus 501 | `stopId` | `15192689` | Região Metropolitana |
| Mobilibus 603 | `stopId` | `14784133` | Belo Horizonte municipal |

Se um `stopId` errado for usado:

```json
{
  "error": "stop not found"
}
```

### 4. Confirmar tempo real Mobilibus em mais cenários

O tempo real foi confirmado em `departures`, por exemplo:

```text
positionAge
vehicleId
gpsTime
bearing
delay
```

Ainda não foi encontrado endpoint direto equivalente a:

```text
vehicles?route_id=
vehicle-position
realtime
```

Para o app, isso não bloqueia previsões por parada. Só bloqueia um mapa de veículos livre por linha.

### 5. Comparar `timetable` vs `timetable?v=2`

O APK tem as duas strings:

```text
timetable?project_id=
timetable?v=2&project_id=
```

Ainda não foi feita comparação completa de payload.

### 6. Investigar `trip-details?trip_id=`

Tentativa ingênua:

```text
GET /api/trip-details?trip_id=562347
```

Resultado:

```text
502 Bad Gateway
```

Provavelmente `trip_id` não é `routeId`; precisa vir de `departures`, `timetable`, OTP ou outra lista de trips.

## Decisões técnicas recomendadas

### Não substituir SIU de imediato

A SIU já está integrada e funcionando para:

- paradas próximas;
- previsões por parada;
- itinerário;
- veículos;
- seleção de ônibus no mapa.

Mobilibus deve entrar primeiro como fonte complementar.

### Introduzir Mobilibus como fonte separada

Evitar um adaptador genérico cedo demais.

Criar domínio explícito:

```ts
interface MobilibusProject {
  projectId: number;
  name: string;
  city: string;
  apiUri: string;
  otpUri: string;
}

interface MobilibusRoute {
  projectId: number;
  routeId: number;
  agencyId: number;
  shortName: string;
  longName: string;
  desc: string | null;
  type: number;
  color: string | null;
  textColor: string | null;
  price: number | null;
}
```

### Suportar múltiplos projetos na busca

Para busca de linhas, consultar pelo menos:

```text
501 - Região Metropolitana de Belo Horizonte, MG
603 - Belo Horizonte, MG
```

Exemplo:

- Busca por `8350` deve retornar projeto `603`.
- Busca por `2890` deve retornar projeto `501`.

### UI deve mostrar origem do sistema

Como linhas municipais e metropolitanas podem ter códigos parecidos, a UI deve mostrar:

```text
8350 · Belo Horizonte
2890 · Região Metropolitana
```

ou:

```text
8350 · SUMOB
2890 · Ótimo
```

Para isso, mapear `projectId` para rótulo curto:

```ts
const MOBILIBUS_PROJECT_LABELS = {
  501: 'Ótimo/RMBH',
  603: 'BH municipal',
};
```

### Cache recomendado

Catálogo de rotas e `project-details` mudam pouco.

Sugestão:

- cache server-side em memória por `10` a `60` minutos;
- ou cache HTTP em Vercel com `s-maxage`;
- não cachear `departures` por muito tempo quando for destravado.

## Plano de implementação sugerido

### Fase 1: catálogo Mobilibus

Objetivo:

- Buscar linhas em `501` e `603`.
- Mostrar resultados junto da busca atual.
- Permitir selecionar linha metropolitana para ver detalhes e horários planejados.

Endpoints mínimos:

```text
GET /api/mobilibus/projetos
GET /api/mobilibus/linhas?q=2890
GET /api/mobilibus/projetos/{projectId}/linhas/{routeId}/horarios
```

### Fase 2: horários planejados

Objetivo:

- Exibir tabela horária de linhas Mobilibus.
- Começar pela `2890`.

Fonte:

```text
GET /api/timetable?project_id=501&route_id=572385
```

### Fase 3: paradas Mobilibus

Objetivo:

- Implementar `stop_id` Mobilibus.
- Mapear paradas por viewport.
- Permitir selecionar parada Mobilibus.

Fonte:

```text
GET /api/stops?project_id={projectId}&tile={x},{y},{zoomLeaflet}
```

Notas:

- Calcular `x/y` em `zoomLeaflet - 2`.
- Enviar `zoomLeaflet` como terceiro item do parâmetro `tile`.
- Buscar apenas com zoom `>= 14`.
- Deduplicar retorno por `stopId`.

### Fase 4: partidas/previsões Mobilibus

Objetivo:

- Usar `departures?stop_id=...`.
- Usar `timetable-by-stop?project_id=...&stop_id=...`.
- Exibir partidas com `vehicleId`, `gpsTime`, `positionAge`, `bearing` e `delay` quando existirem.
- Integrar cards de previsão metropolitanos.

### Fase 5: unificação de UX

Objetivo:

- Usuário busca qualquer linha.
- App mostra fonte, sistema, preço e disponibilidade.
- SIU continua cuidando do municipal em tempo real até Mobilibus ter paradas/previsões resolvidas.

## Checklist para nova sessão

1. Confirmar estado do repo:

```sh
cd /home/lucas/onibus-bh
git status --short --branch
```

2. Ler este arquivo:

```text
docs/mobilibus-otimo-api-research.md
```

3. Validar rapidamente a `2890`:

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/routes?project_id=501' \
  | jq '.[] | select(.shortName == "2890")'
```

4. Validar rapidamente a `8350`:

```sh
curl -s 'https://ss7u5urlxs.singularcdn.net.br/api/routes?project_id=603' \
  | jq '.[] | select(.shortName == "8350")'
```

5. Se for implementar, começar por `mobilibusClient.ts`, não mexer na SIU primeiro.

6. Se for continuar investigação, instalar ou usar:

```sh
jadx
apktool
```

e procurar no APK:

```text
getStopsInViewUrl
StopsInViewMapServices
stops?project_id=
departures?stop_id=
timetable-by-stop?project_id=
trip-details?trip_id=
```

## Referência rápida dos ids conhecidos

| Item | Valor |
| --- | --- |
| Projeto Mobilibus BH municipal | `603` |
| Projeto Mobilibus RMBH/Ótimo | `501` |
| API operacional comum | `https://ss7u5urlxs.singularcdn.net.br/api/` |
| API global | `https://mobilibus.com/api/` |
| OTP RMBH | `https://otp.mobilibus.com/U70yiTt8ORN1aW` |
| OTP BH municipal | `https://otp.mobilibus.com/Z64D4a6iW4nUGI` |
| Linha `2890` | projeto `501`, `routeId 572385` |
| Linha `8350` | projeto `603`, `routeId 562347` |
| Linha `405R` | projeto `501`, `routeId 572171` |
| Linha `515R` | projeto `501`, `routeId 571704` |
| Linha `6350` | projeto `603`, `routeId 562239` |
| Linha `8151` | projeto `603`, `routeId 562008` |
| Linha `8550` | projeto `603`, `routeId 562217` |
