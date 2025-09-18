<template>
  <section class="panel">
    <header class="panel__header">
      <h2>Refactor Progress Overview</h2>
      <p>Track modernization milestones and launch checklists.</p>
      <el-tag size="small" type="info">{{ phaseProgress }}</el-tag>
    </header>

    <ul class="panel__list">
      <li class="panel__list-item" v-for="item in checkpoints" :key="item.id">
        <el-tag :type="item.completed ? 'success' : 'info'" effect="plain">
          {{ item.label }}
        </el-tag>
        <span class="panel__list-note">{{ item.notes }}</span>
      </li>
    </ul>

    <footer class="panel__footer">
      <RouterLink class="panel__cta" to="/legacy">
        Visit Legacy App
      </RouterLink>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useAppStore } from '@/stores/app';

const appStore = useAppStore();
const { checkpoints } = storeToRefs(appStore);

const phaseProgress = computed(() => {
  const total = checkpoints.value.length;
  const completed = checkpoints.value.filter((item) => item.completed).length;
  return `${completed}/${total} phases completed`;
});
</script>

<style lang="scss" scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem;
  border-radius: 1.25rem;
  background: var(--sw-surface-elevated);
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
}

.panel__header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.panel__header h2 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
}

.panel__header p {
  margin: 0;
  color: var(--sw-text-muted);
}

.panel__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 1rem;
}

.panel__list-item {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: center;
}

.panel__list-note {
  color: var(--sw-text-muted);
}

.panel__footer {
  display: flex;
  justify-content: flex-end;
}

.panel__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 999px;
  background: var(--sw-primary);
  color: white;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(31, 147, 255, 0.35);
  }
}
</style>
