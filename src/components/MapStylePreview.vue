<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  monochrome: boolean;
  dark: boolean;
}>();

const tileColors = computed(() => {
  if (props.dark) {
    return props.monochrome
      ? {
          background: '#162624',
          park: '#24322f',
          water: '#303a38',
          block: '#202d2b',
          roadEdge: '#3b4845',
          road: '#606b68',
          roadCenter: '#7a8481',
        }
      : {
          background: '#122a28',
          park: '#193e31',
          water: '#153b40',
          block: '#17332f',
          roadEdge: '#314541',
          road: '#52645f',
          roadCenter: '#75847e',
        };
  }

  return props.monochrome
    ? {
        background: '#edf0f1',
        park: '#dadddf',
        water: '#d4dadd',
        block: '#e5e8e9',
        roadEdge: '#c8ced1',
        road: '#ffffff',
        roadCenter: '#e2e5e6',
      }
    : {
        background: '#eaf0e8',
        park: '#d4e7ce',
        water: '#cbe4e7',
        block: '#f3eee3',
        roadEdge: '#d9ddda',
        road: '#ffffff',
        roadCenter: '#eceee9',
      };
});

const routeColor = computed(() => (props.dark ? '#14b8a6' : '#0f766e'));
const routeFlowColor = computed(() => (props.dark ? '#ccfbf1' : '#99f6e4'));
const stopColor = computed(() => (props.dark ? '#fbbf24' : '#d97706'));
</script>

<template>
  <svg
    class="tw:block tw:w-full tw:overflow-hidden tw:rounded-[9px]"
    viewBox="0 0 300 148"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <rect width="300" height="148" :fill="tileColors.background" />

    <path d="M12 13h70a5 5 0 0 1 5 5v26H12z" :fill="tileColors.park" />
    <path d="M210 0h90v37h-56a8 8 0 0 1-8-8V0z" :fill="tileColors.water" />
    <path d="M214 107h86v41h-92l-9-19z" :fill="tileColors.park" />
    <path d="M22 100h52v39H22zM112 10h40v25h-40zM246 56h42v34h-42z" :fill="tileColors.block" />

    <path d="M-8 74C40 65 72 87 111 69s70-41 109-24 53 37 91 27" fill="none" :stroke="tileColors.roadEdge" stroke-width="22" stroke-linecap="round" />
    <path d="M-8 74C40 65 72 87 111 69s70-41 109-24 53 37 91 27" fill="none" :stroke="tileColors.road" stroke-width="17" stroke-linecap="round" />
    <path d="M-8 74C40 65 72 87 111 69s70-41 109-24 53 37 91 27" fill="none" :stroke="tileColors.roadCenter" stroke-width="1.5" stroke-dasharray="3 7" />

    <path d="M94-8c-4 37 14 57 39 72s36 41 34 92M205-8c-9 30-5 52 9 72s12 44 5 84M-8 119c35-11 62-9 92 3s54 16 83 8 66-19 141-8" fill="none" :stroke="tileColors.roadEdge" stroke-width="11" stroke-linecap="round" />
    <path d="M94-8c-4 37 14 57 39 72s36 41 34 92M205-8c-9 30-5 52 9 72s12 44 5 84M-8 119c35-11 62-9 92 3s54 16 83 8 66-19 141-8" fill="none" :stroke="tileColors.road" stroke-width="7" stroke-linecap="round" />

    <path d="M33 148c14-31 40-55 78-67s67 24 92 11 47-42 75-67" fill="none" :stroke="routeColor" stroke-width="6" stroke-linecap="round" />
    <path d="M33 148c14-31 40-55 78-67s67 24 92 11 47-42 75-67" fill="none" :stroke="routeFlowColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 9" />

    <circle cx="111" cy="83" r="8" :fill="stopColor" stroke="#ffffff" stroke-width="3" />
    <circle cx="216" cy="94" r="9" fill="#2563eb" stroke="#eff6ff" stroke-width="3" />
    <circle cx="188" cy="72" r="13" :fill="routeColor" stroke="#ffffff" stroke-width="2" />
    <path d="M183 67h10a2 2 0 0 1 2 2v8h-14v-8a2 2 0 0 1 2-2zm0 2v3h4v-3zm6 0v3h4v-3zm-5 9h2m5 0h2" fill="none" stroke="#f0fdfa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
