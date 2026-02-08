<template>
  <section class="view">
    <header class="view__header">
      <h1>控制台</h1>
      <p>欢迎来到 StereoWood 色彩系统的全新后台。请选择上方模块开始迁移后的功能验证。</p>
    </header>
    <div class="view__body">
      <el-empty description="功能迁移进行中" />
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
  font-size: 28px;
  font-weight: 600;
  color: #2f2b43;
}

.view__header p {
  margin: 4px 0 0;
  color: #5a5a72;
  max-width: 640px;
}

.view__body {
  padding: 48px 0;
}
</style>
