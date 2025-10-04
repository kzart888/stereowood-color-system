<template>
  <section class="view">
    <header class="view__header">
      <h1>作品配色管理</h1>
      <p>配色方案、配方匹配与候选色功能将在新架构中重建。</p>
    </header>
    <div class="view__body">
      <el-empty description="模块迁移进行中" />
    </div>
  </section>
</template>

<script setup lang="ts"></script>

<style scoped>
.view {
  display: grid;
  gap: 24px;
}

.view__header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  color: #2f2b43;
}

.view__header p {
  margin: 6px 0 0;
  color: #5a5a72;
  max-width: 680px;
}

.view__body {
  padding: 64px 0;
}
</style>
