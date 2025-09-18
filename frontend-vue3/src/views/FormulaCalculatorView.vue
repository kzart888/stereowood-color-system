<template>
  <section class="workspace">
    <header class="workspace__header">
      <h2>Formula Calculator</h2>
      <p>Interactive calculator will be rebuilt using composables and unit-tested helpers.</p>
    </header>

    <el-card shadow="never">
      <p>Upcoming tasks:</p>
      <ul>
        <li>Extract parsing logic into shared `@/utils/formulas`.</li>
        <li>Design composition-based validation workflow.</li>
        <li>Cover edge cases with Vitest snapshots.</li>
      </ul>
    </el-card>
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
