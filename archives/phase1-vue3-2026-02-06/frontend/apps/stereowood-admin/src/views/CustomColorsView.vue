<template>
  <section class="view">
    <header class="view__header">
      <div class="view__header-main">
        <div>
          <h1>自配色管理</h1>
          <p>浏览、自配色、以及后续的配方编辑、Pantone 匹配都将从这里开始。</p>
        </div>
        <el-button type="primary" :disabled="true"> 新建配色（即将上线） </el-button>
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
          description="暂时没有自配色，请稍后再试或从旧系统导入。"
        />

        <el-table v-else :data="items" border stripe class="color-table">
          <el-table-column prop="color_code" label="编号" width="120" />

          <el-table-column label="缩略图" width="120">
            <template #default="{ row }">
              <div class="swatch-preview" :style="getSwatchStyle(row)" />
            </template>
          </el-table-column>

          <el-table-column label="分类" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.category_code" size="small">
                {{ row.category_code }}
              </el-tag>
              <span v-else>—</span>
            </template>
          </el-table-column>

          <el-table-column label="配方">
            <template #default="{ row }">
              <span class="formula-text">
                {{ row.formula || '—' }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="Pantone" width="180">
            <template #default="{ row }">
              <div class="pantone-tags">
                <el-tag v-if="row.pantone_coated" size="small" type="info">
                  {{ row.pantone_coated }} (C)
                </el-tag>
                <el-tag v-if="row.pantone_uncoated" size="small" type="info">
                  {{ row.pantone_uncoated }} (U)
                </el-tag>
                <span v-if="!row.pantone_coated && !row.pantone_uncoated">—</span>
              </div>
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
import { useCustomColorStore } from '@/stores/customColors';
import { resolveCustomColorSwatch } from '@/features/pure-color/customColorSwatch';

const store = useCustomColorStore();
const { items, loading, error } = storeToRefs(store);

const isLoading = computed(() => loading.value);
const loadError = computed(() => error.value);

function getSwatchStyle(color: (typeof items.value)[number]) {
  const swatch = resolveCustomColorSwatch(color, { includeColorConcentrate: false });
  if (swatch.type === 'image') {
    return {
      backgroundImage: swatch.imageUrl ? `url(${swatch.imageUrl})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if (swatch.type === 'pure' || swatch.type === 'color') {
    return {
      backgroundColor: swatch.hex ?? '#f3f3f5',
    };
  }
  return {
    backgroundColor: '#f3f3f5',
  };
}

onMounted(async () => {
  if (items.value.length === 0 && !loading.value) {
    try {
      await store.loadAll();
    } catch {
      // error already captured in store
    }
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
  align-items: center;
  justify-content: space-between;
}

.view__header-main {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
  justify-content: space-between;
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

.view__body {
  padding: 24px 0 64px;
}

.color-table :deep(.el-table__cell) {
  vertical-align: middle;
}

.swatch-preview {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  margin: 0 auto;
}

.formula-text {
  max-width: 420px;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pantone-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

@media (max-width: 960px) {
  .view__header-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .view__header-main p {
    max-width: none;
  }
}
</style>
