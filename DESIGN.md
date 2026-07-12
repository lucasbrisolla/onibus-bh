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

### Mapa

- elemento dominante;
- mostra parada, rota, localização e ônibus selecionado;
- ao selecionar um card, o mapa deve priorizar apenas aquele ônibus;
- o box principal do mapa deve usar número da linha, não `vehicleId`.

## Paleta

### Light mode

- primária: `#0D9488`
- hover primário: `#0F766E`
- destaque suave: `#F0FDFA`
- texto principal: `#101828`
- fundo geral: `#EEF2F7`

### Dark mode

- fundo base: `#081B1A`
- sidebar: `#0C2B29`
- topbar/cards principais: `#132F2D`
- primária: `#2DD4BF`
- hover primário: `#5EEAD4`
- destaque suave invertido: `#134E4A`
- texto claro: `#E5E7EB`

## Estados semânticos

- sucesso e atividade: verde;
- ação primária: teal;
- alerta/erro: vermelho com versão mais clara no dark mode;
- ônibus selecionado: destaque visual próprio no mapa e nos cards.

## Tipografia

- fonte principal: `Inter`;
- títulos curtos e diretos;
- textos auxiliares discretos;
- evitar blocos longos de descrição dentro da UI.

## Ícones

- biblioteca: `@lucide/vue`;
- shell, botões e cards usam Lucide;
- mapa usa marcadores customizados inspirados em ícones Lucide.

## Regras de UX atuais

- em `Ponto selecionado`, o endereço é o elemento de maior destaque;
- código do ponto fica em menor destaque;
- o badge do ônibus selecionado deve mostrar linha e minutos, como `8350 - 2 min`;
- o mapa não deve recentrar automaticamente a cada polling;
- dark mode também precisa afetar os tiles do mapa.
