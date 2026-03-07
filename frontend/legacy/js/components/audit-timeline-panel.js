const AuditTimelinePanelComponent = {
  name: 'AuditTimelinePanelComponent',
  props: {
    activeTab: {
      type: String,
      default: 'custom-colors',
    },
  },
  data() {
    return {
      loading: false,
      items: [],
      actorFilter: '',
      actionFilter: '',
      entityTypeFilter: '',
      entityIdFilter: '',
      page: 1,
      pageSize: 20,
      total: 0,
    };
  },
  computed: {
    currentTabScope() {
      if (['custom-colors', 'artworks', 'mont-marte'].includes(this.activeTab)) {
        return this.activeTab;
      }
      return 'all';
    },
    totalPages() {
      const pages = Math.ceil((this.total || 0) / this.pageSize);
      return pages > 0 ? pages : 1;
    },
  },
  watch: {
    activeTab() {
      this.page = 1;
      this.loadFeed();
    },
  },
  mounted() {
    this.loadFeed();
  },
  methods: {
    getApi() {
      const gateway = window.apiGateway || (window.runtimeBridge && window.runtimeBridge.apiGateway) || null;
      if (!gateway || !gateway.history || typeof gateway.history.feed !== 'function') {
        throw new Error('history api is unavailable');
      }
      return {
        feed: (params = {}) => gateway.history.feed(window.location.origin, params),
      };
    },
    notify(type, message) {
      if (window.ElementPlus && window.ElementPlus.ElMessage) {
        window.ElementPlus.ElMessage({ type, message });
        return;
      }
      if (type === 'error') {
        console.error(message);
      } else {
        console.log(message);
      }
    },
    buildParams() {
      const params = {
        tab: this.currentTabScope,
        page: this.page,
        pageSize: this.pageSize,
      };
      if (this.actorFilter.trim()) {
        params.actor = this.actorFilter.trim();
      }
      if (this.actionFilter.trim()) {
        params.action = this.actionFilter.trim();
      }
      if (this.entityTypeFilter.trim()) {
        params.entityType = this.entityTypeFilter.trim();
      }
      const parsedId = Number.parseInt(this.entityIdFilter, 10);
      if (!Number.isNaN(parsedId) && parsedId > 0) {
        params.entityId = parsedId;
      }
      return params;
    },
    async loadFeed() {
      this.loading = true;
      try {
        const response = await this.getApi().feed(this.buildParams());
        const data = response.data || {};
        this.items = Array.isArray(data.items) ? data.items : [];
        const pagination = data.pagination || {};
        this.total = Number.isFinite(Number(pagination.total)) ? Number(pagination.total) : 0;
      } catch (error) {
        this.items = [];
        this.total = 0;
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || '加载审计记录失败');
      } finally {
        this.loading = false;
      }
    },
    applyFilters() {
      this.page = 1;
      this.loadFeed();
    },
    clearFilters() {
      this.actorFilter = '';
      this.actionFilter = '';
      this.entityTypeFilter = '';
      this.entityIdFilter = '';
      this.page = 1;
      this.loadFeed();
    },
    goPrev() {
      if (this.page <= 1) return;
      this.page -= 1;
      this.loadFeed();
    },
    goNext() {
      if (this.page >= this.totalPages) return;
      this.page += 1;
      this.loadFeed();
    },
    formatWhen(value) {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString('zh-CN', {
        hour12: false,
      });
    },
    formatWho(item) {
      if (!item) return 'system';
      return item.actor_name || item.actor_id || 'system';
    },
    formatWhat(item) {
      if (!item) return '';
      if (item.change_summary) return item.change_summary;
      return `${item.action} ${item.entity_type}#${item.entity_id}`;
    },
  },
  template: `
    <section class="audit-timeline-panel">
      <div class="audit-timeline-header">
        <h3>操作记录</h3>
        <span class="audit-tab-badge">范围: {{ currentTabScope }}</span>
      </div>

      <div class="audit-timeline-filters">
        <el-input v-model.trim="actorFilter" size="small" placeholder="用户/操作者" style="width:140px;"></el-input>
        <el-input v-model.trim="actionFilter" size="small" placeholder="动作 (create/update/login)" style="width:200px;"></el-input>
        <el-input v-model.trim="entityTypeFilter" size="small" placeholder="实体类型 (可选)" style="width:170px;"></el-input>
        <el-input v-model.trim="entityIdFilter" size="small" placeholder="实体ID (可选)" style="width:140px;"></el-input>
        <el-button size="small" type="primary" :loading="loading" @click="applyFilters">筛选</el-button>
        <el-button size="small" @click="clearFilters">重置</el-button>
      </div>

      <div class="audit-timeline-list">
        <div v-if="loading" class="audit-timeline-empty">加载中...</div>
        <div v-else-if="items.length===0" class="audit-timeline-empty">暂无记录</div>
        <div v-for="item in items" :key="'audit-'+item.id" class="audit-line">
          <span class="audit-when">{{ formatWhen(item.created_at) }}</span>
          <span class="audit-who">{{ formatWho(item) }}</span>
          <span class="audit-what">{{ formatWhat(item) }}</span>
        </div>
      </div>

      <div class="audit-timeline-pagination">
        <el-button size="small" :disabled="page<=1 || loading" @click="goPrev">上一页</el-button>
        <span>第 {{ page }} / {{ totalPages }} 页，合计 {{ total }} 条</span>
        <el-button size="small" :disabled="page>=totalPages || loading" @click="goNext">下一页</el-button>
      </div>
    </section>
  `,
};
