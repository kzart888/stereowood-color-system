(function(window) {
    'use strict';

    const CustomColorDuplicateMixin = {
        data() {
            return {
                showDuplicateDialog: false,
                duplicateGroups: [],
                duplicateSelections: {},
                deletionPending: false,
                mergingPending: false
            };
        },

        computed: {
            canDeleteAny() {
                if (!this.duplicateGroups || !this.duplicateGroups.length) return false;
                for (const group of this.duplicateGroups) {
                    const keepId = this.duplicateSelections[group.signature];
                    if (!keepId) continue;
                    if (group.records.some(r => r.id !== keepId && !this.isColorReferenced(r))) return true;
                }
                return false;
            },

            canForceMerge() {
                if (!this.duplicateGroups || !this.duplicateGroups.length) return false;
                return this.duplicateGroups.some(group => group.records.length > 1 && this.duplicateSelections[group.signature]);
            }
        },

        methods: {
            runDuplicateCheck(focusSignature = null, preferredKeepId = null) {
                const msg = this.getMsg();
                if (!window.duplicateDetector) {
                    msg.info('查重模块未加载');
                    return;
                }

                const list = this.globalData.customColors?.value || [];
                const map = window.duplicateDetector.groupByRatioSignature(list);
                const sigs = Object.keys(map);
                if (!sigs.length) {
                    msg.success('未发现重复配方');
                    this.showDuplicateDialog = false;
                    return;
                }

                this.duplicateGroups = sigs.map(sig => {
                    const recs = map[sig].slice().sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
                    const parsed = window.duplicateDetector.parseRatio(sig);
                    return { signature: sig, records: recs, parsed };
                });

                this.duplicateSelections = {};
                this.duplicateGroups.forEach(group => {
                    if (focusSignature && group.signature === focusSignature && preferredKeepId) {
                        this.duplicateSelections[group.signature] = preferredKeepId;
                    } else if (group.records.length) {
                        this.duplicateSelections[group.signature] = group.records[0].id;
                    }
                });

                this.showDuplicateDialog = true;
                msg.warning(`发现 ${sigs.length} 组重复配方`);
            },

            keepAllDuplicates() {
                this.showDuplicateDialog = false;
                ElementPlus.ElMessage.info('已保留全部重复记录');
            },

            async performDuplicateDeletion() {
                if (this.deletionPending) return;
                const toDelete = [];
                this.duplicateGroups.forEach(group => {
                    const keepId = this.duplicateSelections[group.signature];
                    if (!keepId) return;
                    group.records.forEach(record => {
                        if (record.id !== keepId && !this.isColorReferenced(record)) toDelete.push(record);
                    });
                });
                if (!toDelete.length) {
                    ElementPlus.ElMessage.info('没有可删除的记录');
                    return;
                }
                try {
                    await ElementPlus.ElMessageBox.confirm(`将删除 ${toDelete.length} 条记录，确认继续？`, '删除确认', {
                        type: 'warning',
                        confirmButtonText: '确认删除',
                        cancelButtonText: '取消'
                    });
                } catch (e) {
                    return;
                }
                this.deletionPending = true;
                let ok = 0;
                let fail = 0;
                for (const record of toDelete) {
                    try {
                        await api.customColors.delete(record.id);
                        ok++;
                    } catch (e) {
                        fail++;
                        break;
                    }
                }
                this.deletionPending = false;
                await this.globalData.loadCustomColors();
                await this.globalData.loadArtworks();
                ElementPlus.ElMessage.success(`删除完成：成功 ${ok} 条，失败 ${fail} 条`);
                this.runDuplicateCheck();
            },

            async confirmForceMerge() {
                if (this.mergingPending || this.deletionPending) return;
                const candidates = this.duplicateGroups.filter(group => group.records.length > 1 && this.duplicateSelections[group.signature]);
                if (!candidates.length) {
                    ElementPlus.ElMessage.info('请选择要保留的记录');
                    return;
                }
                const group = candidates[0];
                const keepId = this.duplicateSelections[group.signature];
                if (!keepId) {
                    ElementPlus.ElMessage.info('请先选择要保留的记录');
                    return;
                }
                const removeIds = group.records.filter(record => record.id !== keepId).map(record => record.id);
                if (!removeIds.length) {
                    ElementPlus.ElMessage.info('该组没有其它记录');
                    return;
                }
                let referenced = 0;
                group.records.forEach(record => {
                    if (record.id !== keepId && this.isColorReferenced(record)) referenced++;
                });
                const msg = `将合并该组：保留 1 条，删除 ${removeIds.length} 条；其中 ${referenced} 条被引用，其引用将更新到保留记录。确认继续？`;
                try {
                    await ElementPlus.ElMessageBox.confirm(msg, '强制合并确认', {
                        type: 'warning',
                        confirmButtonText: '执行合并',
                        cancelButtonText: '取消'
                    });
                } catch (e) {
                    return;
                }
                this.executeForceMerge({ keepId, removeIds, signature: group.signature });
            },

            async executeForceMerge(payload) {
                if (this.mergingPending) return;
                this.mergingPending = true;
                try {
                    const resp = await api.customColors.forceMerge(payload);
                    const updated = resp?.updatedLayers ?? resp?.data?.updatedLayers ?? 0;
                    const deleted = resp?.deleted ?? resp?.data?.deleted ?? payload.removeIds.length;
                    ElementPlus.ElMessage.success(`强制合并完成：更新引用 ${updated} 个，删除 ${deleted} 条`);
                    await this.globalData.loadCustomColors();
                    await this.globalData.loadArtworks();
                    this.runDuplicateCheck();
                    if (!this.duplicateGroups.length) {
                        this.showDuplicateDialog = false;
                    }
                } catch (err) {
                    const raw = err?.response?.data?.error || '';
                    if (raw) {
                        ElementPlus.ElMessage.error('合并失败: ' + raw);
                    } else if (err?.request) {
                        ElementPlus.ElMessage.error('网络错误，合并失败');
                    } else {
                        ElementPlus.ElMessage.error('合并失败');
                    }
                } finally {
                    this.mergingPending = false;
                }
            }
        }
    };

    window.CustomColorDuplicateMixin = CustomColorDuplicateMixin;
})(window);
