# Backlog - Ônibus BH

## Contexto

- Projeto em `main`
- Diretório principal: `/home/lucas/onibus-bh`
- Ler primeiro: `README.md`, `RETOMADA.md`, `ARCHITECTURE.md`, `DESIGN.md`

## Estado atual consolidado

- Dashboard responsiva com sidebar e topbar
- Mapa Leaflet com tema claro/escuro
- Modo claro usa CartoDB Voyager; modo escuro usa CartoDB Dark Matter
- Seleção de parada pelo mapa ou busca
- Cards de previsão com seleção de ônibus específico
- Rota e posição do ônibus selecionado no mapa
- Filtro visual para mostrar apenas o ônibus clicado
- Geolocalização com marcador no mapa
- Bottom sheet mobile com estados `peek`, `half` e `full`
- Toggles compactos no mapa para mostrar pontos e alternar modo escuro no mobile
- Endpoints locais e serverless em `/api/*`
- Alertas básicos com `localStorage` e Notification API
- Sidebar e dark mode usando paleta teal
- Badge principal do mapa mostrando linha e minutos, como `8350 - 2 min`
- Viewport do mapa não deve mais dar zoom out a cada atualização
- O box textual de `Sua posição` já foi removido
- Cards de previsão não mostram `vehicleId` nem `Chegando`
- Textos em caixa alta vindos da SIU são normalizados visualmente para caixa normal

## Observações de domínio

- Previsões usam `cod` da parada
- A UI mostra `siu` quando existir
- A linha `8350` continua com tratamento específico
- A classificação da `8350` reconhece `Direto` e `Direta`
- Previsões programadas por horário de saída têm ids distintos por horário

## Pendentes

### Documentação e estrutura

- [ ] Revisar o `README` do GitHub e complementar com `LICENSE`, arquitetura, link da Vercel e instruções de execução local
- [ ] Criar `DATA_CONTRACT` para Vercel e servidor local, além de `HEALTH_CHECK` com script Python para validação automática de APIs e alertas
- [ ] Migrar a `LICENSE` para a pasta principal da home

### Produto e dados

- [ ] Criar uma análise estatística para estimar o horário em que o ônibus passou no ponto
- [ ] Verificar se existe histórico suficiente para inferir horários por ponto
- [ ] Revisar favoritos e histórico, que ainda estão como placeholders
- [ ] Evoluir PWA e notificações com app em segundo plano
- [ ] Validar build e fluxo de deploy na Vercel após os ajustes recentes
- [ ] Reduzir a complexidade de `App.vue` se continuar crescendo

### Busca, mapa e monitoramento

- [ ] Na busca, exibir também os ônibus; ao clicar em `8350`, mostrar as paradas no mapa
- [ ] Retirar `Usar localização` dos controles de monitoramento, por ser redundante com o mapa
- [ ] Renomear `Monitoramento` para `Mapa` na sidebar e trocar o `Mapa` atual para `Mapa 2`
- [ ] Migrar as seções antigas de monitoramento para `Mapa 2`
- [ ] Antes de tudo, garantir que ao clicar no ponto apareçam os principais ônibus que estão vindo
- [ ] Retirar a `Variante da 8350` e substituir por uma seleção dos tipos monitoráveis da linha, com possibilidade de marcar mais de um
- [ ] Definir melhor o comportamento das notificações na web e no celular
- [ ] Criar um botão para voltar o mapa para a localização atual
- [ ] Não exibir mais `Erro ao consultar pontos próximos`

### Favoritos, locais e preferências

- [ ] Buscar parada ou endereço deve mostrar favoritos primeiro, com endereço visível
- [ ] Favoritos salvos devem mostrar endereço, não apenas o número da parada
- [ ] Retirar o box de linha preferida
- [ ] Permitir salvar `Trabalho` e `Casa` localmente no dispositivo do usuário

### Interface e UX

- [ ] Refinar a paleta teal atual com bom contraste no modo escuro
- [ ] Manter ônibus em movimento em verde
- [ ] Ajustar ícones para estados como ativo, parado e em movimento
- [ ] Exibir linhas de itinerário dos ônibus
- [ ] `8350 Direto` e `Não Direto` não devem usar cores que passem sensação de certo e errado
- [ ] Retirar descrições explicativas para deixar a interface mais intuitiva
- [ ] Números de linha e códigos de parada devem ter tratamento tipográfico diferenciado
- [ ] Melhorar o contraste do texto secundário e de itens inativos para atender melhor ao WCAG AA
- [ ] Fixar melhor a semântica de cores: verde para status/sistema; teal para interação primária e identidade
- [ ] Definir se o pin laranja é uma cor semântica exclusiva e reforçar esse padrão em outros pontos da UI
- [ ] Diferenciar visualmente setup/configuração de ações principais
- [ ] Considerar esconder a variante da `8350` por padrão, se ainda existir algum controle equivalente
- [ ] Acesso rápido de Paradas sem ter que ficar clicando na aba Favoritos


## Validação recomendada

```sh
npm run test
npm run lint
npm run build
```

## Arquivos mais sensíveis

- `src/App.vue`
- `src/components/MapView.vue`
- `src/components/MonitoringPanel.vue`
- `src/services/mapDataService.ts`
- `src/server/localApiRouter.ts`
- `src/server/normalizers.ts`

## Concluídos

- [x] Atualização a cada 10 segundos
- [x] Sidebar com ícones do Lucide
- [x] Em `Ponto Selecionado`, o destaque principal agora é o endereço; o ponto ficou com menor destaque
- [x] Modo escuro e botão correspondente na sidebar
- [x] Retirar aviso de rota disponível quando houver veículo em operação
- [x] Retirar `use sua localização para encontrar pontos perto`
- [x] Corrigir sobreposição entre `Monitoramento Ativo` e `Pausar Monitoramento`
- [x] Deixar os cards/boxes dos ônibus mais enxutos e mais acima na página
- [x] Mudar todas as interfaces para a fonte Inter
- [x] Retirar menções redundantes a `Monitoramento ativo` do mapa
- [x] Retirar o box `Mapa` dentro da própria tela de mapa
- [x] Tornar a parte de monitoramento colapsável e deixá-la recolhida por padrão
- [x] Remover as letras iniciais das abas na sidebar
- [x] Remover o box textual `Sua posição`
- [x] Corrigir o ícone gerado ao instalar/criar atalho no celular e também na web
- [x] Usar CartoDB Voyager no modo claro e CartoDB Dark Matter no modo escuro
- [x] Adicionar toggle compacto `Mostrar pontos` no mapa
- [x] Adicionar toggle compacto `Modo escuro` no mapa mobile
- [x] Melhorar o `MobileBottomSheet` com estados `peek`, `half` e `full`
- [x] Reduzir tipografia e altura dos boxes no mobile
- [x] Remover header redundante do card de parada selecionada
- [x] Remover `vehicleId` e `Chegando` dos cards de previsão
- [x] Corrigir seleção duplicada de previsões programadas com mesmo itinerário
- [x] Normalizar visualmente descrições em caixa alta para caixa normal
- [x] Corrigir `Direta` da linha `8350` para variante direta
- [x] Diferenciar visualmente `Direto` e `Não Direto` nos cards
- [x] Fazer o FAB de localização usar a paleta teal
- [x] Inverter contraste dos marcadores de parada no dark mode
- [x] Animar a rota com linha roxa contínua e traço interno sutil
