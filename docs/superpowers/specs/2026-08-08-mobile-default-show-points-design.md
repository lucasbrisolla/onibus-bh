# Design: padrão mobile para “Mostrar pontos”

## Contexto

O estado `showNearbyStops` é criado em `src/App.vue` e atualmente começa como `true` para todas as larguras de tela. O controle é compartilhado pelas duas instâncias de `MapView`, enquanto o layout considera mobile a partir do breakpoint CSS de `920px`.

## Decisão

O valor inicial será calculado uma única vez a partir de `window.matchMedia('(max-width: 920px)')`:

- mobile: `Mostrar pontos` começa desligado (`false`);
- desktop: `Mostrar pontos` começa habilitado (`true`);
- ao redimensionar a janela, o estado atual não será alterado;
- a preferência não será persistida em `localStorage`.

O fallback fora de um ambiente com `window` será `true`, preservando o comportamento atual em ambientes não visuais.

## Estrutura

Será criado um helper pequeno e testável para encapsular a decisão do valor inicial. `App.vue` continuará sendo o dono do estado e apenas trocará o literal `true` pela chamada desse helper. `MapView.vue` não precisará conhecer viewport, breakpoint ou ciclo de vida de redimensionamento.

## Fluxo de comportamento

1. A aplicação monta e calcula o valor inicial usando o breakpoint de `920px`.
2. `App.vue` passa esse valor para as duas instâncias de `MapView`.
3. O usuário pode alternar `Mostrar pontos` normalmente.
4. Mudanças posteriores no tamanho da janela não recalculam nem sobrescrevem a escolha atual.

## Testes

- testar que o helper retorna `false` quando `matchMedia` indica viewport mobile;
- testar que retorna `true` quando indica viewport desktop;
- testar o fallback `true` quando `matchMedia` não está disponível;
- manter os testes existentes de emissão do toggle e ocultação das paradas próximas.

## Critérios de sucesso

- ao abrir o app em viewport de até `920px`, o controle aparece desligado e as paradas próximas não são renderizadas;
- ao abrir o app acima de `920px`, o controle aparece ligado;
- alternar o controle continua funcionando;
- redimensionar a janela não muda automaticamente o estado escolhido;
- testes, lint e build permanecem passando.
