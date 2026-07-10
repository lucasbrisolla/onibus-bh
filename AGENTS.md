# Instruções para agentes

## Comunicação

- Responder em PT-BR.
- Preservar acentuação gráfica em arquivos Markdown.
- Todo output direcionado ao usuário deve começar com `.` para facilitar identificação de context drifting.
- Ser direto, mas manter contexto suficiente para retomada por outro agente.

## Projeto

Este repositório contém o novo MVP do **Ônibus BH**, refeito do zero a partir da ideia do app antigo.

Stack:

- Vue 3
- Vite
- TypeScript
- Vitest
- Vercel Functions em `api/`

Requisito de runtime:

- Node.js `>=20`

## Comandos úteis

```sh
npm install
npm run dev
npm run test
npm run lint
npm run build
```

Para validação completa antes de qualquer merge ou deploy:

```sh
npm run test
npm run lint
npm run build
```

## Arquitetura

- `src/domain/`: regras puras de domínio.
- `src/server/`: cliente SIU Mobile, parser JSONP, normalizadores e erros de backend.
- `api/`: funções serverless da Vercel.
- `src/services/`: serviços do navegador, API frontend, notificações e persistência local.
- `src/components/`: componentes Vue.

## Regras de domínio importantes

### Código da parada

A SIU retorna dois identificadores relevantes:

- `cod`: código interno usado para consultar previsões.
- `siu`: código visível/externo que pode aparecer em mapa, placa ou app antigo.

Para buscar previsões, usar o `cod`, não o `siu`.

Exemplo observado:

- `siu: 40134`
- `cod: 13566`
- previsão correta usa `/buscarPrevisoes/13566/...`

### Linha 8350

A linha `8350` pode ter variantes relevantes:

- `Direto`
- `Não Direto`
- `Qualquer`

O alerta deve respeitar o filtro de variante configurado pelo usuário, porque o itinerário pode mudar bastante.

## Estado atual

O MVP atual permite:

- configurar código da parada;
- configurar linha;
- escolher variante da 8350;
- definir limite de minutos;
- consultar previsões pela API própria;
- disparar notificação local enquanto o app está aberto.

Limitação conhecida:

- ainda não há mapa nem busca de paradas próximas.

## Próxima prioridade recomendada

Adicionar mapa/busca de paradas próximas.

Motivo:

- o usuário não deve precisar saber o `cod` interno da parada;
- o app antigo usava mapa;
- a API `buscarParadasProximas` retorna `cod`, `siu`, coordenadas e descrição da parada;
- o app novo deve permitir escolher uma parada visualmente e salvar o `cod` correto.

Endpoint SIU usado como referência:

```text
GET http://bhz.siumobile.com.br:6060/siumobile-ws-v01/rest/ws/V3/buscarParadasProximas/{lng}/{lat}/0/null/jsonpCallback
```

Exemplo real testado:

```text
lat=-19.916342
lng=-43.993759
```

Retornou, entre outras:

```json
{
  "cod": 13566,
  "siu": "40134",
  "x": -43.99563,
  "y": -19.916136,
  "desc": "ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749"
}
```

## Cuidados ao editar

- Não chamar a SIU diretamente do browser; passar por `api/`.
- Não commitar `node_modules/` ou `dist/`.
- Não usar `alert()` na UI.
- Preferir testes unitários para regras de domínio, parser e serviços.
- Ao mexer em polling/notificação, proteger contra respostas obsoletas e requisições concorrentes.
