<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <div class="app-shell__brand">
        <span class="app-shell__logo">StereoWood</span>
        <span class="app-shell__title">色彩系统</span>
      </div>
      <nav class="app-shell__nav">
        <RouterLink class="app-shell__nav-item" to="/">总览</RouterLink>
        <RouterLink class="app-shell__nav-item" to="/custom-colors">自配色</RouterLink>
        <RouterLink class="app-shell__nav-item" to="/dictionary">配色字典</RouterLink>
        <RouterLink class="app-shell__nav-item" to="/artworks">作品配色</RouterLink>
        <RouterLink class="app-shell__nav-item" to="/materials">色彩原料</RouterLink>
      </nav>
    </header>
    <main class="app-shell__content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-shell__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 32px;
  background: #ffffff;
  box-shadow: 0 1px 6px rgba(31, 31, 39, 0.08);
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-shell__brand {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
}

.app-shell__logo {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5850ec;
}

.app-shell__title {
  font-weight: 500;
  color: #2f2b43;
}

.app-shell__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.app-shell__nav-item {
  padding: 6px 12px;
  border-radius: 8px;
  color: #4b4b5f;
  font-weight: 500;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.app-shell__nav-item.router-link-active {
  background-color: #e6e7ff;
  color: #2f2b43;
}

.app-shell__nav-item:hover {
  background-color: rgba(88, 80, 236, 0.12);
  color: #2f2b43;
}

.app-shell__content {
  flex: 1 1 auto;
  padding: 32px;
}
</style>
