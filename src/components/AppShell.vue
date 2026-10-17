<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { BusFront, History, LayoutDashboard, MapPinned, MoonStar, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Settings, Star, Sun } from '@lucide/vue';
import { computed, ref, toRefs } from 'vue';
import type { NearbyStop } from '../domain/types';

export type DashboardSection =
  | 'monitoramento'
  | 'mapa'
  | 'linhas'
  | 'favoritos'
  | 'historico'
  | 'configuracoes';

const props = defineProps<{
  lastUpdated: string | null;
  isLoading: boolean;
  activeSection: DashboardSection;
  searchQuery: string;
  searchResults: NearbyStop[];
  themeMode: 'light' | 'dark';
}>();
const { lastUpdated, isLoading, activeSection, searchQuery, searchResults, themeMode } = toRefs(props);

const emit = defineEmits<{
  navigate: [section: DashboardSection];
  updateSearch: [query: string];
  selectStop: [stop: NearbyStop];
  toggleTheme: [];
}>();

const isSidebarOpen = ref(true);
const isMoreMenuOpen = ref(false);
const moreToggleRef = ref<HTMLButtonElement | null>(null);
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
  { id: 'monitoramento', label: 'Alerta', icon: LayoutDashboard },
  { id: 'linhas', label: 'Ótimo', icon: BusFront },
  { id: 'favoritos', label: 'Favoritos', icon: Star },
  { id: 'historico', label: 'Histórico', icon: History },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

const mobileNavItems = navItems.filter(
  item => item.id === 'mapa' || item.id === 'monitoramento' || item.id === 'favoritos',
);
const mobileMoreItems = navItems.filter(
  item => item.id === 'linhas' || item.id === 'historico' || item.id === 'configuracoes',
);
const isMoreSectionActive = computed(() =>
  mobileMoreItems.some(item => item.id === activeSection.value),
);
const showSearch = computed(() =>
  activeSection.value === 'mapa' ||
  activeSection.value === 'monitoramento' ||
  activeSection.value === 'linhas',
);

function navigateTo(section: DashboardSection) {
  isMoreMenuOpen.value = false;
  emit('navigate', section);
}

function toggleMoreMenu() {
  isMoreMenuOpen.value = !isMoreMenuOpen.value;
}

function closeMoreMenu() {
  isMoreMenuOpen.value = false;
  moreToggleRef.value?.focus();
}

function closeMoreMenuOutside(event: PointerEvent) {
  const target = event.target;
  if (
    isMoreMenuOpen.value &&
    target instanceof Element &&
    !target.closest('.mobile-more-menu, .mobile-more-toggle')
  ) {
    isMoreMenuOpen.value = false;
  }
}
</script>

<template>
  <main
    class="dashboard-shell tw:grid tw:min-h-screen tw:grid-cols-[240px_minmax(0,1fr)] tw:bg-bh-surface-0 tw:transition-[grid-template-columns] tw:duration-[180ms] tw:ease-out tw:max-[920px]:grid-cols-1 tw:dark:bg-bh-surface-0"
    :class="{ 'tw:grid-cols-[minmax(0,1fr)]': !isSidebarOpen }"
  >
    <aside
      v-show="isSidebarOpen"
      class="sidebar tw:flex tw:min-w-0 tw:flex-col tw:gap-8 tw:bg-[#0f2e2c] tw:p-[26px_18px] tw:text-[#f9fafb] tw:max-[920px]:hidden tw:dark:bg-bh-surface-1"
    >
      <a class="brand tw:inline-flex tw:items-center tw:gap-2.5 tw:text-[1.18rem] tw:text-inherit tw:no-underline" href="#" aria-label="Ônibus BH">
        <span class="brand-icon tw:grid tw:size-[30px] tw:place-items-center tw:rounded-lg tw:bg-bh-primary tw:text-bh-on-primary" aria-hidden="true">
          <BusFront class="tw:size-[18px] tw:stroke-[2.2]" />
        </span>
        <strong>Ônibus BH</strong>
      </a>

      <nav class="main-nav tw:grid tw:gap-2" aria-label="Navegação principal">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          class="tw:flex tw:items-center tw:gap-2.5 tw:border-0 tw:p-3 tw:text-left tw:transition-colors tw:duration-[160ms]"
          :class="item.id === activeSection
            ? 'tw:bg-bh-primary tw:text-bh-on-primary'
            : 'tw:bg-transparent tw:text-[#99f6e4]'"
          :aria-current="item.id === activeSection ? 'page' : undefined"
          @click="navigateTo(item.id)"
        >
          <component :is="item.icon" class="tw:shrink-0 tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
          {{ item.label }}
        </button>
      </nav>

      <button
        type="button"
        role="switch"
        :aria-checked="themeMode === 'dark'"
        aria-label="Modo escuro"
        class="theme-toggle tw:flex tw:min-h-11 tw:items-center tw:justify-between tw:gap-3 tw:border tw:border-[var(--bh-focus-16)] tw:bg-[var(--bh-focus-08)] tw:px-3.5 tw:py-2.5 tw:text-[#c7d7d4] tw:hover:bg-[var(--bh-focus-16)] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#5eead4]"
        @click="emit('toggleTheme')"
      >
        <span class="tw:inline-flex tw:items-center tw:gap-2.5">
          <component :is="themeMode === 'dark' ? MoonStar : Sun" class="tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
          Modo escuro
        </span>
        <span class="tw:inline-flex tw:w-11 tw:shrink-0 tw:items-center tw:rounded-full tw:bg-[#667085] tw:p-[3px] tw:transition-colors" :class="themeMode === 'dark' ? 'tw:bg-[#0d9488]' : ''" aria-hidden="true">
          <span class="tw:size-[18px] tw:translate-x-0 tw:rounded-full tw:bg-white tw:shadow-sm tw:transition-transform" :class="themeMode === 'dark' ? 'tw:translate-x-5' : ''"></span>
        </span>
      </button>

      <div
        class="sidebar-footer tw:mt-auto tw:flex tw:items-center tw:gap-2.5 tw:border-t tw:border-[var(--bh-focus-16)] tw:pt-[18px] tw:text-[0.86rem] tw:font-semibold tw:text-[#c7d7d4]"
        role="status"
        aria-live="polite"
        :aria-label="lastUpdated
          ? `${isLoading ? 'Atualizando' : 'Ao vivo'}, atualizado às ${lastUpdated}`
          : 'Aguardando a primeira atualização'"
        :title="lastUpdated ? `Atualizado às ${lastUpdated}` : 'Aguardando a primeira atualização'"
      >
        <span
          class="status-dot tw:size-[9px] tw:shrink-0 tw:rounded-full tw:bg-green-400 tw:shadow-[0_0_0_4px_var(--bh-success-16)]"
          :class="{ 'tw:animate-pulse': isLoading }"
          aria-hidden="true"
        ></span>
        <span>{{ isLoading ? 'Atualizando' : lastUpdated ? 'Ao vivo' : 'Aguardando' }}</span>
      </div>
    </aside>

    <section
      class="app-workspace tw:relative tw:grid tw:min-w-0 tw:grid-rows-[auto_minmax(0,1fr)]"
      @pointerdown="closeMoreMenuOutside"
    >
      <header
        class="topbar tw:z-[900] tw:grid tw:items-center tw:gap-4 tw:border-b tw:border-[#e4e7ec] tw:bg-[var(--bh-glass-white-88)] tw:px-[22px] tw:py-[18px] tw:backdrop-blur-[16px] tw:max-[920px]:grid-cols-1 tw:max-[920px]:px-3.5 tw:max-[920px]:py-3 tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb]"
        :class="showSearch ? 'tw:grid-cols-[auto_minmax(240px,420px)_auto]' : 'tw:grid-cols-[auto_minmax(0,1fr)]'"
      >
        <button
          type="button"
          class="icon-button sidebar-toggle tw:justify-self-start tw:grid tw:size-[42px] tw:place-items-center tw:p-0 tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset tw:dark:text-[#e5e7eb] tw:max-[920px]:hidden"
          :aria-label="isSidebarOpen ? 'Recolher sidebar' : 'Abrir sidebar'"
          @click="toggleSidebar"
        >
          <PanelLeftClose v-if="isSidebarOpen" class="tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
          <PanelLeftOpen v-else class="tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
        </button>
        <label v-if="showSearch" class="search-box tw:relative tw:max-[920px]:hidden">
          <span class="tw:sr-only">Buscar parada ou endereço</span>
          <input
            :class="themeMode === 'dark'
              ? 'tw:border-[#28514d] tw:bg-[#0f2423] tw:text-[#e5e7eb]'
              : 'tw:border-[#d0d5dd] tw:bg-[#f2f4f7] tw:text-bh-text'
            "
            :value="searchQuery"
            placeholder="Buscar parada ou endereço"
            @input="emit('updateSearch', ($event.target as HTMLInputElement).value)"
          />
          <div
            v-if="searchQuery.trim().length > 0"
            class="search-results tw:absolute tw:left-0 tw:top-[calc(100%+8px)] tw:z-[1200] tw:grid tw:w-[min(440px,calc(100vw-44px))] tw:gap-1.5 tw:rounded-lg tw:border tw:border-[#e4e7ec] tw:bg-white tw:p-2 tw:shadow-[0_22px_60px_var(--bh-shadow-16)] tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb]"
          >
            <button
              v-for="stop in searchResults"
              :key="stop.code"
              type="button"
              class="tw:grid tw:gap-[3px] tw:border-0 tw:p-[10px_12px] tw:text-left"
              :class="themeMode === 'dark'
                ? 'tw:bg-bh-surface-inset tw:hover:bg-bh-surface-3'
                : 'tw:bg-[#f9fafb] tw:hover:bg-[#f2f4f7]'
              "
              @click="emit('selectStop', stop)"
            >
              <strong class="tw:text-bh-primary-hover tw:dark:text-[#5eead4]">{{ stop.publicCode || stop.code }}</strong>
              <span class="tw:m-0 tw:text-bh-muted tw:text-[0.82rem] tw:font-semibold tw:dark:text-[#9eb7b4]">{{ stop.description }}</span>
            </button>
            <p v-if="searchResults.length === 0" class="tw:m-0 tw:text-bh-muted tw:text-[0.82rem] tw:font-semibold tw:dark:text-[#9eb7b4]">Nenhum ponto carregado encontrado.</p>
          </div>
        </label>
      </header>

      <slot :is-sidebar-open="isSidebarOpen"></slot>

      <nav
        class="mobile-nav tw:fixed tw:inset-x-0 tw:bottom-0 tw:z-[1100] tw:hidden tw:grid-cols-4 tw:border-t tw:border-bh-border tw:bg-[var(--bh-glass-white)] tw:pb-[env(safe-area-inset-bottom)] tw:shadow-[0_-8px_24px_var(--bh-shadow-08)] tw:backdrop-blur-[16px] tw:max-[920px]:grid"
        :class="themeMode === 'dark' ? 'tw:border-[#1f4a47] tw:bg-[var(--bh-surface-2)]' : ''"
        aria-label="Navegação inferior"
        @keydown.esc="closeMoreMenu"
      >
        <div
          v-show="isMoreMenuOpen"
          id="mobile-more-menu"
          class="mobile-more-menu tw:absolute tw:inset-x-3 tw:bottom-[calc(100%+10px)] tw:grid tw:gap-1.5 tw:rounded-[14px] tw:border tw:border-[#d0d5dd] tw:bg-white tw:p-2 tw:shadow-[0_14px_36px_var(--bh-shadow-16)] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2"
          role="group"
          aria-label="Mais opções"
        >
          <button
            v-for="item in mobileMoreItems"
            :key="item.id"
            type="button"
            class="tw:flex tw:min-h-11 tw:items-center tw:gap-3 tw:rounded-lg tw:border-0 tw:bg-transparent tw:px-3 tw:text-left tw:text-[0.9rem] tw:font-semibold tw:text-[#344054] tw:transition-colors tw:hover:bg-[#f2f4f7] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-1 tw:focus-visible:outline-bh-accent tw:dark:focus-visible:outline-[#5eead4] tw:dark:text-[#c7d7d4] tw:dark:hover:bg-bh-surface-3"
            :class="item.id === activeSection ? 'tw:bg-[#f0fdfa] tw:text-[#0f766e] tw:dark:bg-[#134e4a] tw:dark:text-[#5eead4]' : ''"
            :aria-current="item.id === activeSection ? 'page' : undefined"
            @click="navigateTo(item.id)"
          >
            <component :is="item.icon" class="tw:size-[18px] tw:shrink-0 tw:stroke-[2.2]" aria-hidden="true" />
            {{ item.label }}
          </button>
          <div class="tw:my-1 tw:border-t tw:border-[#e4e7ec] tw:dark:border-[#28514d]"></div>
          <button
            type="button"
            role="switch"
            :aria-checked="themeMode === 'dark'"
            aria-label="Modo escuro"
            class="tw:flex tw:min-h-11 tw:items-center tw:justify-between tw:gap-3 tw:rounded-lg tw:border-0 tw:bg-transparent tw:px-3 tw:text-[0.9rem] tw:font-semibold tw:text-[#344054] tw:transition-colors tw:hover:bg-[#f2f4f7] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-1 tw:focus-visible:outline-bh-accent tw:dark:focus-visible:outline-[#5eead4] tw:dark:text-[#c7d7d4] tw:dark:hover:bg-bh-surface-3"
            @click="emit('toggleTheme')"
          >
            <span class="tw:inline-flex tw:items-center tw:gap-3">
              <component :is="themeMode === 'dark' ? MoonStar : Sun" class="tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
              Modo escuro
            </span>
            <span class="tw:inline-flex tw:w-11 tw:shrink-0 tw:items-center tw:rounded-full tw:bg-[#667085] tw:p-[3px] tw:transition-colors" :class="themeMode === 'dark' ? 'tw:bg-[#0d9488]' : ''" aria-hidden="true">
              <span class="tw:size-[18px] tw:translate-x-0 tw:rounded-full tw:bg-white tw:shadow-sm tw:transition-transform" :class="themeMode === 'dark' ? 'tw:translate-x-5' : ''"></span>
            </span>
          </button>
        </div>
        <button
          v-for="item in mobileNavItems"
          :key="item.id"
          type="button"
          class="mobile-nav-item tw:flex tw:min-h-[58px] tw:flex-col tw:items-center tw:justify-center tw:gap-1 tw:border-0 tw:bg-transparent tw:px-1 tw:py-2 tw:text-center tw:text-[0.76rem] tw:font-semibold tw:text-[#475467] tw:transition-colors tw:focus-visible:outline-2 tw:focus-visible:outline-offset-[-3px] tw:focus-visible:outline-bh-accent tw:dark:focus-visible:outline-[#5eead4] tw:dark:text-[#c7d7d4]"
          :class="[
            { active: item.id === activeSection },
            themeMode === 'dark'
              ? item.id === activeSection
                ? 'tw:text-[#5eead4] tw:font-extrabold'
                : ''
              : item.id === activeSection
                ? 'tw:text-[#0f766e] tw:font-extrabold'
                : '',
          ]"
          :aria-current="item.id === activeSection ? 'page' : undefined"
          @click="navigateTo(item.id)"
        >
          <component :is="item.icon" class="tw:shrink-0 tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
          {{ item.label }}
        </button>
        <button
          type="button"
          ref="moreToggleRef"
          class="mobile-more-toggle tw:flex tw:min-h-[58px] tw:flex-col tw:items-center tw:justify-center tw:gap-1 tw:border-0 tw:bg-transparent tw:px-1 tw:py-2 tw:text-center tw:text-[0.76rem] tw:font-semibold tw:text-[#475467] tw:transition-colors tw:focus-visible:outline-2 tw:focus-visible:outline-offset-[-3px] tw:focus-visible:outline-bh-accent tw:dark:focus-visible:outline-[#5eead4] tw:dark:text-[#c7d7d4]"
          :class="[
            { active: isMoreMenuOpen || isMoreSectionActive },
            themeMode === 'dark'
              ? isMoreMenuOpen || isMoreSectionActive
                ? 'tw:text-[#5eead4] tw:font-extrabold'
                : ''
              : isMoreMenuOpen || isMoreSectionActive
                ? 'tw:text-[#0f766e] tw:font-extrabold'
                : '',
          ]"
          :aria-expanded="isMoreMenuOpen"
          aria-controls="mobile-more-menu"
          :aria-current="isMoreSectionActive ? 'page' : undefined"
          @click="toggleMoreMenu"
        >
          <MoreHorizontal class="tw:size-[18px] tw:stroke-[2.2]" aria-hidden="true" />
          Mais
        </button>
      </nav>
    </section>
  </main>
</template>
