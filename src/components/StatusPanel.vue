<script setup lang="ts">
defineProps<{
  enabled: boolean;
  permission: string;
  lastUpdated: string | null;
  message: string;
  isLoading: boolean;
}>();
</script>

<template>
  <section class="panel status-grid tw:grid tw:gap-3 tw:rounded-[10px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]">
    <div class="tw:grid tw:gap-1">
      <span class="label tw:text-bh-primary tw:text-[0.72rem] tw:font-black tw:uppercase">Monitoramento</span>
      <strong class="tw:text-bh-title tw:dark:text-[#f9fafb]">{{ enabled ? 'Ativo' : 'Pausado' }}</strong>
    </div>
    <div class="tw:grid tw:gap-1">
      <span class="label tw:text-bh-primary tw:text-[0.72rem] tw:font-black tw:uppercase">Notificações</span>
      <strong class="tw:text-bh-title tw:dark:text-[#f9fafb]">{{ permission }}</strong>
    </div>
    <div class="tw:grid tw:gap-1">
      <span class="label tw:text-bh-primary tw:text-[0.72rem] tw:font-black tw:uppercase">Última consulta</span>
      <strong class="tw:text-bh-title tw:dark:text-[#f9fafb]">{{ isLoading ? 'Consultando...' : (lastUpdated ?? 'Ainda não consultou') }}</strong>
    </div>
    <p class="status-message tw:m-0 tw:text-bh-copy tw:leading-[1.35] tw:dark:text-[#9eb7b4]">{{ message }}</p>
  </section>
</template>
