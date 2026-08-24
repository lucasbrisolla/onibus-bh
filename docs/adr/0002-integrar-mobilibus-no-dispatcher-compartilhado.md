# Integrar Mobilibus no dispatcher HTTP compartilhado

As rotas Mobilibus serão reconhecidas pelo dispatcher HTTP compartilhado, que receberá operações Mobilibus explícitas implementadas por módulos próprios de client e normalização. Manter uma única fonte de verdade para roteamento e envelopes preserva a paridade entre Vite e Vercel, enquanto separar as operações por fonte evita tanto um segundo dispatcher quanto uma abstração genérica prematura que fingiria equivalência entre SIU municipal e Mobilibus.
