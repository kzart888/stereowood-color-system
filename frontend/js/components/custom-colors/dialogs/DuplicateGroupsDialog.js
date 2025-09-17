(function(window) {
    'use strict';

    const DuplicateGroupsDialog = {
        name: 'DuplicateGroupsDialog',
        mixins: [window.CustomColorDuplicateMixin],
        inject: ['globalData'],
        props: {
            isColorReferencedFn: { type: Function, required: true }
        },
        methods: {
            getMsg() {
                return ElementPlus.ElMessage;
            },
            isColorReferenced(color) {
                if (typeof this.isColorReferencedFn === 'function') {
                    return !!this.isColorReferencedFn(color);
                }
                return false;
            }
        },
        template: `
            <el-dialog
                v-model="showDuplicateDialog"
                class="dup-groups-dialog"
                title="重复配方处理(比例等价)"
                width="760px"
                :close-on-click-modal="false"
                :close-on-press-escape="false"
            >
                <div v-if="!duplicateGroups.length" class="meta-text">暂无重复组</div>
                <div v-else class="dup-groups-wrapper">
                    <div class="dup-group-block" v-for="grp in duplicateGroups" :key="grp.signature">
                        <div class="dup-group-head">
                            <span class="dup-group-badge">{{ grp.records.length }} 条</span>
                            <span class="dup-group-formula">
                                <el-tag v-for="it in grp.parsed.items" :key="it.name+'-'+it.unit" size="small" disable-transitions>
                                    {{ it.name }} {{ it.ratio }}
                                </el-tag>
                            </span>
                        </div>
                        <div class="dup-records">
                            <div class="dup-record-row" v-for="rec in grp.records" :key="rec.id" :class="{ 'is-referenced': isColorReferenced(rec) }">
                                <label class="keep-radio">
                                    <input type="radio" :name="'keep-'+grp.signature" :value="rec.id" v-model="duplicateSelections[grp.signature]" />
                                    <span>保留</span>
                                </label>
                                <span class="code" @click="$parent && $parent.focusCustomColor && $parent.focusCustomColor(rec.color_code)">{{ rec.color_code }}</span>
                                <span class="meta" v-if="rec.updated_at">{{ $helpers.formatDate(rec.updated_at) }}</span>
                                <span class="ref-flag" v-if="isColorReferenced(rec)">被引用</span>
                            </div>
                        </div>
                    </div>
                </div>
                <template #footer>
                    <el-button @click="keepAllDuplicates" :disabled="deletionPending">全部保留</el-button>
                    <el-button type="primary" :disabled="!canDeleteAny || deletionPending" @click="performDuplicateDeletion">保留所选并删除其它</el-button>
                    <el-tooltip content="更新引用到保留记录后删除其它（包括已被引用的记录）" placement="top">
                        <span>
                            <el-button type="danger" :disabled="!canForceMerge || deletionPending || mergingPending" :loading="mergingPending" @click="confirmForceMerge">强制合并（更新引用）</el-button>
                        </span>
                    </el-tooltip>
                </template>
            </el-dialog>
        `
    };

    window.DuplicateGroupsDialog = DuplicateGroupsDialog;
})(window);
