<template>
  <section class="workspace">
    <header class="workspace__header">
      <h2>Custom Colors Workspace</h2>
      <p>Composition API port of the legacy catalog is in progress.</p>
    </header>

    <el-empty description="Feature migration scheduled for Phase 3" />
  </section>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.workspace {
  padding: 2rem;
  border-radius: 1rem;
  background: var(--sw-surface-elevated);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
}

.workspace__header {
  margin-bottom: 1.5rem;
}

.workspace__header h2 {
  margin: 0;
}

.workspace__header p {
  margin: 0.5rem 0 0;
  color: var(--sw-text-muted);
}
</style>
