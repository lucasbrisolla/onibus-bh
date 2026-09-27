<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { BusFront, ChevronLeft, History, LayoutDashboard, MapPinned, Menu, MoonStar, Settings, Star, Sun } from '@lucide/vue';
import { ref } from 'vue';
import type { NearbyStop } from '../domain/types';

export type DashboardSection =
  | 'monitoramento'
  | 'mapa'
  | 'linhas'
  | 'favoritos'
  | 'historico'
  | 'configuracoes';

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
const dispatchDelayedResize = useDebounceFn(() => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('resize'));
  }
}, 220);

function syncLayoutAfterSidebarToggle() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event('resize'));
  // Run again after the grid transition so Leaflet can refill tiles.
  dispatchDelayedResize();
}

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value;
  syncLayoutAfterSidebarToggle();
}

const navItems: { id: DashboardSection; label: string; icon: typeof BusFront }[] = [
  { id: 'mapa', label: 'Mapa', icon: MapPinned },
  { id: 'monitoramento', label: 'Monitoramento', icon: LayoutDashboard },
  { id: 'linhas', label: 'Ótimo', icon: BusFront },
  { id: 'favoritos', label: 'Favoritos', icon: Star },
  { id: 'historico', label: 'Histórico', icon: History },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

const mobileNavItems = navItems.filter(item => item.id !== 'historico');
</script>

<template>
  <main
    class="dashboard-shell tw:grid tw:min-h-screen tw:grid-cols-[240px_minmax(0,1fr)] tw:bg-slate-50 tw:transition-[grid-template-columns] tw:duration-[180ms] tw:ease-out tw:max-[920px]:grid-cols-1 tw:dark:bg-[#081b1a]"
    :class="{ 'is-sidebar-hidden': !isSidebarOpen, 'tw:grid-cols-[minmax(0,1fr)]': !isSidebarOpen }"
  >
    <aside
      v-show="isSidebarOpen"
      class="sidebar tw:flex tw:min-w-0 tw:flex-col tw:gap-8 tw:bg-[#0f2e2c] tw:p-[26px_18px] tw:text-slate-50 tw:max-[920px]:hidden tw:dark:bg-[#0c2b29]"
    >
      <a class="brand tw:inline-flex tw:items-center tw:gap-2.5 tw:text-[1.18rem] tw:text-inherit tw:no-underline" href="#" aria-label="Ônibus BH">
        <span class="brand-icon tw:grid tw:size-[30px] tw:place-items-center tw:rounded-lg tw:bg-green-500 tw:text-[#07111f]" aria-hidden="true">
          <BusFront class="tw:size-[18px] tw:stroke-[2.2]" />
        </span>
        <strong>Ônibus BH</strong>
      </a>

      <nav class="main-nav tw:grid tw:gap-2" aria-label="Navegação principal">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          class="tw:flex tw:items-center tw:gap-2.5 tw:border-0! tw:p-3! tw:text-left tw:transition-colors tw:duration-[160ms]"
          :class="{
            active: item.id === activeSection,
            'tw:bg-transparent!': item.id !== activeSection,
            'tw:text-[rgba(94,234,212,0.72)]!': item.id !== activeSection && themeMode !== 'dark',
            'tw:bg-[#0d9488]!': item.id === activeSection && themeMode !== 'dark',
            'tw:text-white!': item.id === activeSection && themeMode !== 'dark',
            'tw:bg-[#2dd4bf]!': item.id === activeSection && themeMode === 'dark',
            'tw:text-[#0c2b29]!': item.id === activeSection && themeMode === 'dark',
            'tw:text-[rgba(94,234,212,0.64)]!': item.id !== activeSection && themeMode === 'dark',
          }"
          @click="emit('navigate', item.id)"
        >
          <component :is="item.icon" class="tw:shrink-0 tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
          {{ item.label }}
        </button>
      </nav>

      <button
        type="button"
        class="theme-toggle tw:flex tw:items-center tw:gap-2.5 tw:border tw:border-[rgba(94,234,212,0.18)]! tw:bg-[rgba(94,234,212,0.08)]! tw:px-3.5 tw:py-2.5! tw:text-[#d5fbf4]! tw:hover:bg-[rgba(94,234,212,0.14)]!"
        :aria-label="themeMode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'"
        @click="emit('toggleTheme')"
      >
        <component :is="themeMode === 'dark' ? Sun : MoonStar" class="tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
        {{ themeMode === 'dark' ? 'Modo claro' : 'Modo escuro' }}
      </button>

      <div class="sidebar-footer tw:mt-auto tw:grid tw:grid-cols-[auto_minmax(0,1fr)] tw:items-start tw:gap-x-2.5 tw:gap-y-2 tw:border-t tw:border-[rgba(94,234,212,0.12)] tw:pt-[18px] tw:text-[0.86rem] tw:text-[#c7ede8]">
        <span class="status-dot tw:size-[9px] tw:rounded-full tw:bg-green-500 tw:shadow-[0_0_0_4px_rgba(34,197,94,0.14)]"></span>
        <div class="sidebar-status-copy tw:grid tw:gap-[3px]">
          <span>{{ isLoading ? 'Atualizando agora' : 'Atualizando a cada 10s' }}</span>
          <span class="tw:text-[0.78rem] tw:text-[rgba(148,163,184,0.9)]">{{ lastUpdated ? `Atualizado às ${lastUpdated}` : 'Aguardando atualização' }}</span>
        </div>
      </div>
    </aside>

    <section class="app-workspace tw:relative tw:grid tw:min-w-0 tw:grid-rows-[auto_minmax(0,1fr)]">
      <header class="topbar tw:z-[900] tw:grid tw:grid-cols-[auto_minmax(240px,420px)_auto] tw:items-center tw:gap-4 tw:border-b tw:border-[#e4e7ec] tw:bg-white/[0.88] tw:px-[22px] tw:py-[18px] tw:backdrop-blur-[16px] tw:max-[920px]:grid-cols-1 tw:max-[920px]:px-3.5 tw:max-[920px]:py-3 tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]"
      >
        <button
          type="button"
          class="icon-button sidebar-toggle tw:justify-self-start tw:grid tw:size-[42px] tw:place-items-center tw:p-0! tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#e5e7eb] tw:max-[920px]:hidden"
          :aria-label="isSidebarOpen ? 'Recolher sidebar' : 'Abrir sidebar'"
          @click="toggleSidebar"
        >
          <ChevronLeft v-if="isSidebarOpen" class="tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
          <Menu v-else class="tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
        </button>
        <label class="search-box tw:relative tw:max-[920px]:hidden">
          <span class="tw:sr-only">Buscar parada ou endereço</span>
          <input
            :class="themeMode === 'dark'
              ? 'tw:border-[#28514d]! tw:bg-[#0f2423]! tw:text-[#e5e7eb]!'
              : 'tw:border-[#d0d5dd]! tw:bg-[#f2f4f7]! tw:text-bh-text!'
            "
            :value="searchQuery"
            placeholder="Buscar parada ou endereço"
            @input="emit('updateSearch', ($event.target as HTMLInputElement).value)"
          />
          <div
            v-if="searchQuery.trim().length > 0"
            class="search-results tw:absolute tw:left-0 tw:top-[calc(100%+8px)] tw:z-[1200] tw:grid tw:w-[min(440px,calc(100vw-44px))] tw:gap-1.5 tw:rounded-lg tw:border tw:border-[#e4e7ec] tw:bg-white tw:p-2 tw:shadow-[0_22px_60px_rgba(16,24,40,0.18)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]"
          >
            <button
              v-for="stop in searchResults"
              :key="stop.code"
              type="button"
              class="tw:grid tw:gap-[3px] tw:border-0! tw:p-[10px_12px]! tw:text-left"
              :class="themeMode === 'dark'
                ? 'tw:bg-[#0f2423]! tw:hover:bg-[#163735]!'
                : 'tw:bg-[#f8fafc]! tw:hover:bg-[#ecfdf5]!'
              "
              @click="emit('selectStop', stop)"
            >
              <strong class="tw:text-bh-primary-hover tw:dark:text-[#5eead4]">{{ stop.publicCode || stop.code }}</strong>
              <span class="tw:m-0 tw:text-bh-muted tw:text-[0.82rem] tw:font-semibold tw:dark:text-[#9eb7b4]">{{ stop.description }}</span>
            </button>
            <p v-if="searchResults.length === 0" class="tw:m-0 tw:text-bh-muted tw:text-[0.82rem] tw:font-semibold tw:dark:text-[#9eb7b4]">Nenhum ponto carregado encontrado.</p>
          </div>
        </label>
        <button
          type="button"
          class="icon-button tw:grid tw:size-[42px] tw:place-items-center tw:p-0! tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#e5e7eb] tw:max-[920px]:hidden"
          aria-label="Configurações"
          @click="emit('navigate', 'configuracoes')"
        >
          <Settings class="tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
        </button>
      </header>

      <slot></slot>

      <nav
        class="mobile-nav tw:fixed tw:inset-x-0 tw:bottom-0 tw:z-[1100] tw:hidden tw:grid-cols-5 tw:border-t tw:border-bh-border tw:bg-white/[.95] tw:backdrop-blur-[16px] tw:max-[920px]:grid"
        :class="themeMode === 'dark' ? 'tw:border-[#1f4a47]! tw:bg-[rgba(19,47,45,0.95)]!' : ''"
        aria-label="Navegação inferior"
      >
        <button
          v-for="item in mobileNavItems"
          :key="item.id"
          type="button"
          class="tw:flex tw:flex-col tw:items-center tw:gap-1 tw:border-0 tw:bg-transparent tw:px-1.5 tw:py-3 tw:text-center tw:text-[0.78rem] tw:text-bh-muted"
          :class="[
            { active: item.id === activeSection },
            themeMode === 'dark'
              ? item.id === activeSection
                ? 'tw:border-0! tw:bg-transparent! tw:text-[#5eead4]! tw:font-black!'
                : 'tw:border-0! tw:bg-transparent! tw:text-[#9eb7b4]!'
              : item.id === activeSection
                ? 'tw:text-bh-primary tw:font-black'
                : '',
          ]"
          @click="emit('navigate', item.id)"
        >
          <component :is="item.icon" class="tw:shrink-0 tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
          {{ item.label }}
        </button>
      </nav>
    </section>
  </main>
</template>
