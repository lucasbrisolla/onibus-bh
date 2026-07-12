<script setup lang="ts">
import { BusFront, ChevronLeft, History, LayoutDashboard, MapPinned, Menu, MoonStar, Settings, Star, Sun } from '@lucide/vue';
import { ref } from 'vue';
import type { NearbyStop } from '../domain/types';

export type DashboardSection = 'monitoramento' | 'mapa' | 'favoritos' | 'historico' | 'configuracoes';

defineProps<{
  lastUpdated: string | null;
  isLoading: boolean;
  activeSection: DashboardSection;
  searchQuery: string;
  searchResults: NearbyStop[];
  themeMode: 'light' | 'dark';
}>();

const emit = defineEmits<{
  navigate: [section: DashboardSection];
  updateSearch: [query: string];
  selectStop: [stop: NearbyStop];
  toggleTheme: [];
}>();

const isSidebarOpen = ref(true);
let sidebarResizeTimeoutId: number | null = null;

function syncLayoutAfterSidebarToggle() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event('resize'));

  if (sidebarResizeTimeoutId !== null) {
    window.clearTimeout(sidebarResizeTimeoutId);
  }

  // Run again after the grid transition so Leaflet can refill tiles.
  sidebarResizeTimeoutId = window.setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
    sidebarResizeTimeoutId = null;
  }, 220);
}

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value;
  syncLayoutAfterSidebarToggle();
}

const navItems: { id: DashboardSection; label: string; icon: typeof BusFront }[] = [
  { id: 'monitoramento', label: 'Mapa', icon: LayoutDashboard },
  { id: 'mapa', label: 'Mapa 2', icon: MapPinned },
  { id: 'favoritos', label: 'Favoritos', icon: Star },
  { id: 'historico', label: 'Histórico', icon: History },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];
</script>

<template>
  <main class="dashboard-shell" :class="{ 'is-sidebar-hidden': !isSidebarOpen }">
    <aside v-show="isSidebarOpen" class="sidebar">
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
          <component :is="item.icon" aria-hidden="true" />
          {{ item.label }}
        </button>
      </nav>

      <button
        type="button"
        class="theme-toggle"
        :aria-label="themeMode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'"
        @click="emit('toggleTheme')"
      >
        <component :is="themeMode === 'dark' ? Sun : MoonStar" aria-hidden="true" />
        {{ themeMode === 'dark' ? 'Modo claro' : 'Modo escuro' }}
      </button>

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
        <button
          type="button"
          class="icon-button sidebar-toggle"
          :aria-label="isSidebarOpen ? 'Recolher sidebar' : 'Abrir sidebar'"
          @click="toggleSidebar"
        >
          <ChevronLeft v-if="isSidebarOpen" aria-hidden="true" />
          <Menu v-else aria-hidden="true" />
        </button>
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
          <component :is="item.icon" aria-hidden="true" />
          {{ item.label }}
        </button>
      </nav>
    </section>
  </main>
</template>
