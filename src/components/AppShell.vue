<script setup lang="ts">
import type { NearbyStop } from '../domain/types';

export type DashboardSection = 'monitoramento' | 'mapa' | 'favoritos' | 'historico' | 'configuracoes';

defineProps<{
  lastUpdated: string | null;
  isLoading: boolean;
  activeSection: DashboardSection;
  searchQuery: string;
  searchResults: NearbyStop[];
}>();

const emit = defineEmits<{
  navigate: [section: DashboardSection];
  updateSearch: [query: string];
  selectStop: [stop: NearbyStop];
}>();

const navItems: { id: DashboardSection; label: string }[] = [
  { id: 'monitoramento', label: 'Monitoramento' },
  { id: 'mapa', label: 'Mapa' },
  { id: 'favoritos', label: 'Favoritos' },
  { id: 'historico', label: 'Histórico' },
  { id: 'configuracoes', label: 'Configurações' },
];
</script>

<template>
  <main class="dashboard-shell">
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="Ônibus BH">
        <span class="brand-icon">▣</span>
        <strong>Ônibus BH</strong>
      </a>

      <nav class="main-nav" aria-label="Navegação principal">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          :class="{ active: item.id === activeSection }"
          @click="emit('navigate', item.id)"
        >
          <span aria-hidden="true">{{ item.label.slice(0, 1) }}</span>
          {{ item.label }}
        </button>
      </nav>

      <div class="sidebar-footer">
        <span class="status-dot"></span>
        <span>{{ isLoading ? 'Atualizando agora' : 'Atualizando a cada 45s' }}</span>
      </div>
    </aside>

    <section class="app-workspace">
      <header class="topbar">
        <label class="search-box">
          <span class="sr-only">Buscar parada ou endereço</span>
          <input
            :value="searchQuery"
            placeholder="Buscar parada ou endereço"
            @input="emit('updateSearch', ($event.target as HTMLInputElement).value)"
          />
          <div v-if="searchQuery.trim().length > 0" class="search-results">
            <button
              v-for="stop in searchResults"
              :key="stop.code"
              type="button"
              @click="emit('selectStop', stop)"
            >
              <strong>{{ stop.publicCode || stop.code }}</strong>
              <span>{{ stop.description }}</span>
            </button>
            <p v-if="searchResults.length === 0">Nenhum ponto carregado encontrado.</p>
          </div>
        </label>
        <div class="topbar-status">
          <span class="status-dot"></span>
          {{ lastUpdated ? `Atualizado às ${lastUpdated}` : 'Aguardando atualização' }}
        </div>
        <button
          type="button"
          class="icon-button"
          aria-label="Configurações"
          @click="emit('navigate', 'configuracoes')"
        >
          ⚙
        </button>
      </header>

      <slot></slot>

      <nav class="mobile-nav" aria-label="Navegação inferior">
        <button
          v-for="item in navItems.slice(1)"
          :key="item.id"
          type="button"
          :class="{ active: item.id === activeSection }"
          @click="emit('navigate', item.id)"
        >
          {{ item.label }}
        </button>
      </nav>
    </section>
  </main>
</template>
