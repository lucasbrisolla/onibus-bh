<script setup lang="ts">
defineProps<{
  lastUpdated: string | null;
  isLoading: boolean;
}>();

const navItems = ['Monitoramento', 'Mapa', 'Favoritos', 'Histórico', 'Configurações'];
</script>

<template>
  <main class="dashboard-shell">
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="Ônibus BH">
        <span class="brand-icon">▣</span>
        <strong>Ônibus BH</strong>
      </a>

      <nav class="main-nav" aria-label="Navegação principal">
        <a
          v-for="item in navItems"
          :key="item"
          href="#"
          :class="{ active: item === 'Monitoramento' }"
        >
          <span aria-hidden="true">{{ item.slice(0, 1) }}</span>
          {{ item }}
        </a>
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
          <input placeholder="Buscar parada ou endereço" />
        </label>
        <div class="topbar-status">
          <span class="status-dot"></span>
          {{ lastUpdated ? `Atualizado às ${lastUpdated}` : 'Aguardando atualização' }}
        </div>
        <button type="button" class="icon-button" aria-label="Configurações">⚙</button>
      </header>

      <slot></slot>

      <nav class="mobile-nav" aria-label="Navegação inferior">
        <a v-for="item in navItems.slice(1)" :key="item" href="#">
          {{ item }}
        </a>
      </nav>
    </section>
  </main>
</template>
