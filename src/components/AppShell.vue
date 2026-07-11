<script setup lang="ts">
import { BusFront, Settings } from '@lucide/vue';
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
        <span class="brand-icon" aria-hidden="true">
          <BusFront />
        </span>
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
          {{ item.label }}
        </button>
      </nav>

      <div class="sidebar-footer">
        <span class="status-dot"></span>
        <div class="sidebar-status-copy">
          <span>{{ isLoading ? 'Atualizando agora' : 'Atualizando a cada 10s' }}</span>
          <span>{{ lastUpdated ? `Atualizado às ${lastUpdated}` : 'Aguardando atualização' }}</span>
        </div>
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
        <button
          type="button"
          class="icon-button"
          aria-label="Configurações"
          @click="emit('navigate', 'configuracoes')"
        >
          <Settings aria-hidden="true" />
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
