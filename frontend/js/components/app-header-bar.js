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
		'global-search-input',
		'search-select'
	],
	methods: {
		setSort(section, mode) { this.$emit('change-sort', section, mode); },
		setViewMode(mode) { this.$emit('change-artworks-view-mode', mode); }
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
						prefix-icon="Search"
					></el-input>
					<!-- 下拉结果：悬浮，不撑开头部高度 -->
					<div v-if="showSearchDropdown && globalSearchResults.length" class="global-search-dropdown floating">
						<template v-for="grp in ['自配色','作品','配色方案','原料']" :key="grp">
							<div v-if="globalSearchResults.some(r=>r.group===grp)" class="gs-group">
								<div class="gs-group-title">{{ grp }}</div>
								<div class="gs-items">
									<div class="gs-item" v-for="item in globalSearchResults.filter(r=>r.group===grp)" :key="grp + '-' + item.type + '-' + item.id" @click="$emit('search-select', item)">
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
