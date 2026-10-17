# Design do Ônibus BH

## Objetivo visual

O produto deve parecer um painel de mobilidade urbana, com mapa dominante, navegação simples e leitura rápida do estado do ônibus selecionado.

## Princípios

- mapa como elemento principal da experiência;
- monitoramento com informação objetiva e acionável;
- contraste alto em estados importantes;
- poucos elementos decorativos;
- consistência entre desktop e mobile.

## Estrutura da interface

### Sidebar

- papel: navegação principal e status global;
- fundo escuro com viés teal, não navy puro;
- item ativo com preenchimento sólido da cor primária;
- itens inativos com contraste suficiente e leve identidade esverdeada.

### Topbar

- papel: busca e acesso rápido a configurações;
- poucos elementos;
- em dark mode, deve ficar em uma camada diferente da sidebar para criar profundidade.

### Painel de monitoramento

- foco em parada selecionada, próximos ônibus, controles e status;
- seções recolhíveis;
- linguagem curta, sem excesso de explicação.
- o card de parada selecionada deve ser enxuto: endereço e código, sem cabeçalho redundante.

### Mapa

- elemento dominante;
- mostra parada, rota, localização e ônibus selecionado;
- ao selecionar um card, o mapa deve priorizar apenas aquele ônibus;
- o box principal do mapa deve usar número da linha, não `vehicleId`.
- em mobile, controles compactos no mapa podem alternar pontos e modo escuro.
- a rota do ônibus usa a linha principal `#0F766E` e um traço interno animado `#99F6E4`, claro e suave;
- a parada selecionada usa o único destaque âmbar do mapa; rota e ônibus permanecem na paleta teal.

## Sistema de cores

`src/style.css` é a fonte de verdade para os tokens globais. As cores de estado, do mapa e da instalação ficam documentadas abaixo para manter a mesma semântica em todos os componentes.

### Neutros, superfícies e texto

O tema claro usa uma escala de cinza frio. O tema escuro usa uma escala teal profunda. Não introduzir uma terceira família neutra.

| Papel | Claro | Escuro |
| --- | --- | --- |
| `surface-0` — fundo geral | `#EDF3F2` | `#081B1A` |
| `surface-1` — camada de navegação | `#F9FAFB` | `#0C2B29` |
| `surface-2` — cards e topbar | `#FFFFFF` | `#132F2D` |
| `surface-3` — hover elevado | `#F2F4F7` | `#163735` |
| `surface-inset` — campos e listas internas | `#FFFFFF` | `#0F2423` |
| Sidebar de marca | `#0F2E2C` | `#0C2B29` |
| Realce selecionado | `#F0FDFA` | `#134E4A` |
| Borda principal | `#E4E7EC` / `#D0D5DD` | `#1F4A47` / `#28514D` |
| Texto principal | `#101828` | `#E5E7EB` |
| Título | `#1D2939` | `#F9FAFB` |
| Texto de apoio | `#475467` | `#C7D7D4` |
| Texto discreto | `#5B6678` | `#9EB7B4` |

A topbar escura usa `surface-2`; a sidebar usa `surface-1`. Campos escuros usam `surface-inset`, que fica abaixo dos cards na hierarquia visual. `surface-3` é o único hover elevado nos dois temas.

A escala clara substitui os antigos slates: `#F9FAFB`, `#D0D5DD`, `#667085`, `#98A2B3` e `#344054`. O texto discreto do tema claro usa `#5B6678` sobre `#EDF3F2` para preservar contraste AA.

### Ações e identidade

| Uso | Claro | Escuro |
| --- | --- | --- |
| Ação primária | Fundo `#0F766E`, texto branco | Fundo `#2DD4BF`, texto `#082F2B` |
| Hover da ação primária | `#115E59` | `#5EEAD4` |
| Texto sobre a ação primária (`bh-on-primary`) | `#FFFFFF` | `#082F2B` |
| Foco, ícones e detalhes teal | `#0D9488` | `#5EEAD4` no foco |
| Item ativo da sidebar | Fundo `#0F766E`, texto `#FFFFFF` | Fundo `#2DD4BF`, texto `#082F2B` |
| Itens inativos da sidebar | `#99F6E4` | `#99F6E4` |
| Localização da pessoa | Azul `#60A5FA` → `#2563EB` → `#1D4ED8` | Mesmo gradiente azul |

O texto de toda ação primária usa o token `bh-on-primary`: branco no tema claro e `#082F2B` no escuro. O ícone da marca e os itens ativos da navegação usam o mesmo token quando estão sobre a cor primária. O fundo `#0D9488` fica reservado a foco, ícones e detalhes decorativos; o botão primário usa `#0F766E` e passa a `#115E59` no hover.

### Estados

| Estado | Claro | Escuro |
| --- | --- | --- |
| Em tempo real | Fundo `#F0FDF4`, borda `#A7F3D0`, texto `#166534`, ponto `#16A34A` | Fundo `#153A2C`, borda `#1F6651`, texto `#86EFAC`, ponto `#4ADE80` |
| Programado | Fundo `#F2F4F7`, borda `#D0D5DD`, texto `#475467`, ícone de relógio | `surface-inset`, borda `#28514D`, texto `#C7D7D4`, ícone de relógio |
| Não direto | Fundo `#FFF7ED`, texto `#C2410C` | Fundo `#431F13`, texto `#FDBA74` |
| Permissão concedida | Fundo `#DCFCE7`, texto `#166534` | Fundo `#153A2C`, texto `#86EFAC` |
| Permissão bloqueada | Fundo `#FFF7ED`, texto `#9A3412` | Fundo `#431F13`, texto `#FDBA74` |
| Erro | Fundo `#FFF5F5`, borda `#FDA29B`, texto `#B42318` | Fundo `#3B1717`, borda `#7F1D1D`, texto `#FECACA` |
| Estado neutro | Fundo `#F2F4F7`, texto `#475467` | `surface-inset`, texto `#C7D7D4` |

O ponto pulsante e o rótulo “Em tempo real” identificam a atualização ao vivo; a cor verde não é o único sinal. “Programado” é um estado neutro. “Não direto” é o único badge de variante e usa laranja-queimado. “Direto” não recebe badge. O azul da paleta própria da interface fica reservado à localização. Âmbar identifica parada selecionada ou favorita.

### Mapa

| Elemento | Claro | Escuro |
| --- | --- | --- |
| Rota do ônibus | Linha `#0F766E`; fluxo `#99F6E4` | Linha `#14B8A6`; fluxo `#CCFBF1` |
| Marcador de ônibus | Gradiente `#2DD4BF` → `#14B8A6` → `#0F766E`; texto `#ECFEFF` | Mesmo gradiente teal |
| Localização da pessoa | Gradiente `#60A5FA` → `#2563EB` → `#1D4ED8`; texto `#EFF6FF` | Mesmo gradiente azul |
| Parada SIU comum | Borda `#667085`, fundo branco, texto `#475467` | Borda `#98A2B3`, fundo `#0F2423`, texto `#E5E7EB` |
| Parada do Ótimo | Borda `#0F766E`, fundo `#CCFBF1`, texto `#115E59` | Borda `#5EEAD4`, fundo `#0F2423`, texto `#99F6E4` |
| Parada selecionada ou monitorada | Borda `#D97706`, fundo `#FFF7ED`, texto `#9A3412`; halo `#F59E0B` | Borda e texto `#FBBF24`, fundo `#3B2410` |
| Agrupamento de paradas | Fundo `#475467`, texto branco | Fundo `#344054`, texto `#F9FAFB` |
| Tooltip de parada | Branco translúcido, texto `#111827`, contorno teal | Fundo `#0F2423`, texto `#F9FAFB`, contorno `#2DD4BF` |
| Tooltip de veículo | Fundo `rgba(8, 47, 43, 0.94)`, texto `#F0FDFA`, borda branca translúcida | Mesmo tratamento escuro |
| Mapa monocromático | Opcional em Configurações; aplica tons de cinza apenas aos tiles | Mesmo comportamento |
| Créditos do mapa | Link `#115E59` | Link `#5EEAD4` |

A rota clara usa opacidade `0.88` e largura de `5 px`; o fluxo usa opacidade `0.58`, largura `3 px` e padrão `2 12`. No tema escuro, a rota muda para `#14B8A6` e o fluxo para `#CCFBF1`. O contêiner dos mapas usa `#E8ECE6` no claro e `#0B1616` no escuro. CartoDB Positron fornece os tiles claros e CartoDB Dark Matter, os escuros. Sem chave CARTO, o OpenStreetMap é usado como fallback. A opção monocromática aplica tons de cinza somente aos tiles; marcadores e rotas mantêm suas cores nos dois temas.

### Cores fornecidas pela API

A API do Ótimo fornece `color` e pode fornecer `textColor` para cada linha. A lista de partidas mostra o número da linha em uma pequena etiqueta com `color` validada como hexadecimal. O app ignora `textColor` e calcula texto preto (`#000000`) ou branco pela luminância relativa da cor de fundo, escolhendo a opção com maior contraste. A rota do mapa continua usando a paleta teal, sem receber a cor da linha.

Exemplos registrados em `docs/mobilibus-otimo-api-research.md`: `#EF7D01`, `#592379`, `#BED000` e `#012841`. Essas cores pertencem aos dados da linha, não à marca nem aos tokens da interface. A integração SIU também retorna `cor` numérica; esse campo é metadado.

### Ícone, navegador e PWA

O favicon e o ícone SVG usam gradiente teal `#0F766E` → `#0D9488` → `#14B8A6` com traço `#F9FAFB`. O ícone da marca no shell usa `bh-primary` com símbolo `bh-on-primary`. O manifesto usa `#0F2E2C` como fundo. As meta tags `theme-color` usam `#0F2E2C` no tema claro e `#081B1A` no escuro por meio de `media` para cada preferência.

### Transparências e controles desabilitados

As transparências de interface usam tokens CSS `--bh-<família>-08`, `-16` e `-28`, calculados com `color-mix(in srgb, ...)`. As famílias cobrem ação teal, detalhe/foco, menta, rota, âmbar, atenção, localização, sucesso, sombra, branco, preto e borda. Hover, halo e contorno usam esses três degraus, sem valores `rgba()` espalhados nos componentes.

Vidros de mapa e superfícies internas usam tokens próprios de vidro, porque precisam manter alta opacidade para o texto ficar legível sobre os tiles. Eles compartilham os mesmos nomes semânticos e ficam centralizados em `src/style.css`.

Os tokens `bh-disabled-bg` e `bh-disabled-text` usam fundo `#E4E7EC` e texto `#475467`; `bh-disabled-dark-bg` e `bh-disabled-dark-text` usam fundo `#1F4A47` e texto `#9EB7B4`. Não reduzir a opacidade do controle, pois isso também reduz o contraste do conteúdo.

### Regras de manutenção da paleta

- `src/style.css` mantém os tokens globais, as camadas de superfície, os estados desabilitados e as transparências.
- `src/App.vue` aplica a paleta escura aos tokens `--tw-color-bh-*` no contêiner `.app-theme` com utilitários Tailwind. Ao mudar a escala escura, atualize esse mapeamento junto com os tokens e este documento.
- `bh-on-primary` define a cor de texto e ícone sobre fundos primários nos dois temas. Componentes usam `tw:text-bh-on-primary` sem escolher outra cor em `dark:`.
- Antes de criar um novo hexadecimal, verificar se um token existente representa o mesmo papel.
- `npm run lint` valida tipos e executa `scripts/check-design-system.mjs`. O verificador reprova cores de produção sem token ou registro neste documento e utilitários Tailwind com `!` fora das integrações Leaflet justificadas no script. `MapStylePreview.vue` é a única exceção de cor, pois desenha uma ilustração estática dos tiles.
- `npm run test:e2e` percorre Mapa, Alerta, Ótimo, Favoritos, Histórico e Configurações nos temas claro e escuro, em viewport desktop e mobile (`393 × 852`). Na primeira execução, instale o navegador com `npx playwright install chromium`. O axe verifica contraste sobre conteúdo HTML; verificações próprias exigem ao menos 3:1 para ícones marcados com `data-contrast-check="non-text"` e calculam o contraste do tooltip sobre os tiles. Os testes mobile expandem os painéis e percorrem a navegação inferior. Tiles e respostas de API são simulados, e o relatório HTML e as capturas ficam em `playwright-report/` e `playwright-artifacts/test-results/`.
- Teal identifica ação e ônibus; azul, localização; verde, atividade ao vivo; âmbar, parada selecionada ou favorita; laranja-queimado, atenção; vermelho, erro.
- Não usar a cor da API na rota do mapa nem o `textColor` sugerido pela API na etiqueta da linha.
- Ao alterar uma cor, atualizar este inventário e os dois temas.

## Tipografia

- fonte principal: `Inter`;
- títulos curtos e diretos;
- textos auxiliares discretos;
- evitar blocos longos de descrição dentro da UI.
- descrições de ônibus e paradas devem ser exibidas em caixa normal quando a API retornar caixa alta.

## Ícones

- biblioteca: `@lucide/vue`;
- shell, botões e cards usam Lucide;
- mapa usa marcadores customizados inspirados em ícones Lucide.

## Regras de UX atuais

- em `Ponto selecionado`, o endereço é o elemento de maior destaque;
- código do ponto fica em menor destaque;
- o badge do ônibus selecionado deve mostrar linha e minutos, como `8350 - 2 min`;
- o mapa não deve recentrar automaticamente a cada polling;
- com chave pública configurada, dark mode usa CartoDB Dark Matter no Leaflet;
- com chave pública configurada, light mode usa CartoDB Positron no Leaflet;
- sem chave CARTO, os mapas usam OpenStreetMap com atribuição visível e fallback visual escuro;
- marcadores de parada invertem contraste no dark mode;
- cards de previsão são ordenados pelo número da linha em ordem numérica; linhas iguais usam o menor tempo previsto como desempate;
- o card com menor tempo previsto válido recebe o rótulo e o destaque `Próximo`, independentemente da posição na lista;
- cards de previsão não mostram `vehicleId` nem texto auxiliar `Chegando`;
- durante uma atualização, previsões já carregadas permanecem visíveis; se a lista estiver vazia, são exibidos indicadores de carregamento em formato de cartão.
- em `Configurações`, os botões `Colorido` e `Monocromático` mostram uma prévia do mapa ao passar o mouse ou receber foco; a prévia respeita o tema ativo e mantém rota, ônibus e paradas coloridos.
