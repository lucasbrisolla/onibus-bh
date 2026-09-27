import { VueQueryPlugin } from '@tanstack/vue-query';
import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import { queryClient } from './services/queryClient';

createApp(App).use(VueQueryPlugin, { queryClient }).mount('#app');
