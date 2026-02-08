<template>
  <section class="view">
    <el-result icon="warning" title="页面不存在" sub-title="请检查链接是否正确或返回首页">
      <template #extra>
        <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
      </template>
    </el-result>
  </section>
</template>

<script setup lang="ts"></script>

<style scoped>
.view {
  display: flex;
  justify-content: center;
  padding: 96px 0;
}
</style>
