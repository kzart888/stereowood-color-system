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
		montMarteSortMode: { type: String, default: 'time' }
	},
	emits: [
		'update:activetab', // DOM 模板大小写不敏感，统一小写
		'change-artworks-view-mode',
		'change-sort',
		'add-artwork',
		'add-custom-color',
		'add-raw-material'
	],
	methods: {
		setSort(section, mode) { this.$emit('change-sort', section, mode); },
		setViewMode(mode) { this.$emit('change-artworks-view-mode', mode); }
	},
	template: `
		<div class="app-header-sticky">
			<div class="app-header-bar">
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
