/* AppHeaderBar 组件
 * [HEADER] 统一头部：标题 + Tab 按钮组 + 右侧工具按钮
 * Tabs 改为自定义按钮组（浅紫/深紫），布局简洁，可扩展插入搜索。
 */
const AppHeaderBar = {
	name: 'AppHeaderBar',
	props: {
		activeTab: { type: String, default: 'custom-colors' },
		artworksViewMode: { type: String, default: 'byLayer' },
		customColorsSortMode: { type: String, default: 'time' },
		artworksSortMode: { type: String, default: 'time' },
		montMarteSortMode: { type: String, default: 'time' },
		globalSearchQuery: { type: String, default: '' },
		globalSearchResults: { type: Array, default: () => [] },
		showSearchDropdown: { type: Boolean, default: false }
	},
	emits: [
		'update:activetab', // DOM 模板大小写不敏感，统一小写
		'change-artworks-view-mode',
		'change-sort',
		'add-artwork',
		'add-custom-color',
		'add-raw-material',
		'check-duplicates',
		'show-color-palette',
		'global-search-input',
		'search-select',
		'open-search-dropdown',
		'close-search-dropdown'
	],
	data() {
		return {
			activeIdx: -1,
			lastEscTime: 0,
			history: [] // 最近搜索关键词（最多20条）
		};
	},
	computed: {
		flatResults() {
			// 保持与分组展示一致的顺序
			const order = ['自配色','作品','配色方案','原料'];
			const arr = [];
			order.forEach(g => {
				this.globalSearchResults.filter(r=>r.group===g).forEach(r=>arr.push(r));
			});
			return arr;
		}
	},
	watch: {
		globalSearchQuery() { this.activeIdx = -1; },
		globalSearchResults() { this.$nextTick(()=>{ this.adjustDropdownEdge(); }); },
		showSearchDropdown() { this.$nextTick(()=>{ this.adjustDropdownEdge(); }); }
	},
	mounted() {
		this.loadHistory();
		// 点击外部关闭
		this._outsideHandler = (e)=>{
			const root = this.$el.querySelector('.app-header-search');
			if (!root) return;
			if (!root.contains(e.target)) {
				this.activeIdx = -1;
				this.$emit('close-search-dropdown');
			}
		};
		document.addEventListener('mousedown', this._outsideHandler, true);
		// Ctrl+F / Cmd+F 拦截聚焦
		this._ctrlFHandler = (e)=>{
			if ((e.ctrlKey || e.metaKey) && (e.key==='f' || e.key==='F')) {
				e.preventDefault();
				this.focusInput();
				// 若无输入但有历史，展开历史
				if (!this.globalSearchQuery && this.history.length) this.$emit('open-search-dropdown');
			}
		};
		window.addEventListener('keydown', this._ctrlFHandler, { passive:false });
		// 全局 ESC（输入框未聚焦时）退出过滤：清空查询 + 关闭下拉
		this._escGlobalHandler = (e)=>{
			if (e.key === 'Escape') {
				const inp = this.$el.querySelector('.app-header-search input');
				if (!inp || document.activeElement !== inp) {
					if (this.globalSearchQuery) this.$emit('global-search-input','');
					this.$emit('close-search-dropdown');
					this.activeIdx = -1;
				}
			}
		};
		window.addEventListener('keydown', this._escGlobalHandler, { passive:true });
	},
	beforeUnmount() {
		if (this._outsideHandler) document.removeEventListener('mousedown', this._outsideHandler, true);
		if (this._ctrlFHandler) window.removeEventListener('keydown', this._ctrlFHandler, { passive:false });
		if (this._escGlobalHandler) window.removeEventListener('keydown', this._escGlobalHandler, { passive:true });
	},
	methods: {
		setSort(section, mode) { this.$emit('change-sort', section, mode); },
		setViewMode(mode) { this.$emit('change-artworks-view-mode', mode); }
		,
		onSearchKey(e) {
			if (e.isComposing) return; // 输入法组合中不拦截
			const key = e.key;
			if (key === 'Escape') {
				const now = Date.now();
				if (now - this.lastEscTime < 600) {
					// 第二次 ESC：失焦并关闭
					this.blurInput();
					this.$emit('close-search-dropdown');
					this.lastEscTime = 0;
				} else {
					// 第一次 ESC：清空并关闭下拉，保持焦点
					this.activeIdx = -1;
					this.$emit('global-search-input', '');
					this.$emit('close-search-dropdown');
					this.lastEscTime = now;
				}
				return;
			}
			if (!this.showSearchDropdown || !this.globalSearchResults.length) return; // 无结果不处理
			if (key === 'ArrowDown') {
				 e.preventDefault();
				 if (this.activeIdx < this.flatResults.length - 1) this.activeIdx++; else this.activeIdx = 0;
				this.scrollActiveIntoView();
			} else if (key === 'ArrowUp') {
				 e.preventDefault();
				 if (this.activeIdx > 0) this.activeIdx--; else this.activeIdx = this.flatResults.length - 1;
				this.scrollActiveIntoView();
			} else if (key === 'Enter') {
				 if (this.activeIdx >=0 && this.activeIdx < this.flatResults.length) {
					 e.preventDefault();
					 const item = this.flatResults[this.activeIdx];
					 this.addHistoryIfNeeded(this.globalSearchQuery);
					 this.$emit('search-select', item);
				 }
			}
		},
		itemClass(item, idx) {
			return {
				'gs-item': true,
				'active': idx === this.activeIdx
			};
		},
		scrollActiveIntoView() {
			this.$nextTick(()=>{
				const wrap = this.$el.querySelector('.global-search-dropdown.floating');
				if (!wrap) return;
				const active = wrap.querySelector('.gs-item.active');
				if (!active) return;
				const r = active.getBoundingClientRect();
				const pr = wrap.getBoundingClientRect();
				if (r.top < pr.top) active.scrollIntoView({ block:'nearest' });
				else if (r.bottom > pr.bottom) active.scrollIntoView({ block:'nearest' });
			});
		},
		adjustDropdownEdge() {
			const dd = this.$el.querySelector('.global-search-dropdown.floating');
			if (!dd) return;
			dd.classList.remove('edge-shift');
			const rect = dd.getBoundingClientRect();
			const vw = window.innerWidth || document.documentElement.clientWidth;
			if (rect.right > vw - 8) dd.classList.add('edge-shift');
		},
		focusInput() { const inp = this.$el.querySelector('.app-header-search input'); if (inp) inp.focus(); },
		blurInput() { const inp = this.$el.querySelector('.app-header-search input'); if (inp) inp.blur(); },
		onSearchFocus() { if (!this.globalSearchQuery && this.history.length) this.$emit('open-search-dropdown'); },
		loadHistory() { try { const raw = localStorage.getItem('sw-search-history'); if (raw) this.history = JSON.parse(raw).slice(0,20); } catch(e) {} },
		saveHistory() { try { localStorage.setItem('sw-search-history', JSON.stringify(this.history.slice(0,20))); } catch(e) {} },
		addHistoryIfNeeded(q) { const s = (q||'').trim(); if (!s) return; const idx = this.history.findIndex(h=>h===s); if (idx!==-1) this.history.splice(idx,1); this.history.unshift(s); if (this.history.length>20) this.history.length=20; this.saveHistory(); },
		selectHistory(h) { this.$emit('global-search-input', h); this.$emit('open-search-dropdown'); this.$nextTick(()=> this.focusInput()); },
		handleResultClick(item) { this.addHistoryIfNeeded(this.globalSearchQuery); this.$emit('search-select', item); }
	},
	template: `
		<div class="app-header-sticky">
			<div class="app-header-bar app-header-with-search">
				<div class="app-header-left">
					<div class="app-title-badge">
						<h1 class="app-title">STEREOWOOD-梯木叠雕-颜色管理系统</h1>
					</div>
				</div>
				<div class="app-header-center">
					<div class="tab-switch-group" role="tablist" aria-label="主功能切换">
						<button type="button" class="tab-switch" :class="{active: activeTab==='custom-colors'}" @click="$emit('update:activetab','custom-colors')" role="tab" :aria-selected="activeTab==='custom-colors'">自配色管理</button>
						<button type="button" class="tab-switch" :class="{active: activeTab==='artworks'}" @click="$emit('update:activetab','artworks')" role="tab" :aria-selected="activeTab==='artworks'">作品配色管理</button>
						<button type="button" class="tab-switch" :class="{active: activeTab==='mont-marte'}" @click="$emit('update:activetab','mont-marte')" role="tab" :aria-selected="activeTab==='mont-marte'">颜色原料管理</button>
					</div>
				</div>
				<!-- 全局搜索输入：在宽度不足时自动换行，占据整行并居中 -->
				<div class="app-header-search">
					<el-input
						size="small"
						clearable
						placeholder="全局搜索：自配色 / 作品 / 方案 / 原料"
						:model-value="globalSearchQuery"
						@input="$emit('global-search-input', $event)"
						@focus="onSearchFocus"
						@keydown="onSearchKey"
						prefix-icon="Search"
					></el-input>
					<!-- 下拉结果：悬浮，不撑开头部高度 -->
					<div v-if="showSearchDropdown && (globalSearchResults.length || history.length)" class="global-search-dropdown floating">
						<div v-if="(!globalSearchQuery && history.length)" class="gs-group">
							<div class="gs-group-title">最近搜索</div>
							<div class="gs-items">
								<div class="gs-item" v-for="h in history" :key="'hist-'+h" @click="selectHistory(h)">
									<span class="gs-text">{{ h }}</span>
								</div>
							</div>
						</div>
						<template v-for="grp in ['自配色','作品','配色方案','原料']" :key="grp">
							<div v-if="globalSearchResults.some(r=>r.group===grp)" class="gs-group">
								<div class="gs-group-title">{{ grp }}</div>
								<div class="gs-items">
									<div v-for="(item, idx) in globalSearchResults.filter(r=>r.group===grp)" :key="grp + '-' + item.type + '-' + item.id" :class="itemClass(item, flatResults.indexOf(item))" @click="handleResultClick(item)">
										<span class="gs-text">{{ item.pathLabel }}</span>
									</div>
								</div>
							</div>
						</template>
					</div>
				</div>
				<div class="app-header-tools">
					<template v-if="activeTab==='artworks'">
						<el-button size="small" type="primary" class="add-button" @click="$emit('add-artwork')"><el-icon><Plus /></el-icon> 新作品</el-button>
						<span class="dual-toggle-group">
							<el-button size="small" :type="artworksViewMode==='byLayer' ? 'primary':'default'" @click="setViewMode('byLayer')">层号优先</el-button>
							<el-button size="small" :type="artworksViewMode==='byColor' ? 'primary':'default'" @click="setViewMode('byColor')">自配色优先</el-button>
						</span>
						<span class="dual-toggle-group">
							<el-button size="small" :type="artworksSortMode==='time' ? 'primary':'default'" @click="setSort('artworks','time')">按时间</el-button>
							<el-button size="small" :type="artworksSortMode==='name' ? 'primary':'default'" @click="setSort('artworks','name')">按名称</el-button>
						</span>
					</template>
					<template v-else-if="activeTab==='custom-colors'">
						<el-button size="small" type="primary" class="add-button" @click="$emit('add-custom-color')"><el-icon><Plus /></el-icon> 新自配色</el-button>
						<span class="dual-toggle-group">
							<el-button size="small" :type="customColorsSortMode==='time' ? 'primary':'default'" @click="setSort('customColors','time')">按时间</el-button>
							<el-button size="small" :type="customColorsSortMode==='name' ? 'primary':'default'" @click="setSort('customColors','name')">按名称</el-button>
						</span>
						<el-button size="small" @click="$emit('check-duplicates')">查重</el-button>
						<el-button size="small" @click="$emit('show-color-palette')"><el-icon><Grid /></el-icon> 自配色列表</el-button>
					</template>
					<template v-else-if="activeTab==='mont-marte'">
						<el-button size="small" type="primary" class="add-button" @click="$emit('add-raw-material')"><el-icon><Plus /></el-icon> 新原料</el-button>
						<span class="dual-toggle-group">
							<el-button size="small" :type="montMarteSortMode==='time' ? 'primary':'default'" @click="setSort('montMarte','time')">按时间</el-button>
							<el-button size="small" :type="montMarteSortMode==='name' ? 'primary':'default'" @click="setSort('montMarte','name')">按名称</el-button>
						</span>
					</template>
				</div>
			</div>
		</div>
	`
};
