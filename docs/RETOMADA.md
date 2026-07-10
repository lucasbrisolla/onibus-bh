# Retomada do projeto Ônibus BH

## Situação atual

O repositório `lucasbrisolla/onibus-bh` está com o MVP inicial mergeado na `main`.

O app foi refeito do zero, sem migrar o código antigo diretamente. A ideia do app antigo foi preservada: consultar previsões de ônibus em BH e avisar quando uma linha estiver chegando.

## O que já existe

- App Vue 3 + Vite + TypeScript.
- API serverless Vercel em `api/`.
- Parser JSONP para respostas da SIU Mobile.
- Normalização de previsões.
- Regra de alerta local.
- Regra específica da linha `8350` Direto/Não Direto.
- Persistência em `localStorage`.
- Notification API para aviso local com o app aberto.
- Testes unitários.
- README inicial.

## Verificações já realizadas

Na última validação:

```sh
npm run test
npm run lint
npm run build
```

Resultado:

- 42 testes passando.
- Typecheck passando.
- Build passando.

Também foi testado que a SIU Mobile responde para:

```text
/buscarLinhas/jsonpCallback
```

E que a parada próxima de `siu: 40134` usa `cod: 13566` para previsão.

## Ponto crítico descoberto

O usuário inicialmente passou códigos como `40134` e `50003`.

Foi descoberto que `40134` é um código `siu`, mas a previsão usa o código interno `cod`.

Exemplo:

```json
{
  "cod": 13566,
  "siu": "40134",
  "desc": "ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749"
}
```

Consulta correta de previsão:

```text
/V3/buscarPrevisoes/13566/false/0/null/jsonpCallback
```

Essa consulta retornou previsões, incluindo linha `8350`.

## Próxima feature recomendada

Adicionar mapa ou busca de paradas.

### Por quê

O app atual exige que o usuário saiba o código interno da parada. Isso não é usável.

O app antigo abria um mapa em uma coordenada, chamava `buscarParadasProximas`, mostrava os marcadores e permitia selecionar uma parada.

### Escopo sugerido

1. Criar endpoint próprio:

```text
GET /api/paradas?lat={lat}&lng={lng}
```

2. No backend, chamar:

```text
GET /V3/buscarParadasProximas/{lng}/{lat}/0/null/jsonpCallback
```

3. Normalizar paradas para:

```ts
interface Stop {
  code: string;      // cod interno usado em previsão
  siu: string | null;
  description: string;
  lat: number;
  lng: number;
}
```

4. No frontend, adicionar uma tela ou seção para:

- usar localização atual;
- buscar paradas próximas;
- listar paradas;
- escolher uma parada;
- salvar `Stop.code` em `settings.stopCode`.

5. Depois, opcionalmente adicionar mapa com Leaflet.

### Abordagem incremental recomendada

Primeiro implementar lista de paradas próximas sem mapa.

Depois adicionar mapa.

Motivo: a lista já resolve o problema de usabilidade e reduz risco. O mapa entra como camada visual por cima.

## Coordenada de referência do app antigo

URL antiga analisada:

```text
https://onibusbh-dkvwihvdi-guilhermerodrigues680.vercel.app/mapa?lat=-19.916342&lng=-43.993759
```

Coordenadas:

```text
lat=-19.916342
lng=-43.993759
```

Paradas próximas retornadas incluíram:

- `cod: 11073`, `siu: 40135`
- `cod: 13566`, `siu: 40134`

Previsões testadas:

- `cod: 13566`: retornou `6350`, `8151`, `8350`.
- `cod: 11073`: retornou `4501`, `6350`, `8151`, `8350`.

## Arquivos principais

- `src/domain/types.ts`
- `src/domain/busVariant.ts`
- `src/domain/alertRules.ts`
- `src/server/siuClient.ts`
- `src/server/jsonp.ts`
- `src/server/normalizers.ts`
- `api/paradas/[cod]/previsoes.ts`
- `src/services/settingsStore.ts`
- `src/services/apiClient.ts`
- `src/services/notificationService.ts`
- `src/App.vue`

## Como retomar

1. Abrir o repositório:

```sh
cd /home/lucas/onibus-bh
```

2. Instalar dependências se necessário:

```sh
npm install
```

3. Verificar estado:

```sh
git status --short --branch
npm run test
npm run lint
npm run build
```

4. Criar branch para a próxima feature:

```sh
git checkout -b feat/paradas-proximas
```

5. Implementar endpoint de paradas próximas e UI de seleção de parada.

## Observação para deploy

O app usa Vercel Functions. Rodar apenas `npm run dev` com Vite não executa as funções `/api/*` como a Vercel.

Para testar o fluxo completo localmente, usar Vercel Dev ou publicar na Vercel.
