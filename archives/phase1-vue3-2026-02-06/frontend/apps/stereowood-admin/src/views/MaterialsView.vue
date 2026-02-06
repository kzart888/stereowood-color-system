<template>
  <section class="view">
    <header class="view__header">
      <div class="view__header-main">
        <div>
          <h1>颜料原料管理</h1>
          <p>维护 Mont Marte 原料、供应商与采购链接，为自配色和配方工具提供基础数据。</p>
        </div>
        <div class="view__header-actions">
          <el-button type="primary" :disabled="true"> 新建原料（即将上线） </el-button>
        </div>
      </div>
    </header>

    <div class="view__body">
      <el-skeleton v-if="isLoading" :rows="6" animated />

      <el-alert
        v-else-if="loadError"
        type="error"
        :closable="false"
        show-icon
        :title="`加载失败：${loadError}`"
      />

      <template v-else>
        <el-empty
          v-if="items.length === 0"
          description="暂无原料数据，可稍后再试或从旧系统导入。"
        />
        <el-table v-else :data="items" border stripe class="materials-table">
          <el-table-column prop="name" label="原料名称" min-width="200" />
          <el-table-column label="缩略图" width="140">
            <template #default="{ row }">
              <div class="material-thumbnail">
                <img v-if="row.image_path" :src="buildImageUrl(row.image_path)" alt="" />
                <span v-else>—</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="分类" width="160">
            <template #default="{ row }">
              <el-tag v-if="row.category_code" type="info" size="small">
                {{ row.category_code }}
              </el-tag>
              <span v-else>{{ row.category ?? '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="供应商" width="180">
            <template #default="{ row }">
              <span>{{ row.supplier_name ?? '未指定' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="采购链接" width="200">
            <template #default="{ row }">
              <el-link v-if="row.purchase_link_url" :href="row.purchase_link_url" target="_blank">
                查看链接
              </el-link>
              <span v-else>未设置</span>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="180" />
        </el-table>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useMaterialsStore } from '@/stores/materials';

const store = useMaterialsStore();
const { items, loading, error } = storeToRefs(store);

const isLoading = computed(() => loading.value);
const loadError = computed(() => error.value);

function buildImageUrl(path: string) {
  if (!path) {
    return '';
  }
  return `${window.location.origin}/api/uploads/${path}`;
}

onMounted(async () => {
  try {
    await Promise.all([store.loadMaterials(), store.loadDictionaries()]);
  } catch {
    // errors captured in store state
  }
});
</script>

<style scoped>
.view {
  display: grid;
  gap: 24px;
}

.view__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view__header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
}

.view__header-main h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  color: #2f2b43;
}

.view__header-main p {
  margin: 6px 0 0;
  color: #5a5a72;
  max-width: 680px;
}

.view__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view__body {
  padding: 24px 0 64px;
}

.materials-table :deep(.el-table__cell) {
  vertical-align: middle;
}

.material-thumbnail {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin: 0 auto;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  overflow: hidden;
  background: #f6f6f9;
}

.material-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 960px) {
  .view__header-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .view__header-actions {
    width: 100%;
  }
}
</style>
