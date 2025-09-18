<template>
  <el-config-provider size="default">
    <div class="app-shell">
      <header class="app-shell__header">
        <h1 class="app-shell__title">STEREOWOOD Color System</h1>
        <p class="app-shell__subtitle">Vue 3 modernization workspace</p>
      </header>

      <nav class="app-shell__nav">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="app-shell__nav-link">
          <component :is="item.icon" class="app-shell__nav-icon" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <main class="app-shell__main">
        <RouterView />
      </main>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { House, Brush, Collection, Tickets, Operation } from '@element-plus/icons-vue';

const navItems = computed(() => [
  { to: '/', label: 'Overview', icon: House },
  { to: '/custom-colors', label: 'Custom Colors', icon: Brush },
  { to: '/artworks', label: 'Artworks', icon: Collection },
  { to: '/dictionary', label: 'Dictionary', icon: Tickets },
  { to: '/formula-calculator', label: 'Formula Calculator', icon: Operation },
]);
</script>

<style lang="scss" scoped>
.app-shell {
  display: grid;
  min-height: 100vh;
  grid-template-areas:
    'header'
    'nav'
    'main';
  grid-template-rows: auto auto 1fr;
  background: var(--sw-surface);
  color: var(--sw-text-primary);
}

.app-shell__header {
  grid-area: header;
  padding: 1.5rem 2rem 1rem;
  background: var(--sw-surface-elevated);
  border-bottom: 1px solid var(--sw-border-subtle);
}

.app-shell__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.app-shell__subtitle {
  margin: 0.25rem 0 0;
  color: var(--sw-text-muted);
}

.app-shell__nav {
  grid-area: nav;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: var(--sw-surface);
  border-bottom: 1px solid var(--sw-border-subtle);
}

.app-shell__nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  font-weight: 500;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease;

  &.router-link-active {
    background: var(--sw-primary-tint);
    color: var(--sw-primary-text);
  }

  &:hover {
    background: var(--sw-surface-hover);
  }
}

.app-shell__nav-icon {
  width: 1rem;
  height: 1rem;
}

.app-shell__main {
  grid-area: main;
  padding: 2rem;
}

@media (min-width: 960px) {
  .app-shell {
    grid-template-columns: 16rem 1fr;
    grid-template-areas:
      'header header'
      'nav main';
    grid-template-rows: auto 1fr;
  }

  .app-shell__nav {
    flex-direction: column;
    align-items: flex-start;
    padding: 2rem 1.5rem;
    border-right: 1px solid var(--sw-border-subtle);
    border-bottom: none;
  }

  .app-shell__main {
    padding: 3rem;
  }
}
</style>
