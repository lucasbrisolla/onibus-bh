<script setup lang="ts">
defineProps<{
  enabled: boolean;
  permission: string;
  lastUpdated: string | null;
  message: string;
}>();
</script>

<template>
  <section class="panel status-grid">
    <div>
      <span class="label">Monitoramento</span>
      <strong>{{ enabled ? 'Ativo' : 'Pausado' }}</strong>
    </div>
    <div>
      <span class="label">Notificações</span>
      <strong>{{ permission }}</strong>
    </div>
    <div>
      <span class="label">Última consulta</span>
      <strong>{{ lastUpdated ?? 'Ainda não consultou' }}</strong>
    </div>
    <p class="status-message">{{ message }}</p>
  </section>
</template>
