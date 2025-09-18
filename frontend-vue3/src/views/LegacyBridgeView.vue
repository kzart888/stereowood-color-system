<template>
  <section class="bridge">
    <el-result
      icon="success"
      title="Switching to Legacy Experience"
      sub-title="The Vue 2 interface will open automatically."
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => {
  window.location.href = 'http://localhost:9099/legacy';
});
</script>

<style lang="scss" scoped>
.bridge {
  display: grid;
  place-items: center;
  min-height: 50vh;
}
</style>
