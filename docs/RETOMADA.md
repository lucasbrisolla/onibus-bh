# Retomada do projeto Ônibus BH

## Situação atual

O checkout principal está em:

```text
/home/lucas/onibus-bh
```

Mas o trabalho mais recente do mapa está no worktree:

```text
/home/lucas/.config/superpowers/worktrees/onibus-bh/nucleo-mapa
```

Branch:

```text
feat/nucleo-mapa
```

Antes de continuar, conferir:

```sh
git worktree list
```

Se for continuar o mapa, entrar no worktree:

```sh
cd /home/lucas/.config/superpowers/worktrees/onibus-bh/nucleo-mapa
```

## Leia primeiro no worktree do mapa

```text
AGENTS.md
docs/ARCHITECTURE.md
docs/RETOMADA.md
```

Esses arquivos foram atualizados para explicar o estado real do branch `feat/nucleo-mapa`.

## O que existe no branch `feat/nucleo-mapa`

- Dashboard responsiva com sidebar.
- Mapa Leaflet.
- Pontos/paradas no mapa.
- Clique em ponto seleciona parada.
- Painel mostra código público e rua.
- Clique em ponto busca previsões.
- Busca de paradas carregadas.
- Geolocalização.
- Marcador “Você está aqui”.
- Rota e veículos quando há itinerário.
- Middleware local do Vite para `/api/*`.
- APIs Vercel em `api/`.
- Testes unitários.

## Últimos commits relevantes no branch

```text
ed34726 docs: add architecture and agent handoff
cc595ca fix: replace stop marker dots with icon
c071d52 feat: add pilot stop map icon
d338403 fix: show selected stop details and local api
f6a8fd0 fix: load stop predictions from map markers
00af353 fix: encode nearby stop coordinates
27c0e0a feat: make dashboard controls interactive
027e371 feat: show map stops by default
```

## Última validação conhecida

No worktree `feat/nucleo-mapa`, após o commit `cc595ca`:

```sh
npm run test
npm run lint
npm run build
```

Resultado:

- 64 testes passando;
- typecheck passando;
- build passando.

Depois foi criado o commit de documentação:

```text
ed34726 docs: add architecture and agent handoff
```

## Ponto crítico: `cod` versus `siu`

A SIU retorna:

- `cod`: código interno usado para buscar previsões;
- `siu`: código público/visível.

Exemplo:

```json
{
  "cod": 13566,
  "siu": "40134",
  "desc": "ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749"
}
```

Para buscar previsão, usar `cod`:

```text
/V3/buscarPrevisoes/13566/false/0/BHZ/retornoJSON
```

Na UI, mostrar `siu` e `desc`.

## Coordenada de referência

```text
lat=-19.916342
lng=-43.993759
```

Paradas observadas:

- `cod: 11073`, `siu: 40135`
- `cod: 13566`, `siu: 40134`

## Pendências atuais

1. Trocar atualização automática para 5 segundos.
   - Estado atual: `POLL_INTERVAL_MS = 45_000`.
   - Pedido do usuário: `5_000`.
   - Atualizar textos que dizem “45s”.

2. Continuar refinamento de ícones.
   - O usuário quer substituir bolas pretas por ícones.
   - Paradas comuns e parada selecionada já usam SVG de parada no branch.
   - Veículos/localização ainda podem melhorar.
   - Testar um ícone por vez.

3. Favoritos e histórico ainda são placeholders.

4. PWA ainda não implementado.

5. Notificações mobile/browser ainda são básicas.

## Como retomar

```sh
cd /home/lucas/.config/superpowers/worktrees/onibus-bh/nucleo-mapa
git status --short --branch
npm run test
npm run lint
npm run build
npm run dev
```

Abrir:

```text
http://127.0.0.1:5173/
```

Se o Vite escolher outra porta, usar a porta mostrada no terminal.

## Observação

Este arquivo fica no checkout principal para evitar que uma próxima sessão comece achando que o mapa ainda não foi implementado. O estado mais completo está no worktree `feat/nucleo-mapa`.
