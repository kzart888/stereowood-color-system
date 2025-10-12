<template>
  <section class="view">
    <header class="view__header">
      <div class="view__header-text">
        <h1>作品配色管理</h1>
        <p>浏览作品、配色方案以及每一层对应的自配色记录。编辑与候选色功能将在后续迭代上线。</p>
        <p v-if="!isLoading" class="view__summary">
          共 {{ items.length }} 个作品 · {{ totalSchemes }} 个配色方案
        </p>
      </div>
      <div class="view__actions">
        <el-button type="primary" :disabled="true">
          新建作品（即将上线）
        </el-button>
      </div>
    </header>

    <div class="view__filters" v-if="!isLoading && items.length > 0">
      <span>排序：</span>
      <el-button-group>
        <el-button :type="sortMode === 'time' ? 'primary' : 'default'" @click="setSortMode('time')">
          按更新时间
        </el-button>
        <el-button :type="sortMode === 'name' ? 'primary' : 'default'" @click="setSortMode('name')">
          按名称
        </el-button>
      </el-button-group>
    </div>

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
          v-if="sortedArtworks.length === 0"
          description="暂无作品数据，可稍后再试或从旧系统导入。"
        />

        <div v-else class="artwork-list">
          <article
            v-for="artwork in sortedArtworks"
            :key="artwork.id"
            class="artwork-card"
          >
            <header class="artwork-card__header">
              <div>
                <h2 class="artwork-card__title">
                  {{ formatArtworkTitle(artwork) }}
                </h2>
                <p class="artwork-card__meta">
                  更新于 {{ formatDate(resolveArtworkDisplayDate(artwork)) }}
                  <span> · </span>
                  {{ artwork.schemes.length }} 个配色方案
                </p>
              </div>
            </header>

            <section class="scheme-list">
              <article
                v-for="scheme in getSortedSchemes(artwork)"
                :key="scheme.id"
                class="scheme-card"
              >
                <div class="scheme-card__header">
                  <div class="scheme-card__thumb">
                    <template v-if="scheme.thumbnail_path">
                      <img :src="resolveUploadUrl(scheme.thumbnail_path)" alt="" />
                    </template>
                    <span v-else>尚未上传缩略图</span>
                  </div>
                  <div class="scheme-card__info">
                    <h3>{{ scheme.name }}</h3>
                    <ul class="scheme-card__stats">
                      <li>
                        <span class="label">层数</span>
                        <span>{{ scheme.layers.length }}</span>
                      </li>
                      <li>
                        <span class="label">更新时间</span>
                        <span>{{ formatDate(scheme.updated_at || scheme.created_at) }}</span>
                      </li>
                      <li>
                        <span class="label">原始配色</span>
                        <template v-if="scheme.initial_thumbnail_path">
                          <el-link
                            :href="resolveUploadUrl(scheme.initial_thumbnail_path)"
                            target="_blank"
                            rel="noopener"
                          >
                            查看图片
                          </el-link>
                        </template>
                        <span v-else>未提供</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div v-if="scheme.layers.length > 0" class="scheme-card__body">
                  <table class="scheme-table">
                    <thead>
                      <tr>
                        <th scope="col">层号</th>
                        <th scope="col">自配色</th>
                        <th scope="col">配方记录</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="layer in getSortedLayers(scheme)" :key="`${scheme.id}-${layer.layer}`">
                        <td class="layer-index">
                          第 {{ layer.layer }} 层
                        </td>
                        <td class="layer-color">
                          <template v-if="layer.colorCode">
                            <strong>{{ layer.colorCode }}</strong>
                            <span
                              v-if="layer.custom_color_id != null"
                              class="layer-color__meta"
                            >
                              关联自配色 #{{ layer.custom_color_id }}
                            </span>
                          </template>
                          <span v-else class="layer-color layer-color--missing">
                            未指定
                          </span>
                        </td>
                        <td class="layer-formula">
                          <span>{{ layer.formula || '无配方记录' }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div v-else class="scheme-card__empty">
                  暂未配置层与自配色映射。
                </div>
              </article>
            </section>
          </article>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import type { Artwork, ArtworkScheme, ArtworkSchemeLayer } from '@/models/artwork';
import { useArtworkStore } from '@/stores/artworks';
import { buildUploadUrl, formatArtworkTitle, formatDate } from '@/utils/general';

type SortMode = 'time' | 'name';

const store = useArtworkStore();
const { items, loading, error } = storeToRefs(store);

const sortMode = ref<SortMode>('time');
const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const uploadBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? (fallbackOrigin ? `${fallbackOrigin}/api` : '/api');

const isLoading = computed(() => loading.value);
const loadError = computed(() => error.value);

const totalSchemes = computed(() =>
  items.value.reduce((total, artwork) => total + (artwork.schemes?.length ?? 0), 0),
);

const sortedArtworks = computed(() => {
  const list = [...items.value];
  if (sortMode.value === 'name') {
    return list.sort((a, b) =>
      formatArtworkTitle(a).localeCompare(formatArtworkTitle(b), 'zh-Hans-CN'),
    );
  }
  return list.sort((a, b) => resolveArtworkTimestamp(b) - resolveArtworkTimestamp(a));
});

function setSortMode(mode: SortMode) {
  sortMode.value = mode;
}

function resolveArtworkTimestamp(artwork: Artwork): number {
  const candidates = [
    artwork.updated_at,
    artwork.created_at,
    ...artwork.schemes.map((scheme) => scheme.updated_at),
    ...artwork.schemes.map((scheme) => scheme.created_at),
  ];
  const timestamps = candidates
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter((value): value is number => Number.isFinite(value));
  return timestamps.length ? Math.max(...timestamps) : Number.MIN_SAFE_INTEGER;
}

function resolveArtworkDisplayDate(artwork: Artwork): string | null {
  let latest: { value: string; timestamp: number } | null = null;
  const candidates = [
    artwork.updated_at,
    artwork.created_at,
    ...artwork.schemes.map((scheme) => scheme.updated_at),
    ...artwork.schemes.map((scheme) => scheme.created_at),
  ];
  candidates.forEach((value) => {
    if (!value) {
      return;
    }
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
      return;
    }
    if (!latest || timestamp > latest.timestamp) {
      latest = { value, timestamp };
    }
  });
  return latest?.value ?? null;
}

function getSortedSchemes(artwork: Artwork): ArtworkScheme[] {
  return [...artwork.schemes].sort(
    (a, b) =>
      resolveSchemeTimestamp(b) - resolveSchemeTimestamp(a) || a.name.localeCompare(b.name, 'zh-CN'),
  );
}

function resolveSchemeTimestamp(scheme: ArtworkScheme): number {
  const candidates = [scheme.updated_at, scheme.created_at];
  const timestamps = candidates
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter((value): value is number => Number.isFinite(value));
  return timestamps.length ? Math.max(...timestamps) : Number.MIN_SAFE_INTEGER;
}

function getSortedLayers(scheme: ArtworkScheme): ArtworkSchemeLayer[] {
  return [...scheme.layers].sort((a, b) => a.layer - b.layer);
}

function resolveUploadUrl(path: string | null | undefined): string {
  return buildUploadUrl(uploadBaseUrl, path);
}

onMounted(async () => {
  if (!items.value.length && !loading.value) {
    try {
      await store.loadAll();
    } catch {
      // errors are surfaced via store state
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
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.view__header-text h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  color: #2f2b43;
}

.view__header-text p {
  margin: 6px 0 0;
  color: #5a5a72;
  max-width: 720px;
}

.view__summary {
  font-size: 14px;
  color: #909399;
}

.view__actions {
  display: flex;
  align-items: center;
}

.view__filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view__body {
  padding: 12px 0 64px;
}

.artwork-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.artwork-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 20px;
  background: #fff;
  display: grid;
  gap: 16px;
}

.artwork-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.artwork-card__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #2f2b43;
}

.artwork-card__meta {
  margin: 6px 0 0;
  color: #909399;
  font-size: 13px;
}

.scheme-list {
  display: grid;
  gap: 16px;
}

.scheme-card {
  border: 1px solid #f0f2f5;
  border-radius: 10px;
  padding: 16px;
  background: #fafbff;
  display: grid;
  gap: 12px;
}

.scheme-card__header {
  display: flex;
  gap: 16px;
  align-items: center;
}

.scheme-card__thumb {
  width: 96px;
  height: 96px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  background: #f3f3f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-align: center;
  padding: 6px;
}

.scheme-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.scheme-card__info h3 {
  margin: 0;
  font-size: 18px;
  color: #2f2b43;
  font-weight: 600;
}

.scheme-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 0 0;
  margin: 0;
  list-style: none;
  font-size: 13px;
  color: #606266;
}

.scheme-card__stats .label {
  color: #909399;
  margin-right: 4px;
}

.scheme-card__body {
  overflow-x: auto;
}

.scheme-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 520px;
}

.scheme-table th,
.scheme-table td {
  border: 1px solid #e4e7ed;
  padding: 8px 12px;
  text-align: left;
  font-size: 13px;
  color: #303133;
}

.scheme-table thead {
  background: #f5f7fa;
}

.layer-index {
  white-space: nowrap;
  width: 96px;
}

.layer-color {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layer-color--missing {
  color: #c45656;
  font-weight: 600;
}

.layer-color__meta {
  font-size: 12px;
  color: #909399;
}

.layer-formula span {
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
  color: #606266;
}

.scheme-card__empty {
  padding: 16px;
  text-align: center;
  background: #f6f7fb;
  border-radius: 8px;
  color: #909399;
  font-size: 13px;
}

@media (max-width: 960px) {
  .view__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .scheme-card__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .scheme-card__thumb {
    width: 100%;
    height: auto;
    aspect-ratio: 4 / 3;
  }

  .scheme-table {
    min-width: unset;
  }
}
</style>
