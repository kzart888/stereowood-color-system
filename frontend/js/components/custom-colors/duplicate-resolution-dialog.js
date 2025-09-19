const DuplicateResolutionDialog = {
    name: 'DuplicateResolutionDialog',
    inject: ['customColorsStore'],
    template: `
        <el-dialog
            v-model="dialogVisible"
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
                            <span class="code" @click="focusCustomColor(rec.color_code)">{{ rec.color_code }}</span>
                            <span class="meta" v-if="rec.updated_at">{{ $helpers.formatDate(rec.updated_at) }}</span>
                            <span class="ref-flag" v-if="isColorReferenced(rec)">被引用</span>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <el-button @click="keepAllDuplicates" :disabled="duplicateState.deletionPending">全部保留</el-button>
                <el-button type="primary" :disabled="!canDeleteAny || duplicateState.deletionPending" @click="performDuplicateDeletion">保留所选并删除其它</el-button>
                <el-tooltip content="更新引用到保留记录后删除其它（包括已被引用的记录）" placement="top">
                    <span>
                        <el-button type="danger" :disabled="!canForceMerge || duplicateState.deletionPending || duplicateState.mergingPending" :loading="duplicateState.mergingPending" @click="confirmForceMerge">强制合并（更新引用）</el-button>
                    </span>
                </el-tooltip>
            </template>
        </el-dialog>
    `,
    computed: {
        store() {
            return this.customColorsStore;
        },
        duplicateState() {
            return this.store.duplicateState;
        },
        duplicateGroups() {
            return this.store.duplicateState.groups;
        },
        duplicateSelections: {
            get() {
                return this.store.duplicateState.selections;
            },
            set(val) {
                this.store.duplicateState.selections = val;
            }
        },
        dialogVisible: {
            get() {
                return this.store.duplicateState.showDialog;
            },
            set(val) {
                this.store.duplicateState.showDialog = val;
            }
        },
        canDeleteAny() {
            return this.store.canDeleteAny();
        },
        canForceMerge() {
            return this.store.canForceMerge();
        }
    },
    methods: {
        keepAllDuplicates() {
            this.store.keepAllDuplicates();
        },
        performDuplicateDeletion() {
            this.store.performDuplicateDeletion();
        },
        confirmForceMerge() {
            this.store.confirmForceMerge();
        },
        focusCustomColor(code) {
            this.store.focusCustomColor(code);
        },
        isColorReferenced(color) {
            return this.store.isColorReferenced(color);
        }
    }
};

window.DuplicateResolutionDialog = DuplicateResolutionDialog;
